/**
 * Palco anatômico em three.js — sem React.
 *
 * Cada estrutura do busto vira duas representações sobre a mesma geometria:
 *  (a) malha sólida com Fresnel, quase invisível em repouso: é o alvo do
 *      raycast e o preenchimento colorido no hover;
 *  (b) plexo: arestas únicas da malha em `LineSegments` + `Points` nos
 *      vértices, em tinta fina sobre o fundo claro.
 *
 * Renderiza sob demanda: só há quadro quando algo muda (interação, tween,
 * amortecimento, rotação automática, montagem). Pausa com `setPaused(true)`,
 * aba oculta ou palco fora da tela. Cores lidas dos tokens em tempo de
 * execução; nenhum valor de cor escrito aqui.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ESTRUTURAS } from './estruturas.js';

export const DEFAULT_MODEL_URL = new URL('../../../assets/anatomia/busto.glb', import.meta.url).href;
export const DEFAULT_META_URL = new URL('../../../assets/anatomia/busto.json', import.meta.url).href;

export const VISTAS = ['tresquartos', 'frente', 'lateral', 'topo'];
export const VISTA_NOME = { frente: 'Frente', lateral: 'Lateral', topo: 'Topo', tresquartos: '¾' };

// Ângulos esféricos (azimute a partir de +Z em direção a +X; polar a partir de +Y).
const VISTA_ANGULOS = {
  frente: { theta: 0, phi: Math.PI / 2 - 0.06 },
  lateral: { theta: Math.PI / 2, phi: Math.PI / 2 - 0.04 },
  topo: { theta: 0, phi: 0.16 },
  tresquartos: { theta: Math.PI / 5, phi: Math.PI / 2 - 0.14 },
};

const FOV = 32;
const BUST_ZOOM = 1.12;      // aproximação da câmera de repouso sobre o encaixe do busto
const TOP_GAP = 14;          // px entre o fim das pílulas de alerta e o topo do crânio
const HOVER_TAU = 0.06;      // ~220 ms até 97%, saída suave
const VIS_TAU = 0.1;
const REVEAL_MS = 900;
const VIEW_MS = 720;
const ZOOM_MS = 320;

// Opacidade do sólido em foco: a estrutura lê como sólida, com o plexo por cima
// (régua, mecanismo 2). As demais recuam para ~40% (a 30% a cabeça sumia e a
// estrutura flutuava sem contexto). Em repouso não há preenchimento
// (veja `look`): só linhas e nós.
const SOLID_HOVER = 0.9;
const DIM = 0.42;
const DEEP = new Set(['insula', 'limbico', 'hipocampo', 'amigdala', 'nucleos_base', 'talamo', 'corpo_caloso', 'ventriculos', 'tronco', 'medula']);
const ON_TOP = 30;

/* —————————————————————————————— Shaders —————————————————————————————— */

const SOLID_VS = /* glsl */ `
  attribute float aDist;
  varying vec3 vN;
  varying vec3 vV;
  varying float vDist;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vDist = aDist;
    gl_Position = projectionMatrix * mv;
  }
`;

const SOLID_FS = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uTone;
  uniform vec3 uRim;
  uniform float uHi;
  uniform float uRestA;
  uniform float uRestF;
  uniform float uFade;
  uniform float uReveal;
  varying vec3 vN;
  varying vec3 vV;
  varying float vDist;
  void main() {
    float r = clamp((uReveal - vDist) / 0.16, 0.0, 1.0);
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float ndv = clamp(dot(n, normalize(vV)), 0.0, 1.0);
    float f = pow(1.0 - ndv, 2.2);
    // Luz suave de cima e da esquerda, em espaço de vista.
    float light = clamp(dot(n, normalize(vec3(-0.35, 0.55, 0.75))), 0.0, 1.0);
    // Repouso: tom neutro de raio X, mais denso na silhueta e no lado da sombra.
    float aRest = uRestA * (0.6 + 0.8 * (1.0 - light)) + uRestF * f;
    // Foco: a cor da estrutura, sólida, com borda de Fresnel clara.
    vec3 lit = uColor * (0.8 + 0.2 * light);
    lit = mix(lit, uRim, f * 0.45);
    float aHi = ${SOLID_HOVER.toFixed(2)} * (0.62 + 0.38 * f);
    vec3 c = mix(uTone, lit, uHi);
    float a = mix(aRest, aHi, uHi) * uFade * r;
    if (a < 0.002) discard;
    gl_FragColor = vec4(c, a);
  }
`;

const PLEXO_VS = /* glsl */ `
  attribute float aDist;
  uniform float uSize;
  uniform float uDpr;
  uniform float uRefDist;
  uniform float uReveal;
  varying float vReveal;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vReveal = clamp((uReveal - aDist) / 0.12, 0.0, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uDpr * clamp(uRefDist / max(vDepth, 0.001), 0.6, 1.8);
  }
`;

const PLEXO_FS = /* glsl */ `
  uniform vec4 uRest;
  uniform vec3 uColor;
  uniform float uHiAlpha;
  uniform float uHi;
  uniform float uDim;
  uniform float uVis;
  uniform float uDepthNear;
  uniform float uDepthFar;
  uniform float uPoint;
  uniform vec3 uCore;
  varying float vReveal;
  varying float vDepth;
  void main() {
    float fade = mix(1.0, 0.35, smoothstep(uDepthNear, uDepthFar, vDepth));
    vec3 c = mix(uRest.rgb, uColor, uHi);
    float a = mix(uRest.a, uHiAlpha, uHi);
    if (uPoint > 0.5) {
      // Nó claro: miolo na cor da superfície e anel fino de tinta.
      float d = length(gl_PointCoord * 2.0 - 1.0);
      if (d > 1.0) discard;
      float core = 1.0 - smoothstep(0.38, 0.55, d);
      float outer = 1.0 - smoothstep(0.82, 1.0, d);
      c = mix(c, uCore, core);
      a = mix(a * outer, min(1.0, a * 2.2), core);
    }
    a *= mix(1.0, ${DIM.toFixed(2)}, uDim) * uVis * vReveal * fade;
    if (a < 0.002) discard;
    gl_FragColor = vec4(c, a);
  }
`;

/* ———————————————————————————— Utilidades ———————————————————————————— */

let colorCtx = null;
/** Converte qualquer cor CSS (inclusive var() já resolvida) em {r,g,b,a} 0–1. */
function parseCssColor(value) {
  const v = (value || '').trim();
  if (!v) return null;
  if (!colorCtx) colorCtx = document.createElement('canvas').getContext('2d');
  colorCtx.fillStyle = 'rgba(0, 0, 0, 0)';
  colorCtx.fillStyle = v;
  const s = colorCtx.fillStyle;
  if (s.startsWith('#')) {
    const n = parseInt(s.slice(1), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
  return { r: +r / 255, g: +g / 255, b: +b / 255, a: +a };
}

function readToken(styles, name, fallback = null) {
  return parseCssColor(styles.getPropertyValue(name)) ?? fallback;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** Lê uma caixa de enquadramento num formato tolerante: {min,max} | [6] | {centro,tamanho}. */
function readBox(raw) {
  if (!raw) return null;
  const vec = (v) => (Array.isArray(v) ? new THREE.Vector3(v[0], v[1], v[2]) : v && 'x' in v ? new THREE.Vector3(v.x, v.y, v.z) : null);
  if (Array.isArray(raw) && raw.length === 6) {
    return new THREE.Box3(new THREE.Vector3(raw[0], raw[1], raw[2]), new THREE.Vector3(raw[3], raw[4], raw[5]));
  }
  const box = raw.caixa ?? raw.box ?? raw;
  if (box.min && box.max) return new THREE.Box3(vec(box.min), vec(box.max));
  const c = vec(box.centro ?? box.center);
  const s = vec(box.tamanho ?? box.size);
  if (c && s) return new THREE.Box3().setFromCenterAndSize(c, s);
  return null;
}

function findFraming(meta, key) {
  if (!meta) return null;
  const pools = [meta.enquadramento, meta.caixas, meta.framing, meta.molduras, meta];
  for (const p of pools) {
    if (p && p[key]) {
      const b = readBox(p[key]);
      if (b && !b.isEmpty()) return b;
    }
  }
  return null;
}

function resolveId(name) {
  if (!name) return null;
  if (ESTRUTURAS[name]) return name;
  const stripped = name.replace(/([._-]\d+)+$/, '');
  return ESTRUTURAS[stripped] ? stripped : null;
}

/**
 * Aparência de cada estrutura em repouso.
 *  edge:  comprimento-alvo da aresta do plexo, em metros (a malha é decimada
 *         até ele: poucas linhas longas, como na referência). 0 = sem plexo.
 *  line/node: peso da linha e do nó sobre `--anat-line` e `--anat-node`.
 *  restA/restF: o "raio X" do sólido (base e reforço de Fresnel na silhueta).
 *  tone: 'ink' (tinta), 'bone' (`--anat-osso`) ou 'cool' (tinta levemente fria, cérebro).
 * Em repouso tudo é neutro; a cor da estrutura só aparece em foco.
 */
function look(id, camada, deep) {
  // Repouso = plexo puro (régua, mecanismo 2): nenhum tom de preenchimento nas
  // estruturas internas. Hierarquia de profundidade: pele e crânio são véu
  // (linha leve, quase sem nó), o cérebro é a camada protagonista e aparece
  // através deles. Pele e ossos guardam um traço de Fresnel na silhueta.
  if (id === 'pele') return { edge: 0.034, line: 0.6, node: 0, restA: 0, restF: 0.08, tone: 'ink' };
  if (id === 'substancia_branca') return { edge: 0, line: 0, node: 0, restA: 0, restF: 0, tone: 'cool' };
  // Crânio e rosto na mesma tinta do cérebro viravam um novelo: agora são véu.
  if (id === 'cranio') return { edge: 0.019, line: 0.7, node: 0.2, restA: 0, restF: 0.1, tone: 'bone' };
  if (id === 'mandibula') return { edge: 0.014, line: 0.6, node: 0.2, restA: 0, restF: 0.08, tone: 'bone' };
  if (id === 'coluna_cervical') return { edge: 0.014, line: 0.9, node: 0.6, restA: 0, restF: 0.1, tone: 'bone' };
  if (camada === 'cerebro') {
    // Muitas estruturas se sobrepõem dentro do crânio: plexo mais ralo, linhas
    // leves e nós esparsos, para o conjunto ler como malha e não como massa.
    return deep
      ? { edge: 0.018, line: 0.12, node: 0, restA: 0, restF: 0, tone: 'cool' }
      : { edge: 0.026, line: 0.8, node: 1.4, keep: 0.06, restA: 0, restF: 0, tone: 'cool' };
  }
  if (id === 'medula') return { edge: 0.012, line: 0.5, node: 0.55, restA: 0, restF: 0, tone: 'cool' };
  // Coração em repouso: malha fina e leve. Com aresta longa a decimação virava
  // uma caixa de arame no peito; com aresta curta ele lê como órgão.
  if (camada === 'coracao') return { edge: 0.011, line: 0.3, node: 0.35, keep: 0.25, restA: 0, restF: 0, tone: 'ink' };
  if (camada === 'vasos') return { edge: 0.022, line: 0.5, node: 0.7, keep: 0.3, restA: 0, restF: 0, tone: 'ink' };
  return { edge: 0.018, line: 0.7, node: 0.7, keep: 0.4, restA: 0, restF: 0.04, tone: 'ink' };
}

/** Área da malha em metros quadrados (no espaço do mundo). */
function surfaceArea(geo, matrix) {
  const pos = geo.attributes.position;
  const idx = geo.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0;
  for (let i = 0; i < idx.length; i += 3) {
    a.fromBufferAttribute(pos, idx[i]).applyMatrix4(matrix);
    b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(matrix);
    c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(matrix);
    area += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return area;
}

/**
 * Índice para o plexo: solda vértices repetidos nas costuras (normais/UV) e
 * decima com o meshoptimizer, para o plexo ter poucas linhas longas em vez
 * de um novelo. Os índices continuam apontando para o buffer original.
 */
function plexoIndex(geo, ratio) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const src = geo.index.array;
  const flat = new Float32Array(n * 3);
  const weld = new Uint32Array(n);
  const seen = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    flat[i * 3] = v.x; flat[i * 3 + 1] = v.y; flat[i * 3 + 2] = v.z;
    const key = `${Math.round(v.x * 1e5)},${Math.round(v.y * 1e5)},${Math.round(v.z * 1e5)}`;
    const first = seen.get(key);
    if (first === undefined) { seen.set(key, i); weld[i] = i; } else weld[i] = first;
  }
  const welded = new Uint32Array(src.length);
  for (let i = 0; i < src.length; i++) welded[i] = weld[src[i]];
  if (ratio >= 1 || !MeshoptSimplifier.supported) return welded;
  const tris = src.length / 3;
  const target = Math.max(24, Math.floor(tris * ratio)) * 3;
  try {
    let [out] = MeshoptSimplifier.simplify(welded, flat, 3, target, 0.25, []);
    if (out.length > target * 1.5) {
      [out] = MeshoptSimplifier.simplifySloppy(welded, flat, 3, null, target, 0.3);
    }
    return out.length >= 9 ? out : welded;
  } catch {
    return welded;
  }
}

/* ———————————————————————————— A cena ———————————————————————————— */

export class AnatomyScene {
  /**
   * @param {HTMLElement} host  elemento que recebe o canvas (a cena cria o próprio
   *   canvas: um canvas cujo contexto foi perdido não pode ser reaproveitado, e o
   *   StrictMode monta duas vezes)
   * @param {object} opts
   *   modelUrl, metaUrl, reducedMotion,
   *   onHover(id|null, {x,y}|null), onSelect(id|null, {x,y}|null),
   *   onAnchors({ hover, select }), onReady({ ids }), onError(error), onInteract()
   */
  constructor(host, opts = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'an-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    this.host = host;
    this.canvas = canvas;
    this.opts = opts;
    this.reducedMotion = opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

    this.structures = new Map();   // id → registro
    this.solids = [];              // malhas alvo do raycast
    this.layers = { cerebro: true, cranio: true, coluna: true, coracao: true, vasos: true };
    this.hoverId = null;
    this.keyId = null;
    this.selectedId = null;
    this.hoverPoint = null;
    this.selectPoint = null;
    this.view = 'tresquartos';
    this.reveal = this.reducedMotion ? 2 : 0;
    this.revealStart = 0;

    this._raf = 0;
    this._last = 0;
    this._paused = false;
    this._hidden = typeof document !== 'undefined' && document.hidden;
    this._onScreen = true;
    this._disposed = false;
    this._interacted = false;
    this._camTween = null;
    this._pointer = { x: 0, y: 0, inside: false, down: null, dirty: false };
    this._ndc = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
    this._tmp = new THREE.Vector3();

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
      this.renderer = null;
      queueMicrotask(() => this._fail({ type: 'webgl', error }));
      return;
    }
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.dpr = this.renderer.getPixelRatio();

    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 20);
    this.camera.position.set(0.4, 0.05, 0.6);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.8;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.78;
    this.controls.autoRotate = !this.reducedMotion;
    this.controls.autoRotateSpeed = 0.35;

    this._bind();
    this.readColors();
    this._resize();
  }

  /* ——————————————————————— Ciclo de vida ——————————————————————— */

  async load() {
    if (!this.renderer) return;
    const { modelUrl = DEFAULT_MODEL_URL, metaUrl = DEFAULT_META_URL } = this.opts;
    try {
      const metaPromise = metaUrl
        ? fetch(metaUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const [gltf, meta] = await Promise.all([loader.loadAsync(modelUrl), metaPromise, MeshoptSimplifier.ready]);
      if (this._disposed) {
        gltf.scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
        return;
      }
      this.meta = meta;
      this._build(gltf.scene, meta);
      this._frame(meta);
      this.revealStart = performance.now();
      this.opts.onReady?.({ ids: [...this.structures.keys()] });
      this.invalidate();
    } catch (error) {
      if (!this._disposed) this._fail({ type: 'load', error });
    }
  }

  _fail(err) {
    this.opts.onError?.(err);
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    this._unbind?.();
    if (!this.renderer) {
      this.canvas.remove();
      return;
    }
    this.controls.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.structures.clear();
    this.solids = [];
  }

  /* ——————————————————————— Montagem do modelo ——————————————————————— */

  _build(model, meta) {
    this.root.add(model);
    model.updateMatrixWorld(true);

    // Agrupa malhas por estrutura: o nó com nome de id e todos os descendentes.
    const groups = new Map();
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      let id = null;
      for (let o = obj; o && o !== model; o = o.parent) {
        id = resolveId(o.name);
        if (id) break;
      }
      if (!id) id = obj.name || obj.parent?.name || `parte_${groups.size}`;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(obj);
    });

    // Centro da montagem: centro da cabeça (origem do modelo).
    const head = findFraming(meta, 'cabeca');
    const center = head ? head.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    let maxDist = 0;
    const world = new THREE.Vector3();
    for (const meshes of groups.values()) {
      for (const mesh of meshes) {
        const pos = mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 7) {
          world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          maxDist = Math.max(maxDist, world.distanceTo(center));
        }
      }
    }
    maxDist = maxDist || 1;

    for (const [id, meshes] of groups) {
      const info = ESTRUTURAS[id];
      const metaInfo = meta?.estruturas?.[id] ?? meta?.[id] ?? null;
      const camada = info ? info.camada : metaInfo?.camada ?? null;
      const interativa = info ? info.interativa : false;
      const deep = DEEP.has(info?.base ?? id);
      const lk = look(id, camada, deep);

      const rec = {
        id, camada, interativa, info,
        meshes: [], plexo: [],
        hi: 0, hiT: 0, dim: 0, dimT: 0, vis: 1, visT: 1,
        box: new THREE.Box3(),
        center: new THREE.Vector3(),
        // Estruturas mediais e profundas: no foco, desenham por cima do córtex.
        deep,
        look: lk,
      };

      for (const mesh of meshes) {
        let geo = mesh.geometry;
        if (!geo.index) {
          geo = mergeVertices(geo);
          mesh.geometry.dispose();
          mesh.geometry = geo;
        }
        if (!geo.attributes.normal) geo.computeVertexNormals();
        // Atributos que o plexo não usa saem da memória da GPU.
        for (const key of Object.keys(geo.attributes)) {
          if (key !== 'position' && key !== 'normal') geo.deleteAttribute(key);
        }

        const pos = geo.attributes.position;
        const dist = new Float32Array(pos.count);
        for (let i = 0; i < pos.count; i++) {
          world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          dist[i] = world.distanceTo(center) / maxDist;
        }
        geo.setAttribute('aDist', new THREE.BufferAttribute(dist, 1));
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        rec.box.union(geo.boundingBox.clone().applyMatrix4(mesh.matrixWorld));

        // (a) Sólido
        const solidMat = new THREE.ShaderMaterial({
          vertexShader: SOLID_VS,
          fragmentShader: SOLID_FS,
          uniforms: {
            uColor: { value: new THREE.Color() },
            uTone: { value: new THREE.Color() },
            uRim: { value: new THREE.Color() },
            uHi: { value: 0 },
            uRestA: { value: lk.restA },
            uRestF: { value: lk.restF },
            uFade: { value: 1 },
            uReveal: { value: this.reveal },
          },
          transparent: true,
          depthWrite: false,
          side: THREE.FrontSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        mesh.material?.dispose?.();
        mesh.material = solidMat;
        mesh.userData.anatId = id;
        mesh.renderOrder = this._order(camada, id) * 3;
        mesh.userData.baseOrder = mesh.renderOrder;
        if (interativa) this.solids.push(mesh);
        rec.meshes.push(mesh);

        // (b) Plexo: arestas únicas da malha decimada + vértices.
        if (!lk.edge) continue;
        const tris = geo.index.count / 3;
        const target = surfaceArea(geo, mesh.matrixWorld) / (0.433 * lk.edge * lk.edge);
        const { lines, points } = this._plexoGeometry(geo, Math.min(1, target / tris), lk.node ? lk.keep ?? 1 : 0);
        const lineMat = this._plexoMaterial(false);
        const pointMat = this._plexoMaterial(true);
        const lineObj = new THREE.LineSegments(lines, lineMat);
        const pointObj = new THREE.Points(points, pointMat);
        lineObj.raycast = () => {};
        pointObj.raycast = () => {};
        lineObj.renderOrder = mesh.renderOrder + 1;
        pointObj.renderOrder = mesh.renderOrder + 2;
        lineObj.userData.baseOrder = lineObj.renderOrder;
        pointObj.userData.baseOrder = pointObj.renderOrder;
        mesh.add(lineObj, pointObj);
        rec.plexo.push(lineObj, pointObj);
      }

      const c = metaInfo?.centro;
      if (Array.isArray(c)) rec.center.set(c[0], c[1], c[2]);
      else if (c && 'x' in c) rec.center.set(c.x, c.y, c.z);
      else rec.box.getCenter(rec.center);

      this.structures.set(id, rec);
      this._applyColors(rec);
    }
    this._pushUniforms();
  }

  _order(camada, id) {
    // De dentro para fora: cérebro, ossos e órgãos, pele.
    if (id === 'substancia_branca') return 0;
    if (camada === 'cerebro') return 1;
    if (id === 'pele') return 4;
    if (camada === 'cranio') return 3;
    return 2;
  }

  _plexoGeometry(geo, ratio, keepNodes = 1) {
    const index = plexoIndex(geo, ratio);
    const pos = geo.attributes.position;
    const dist = geo.attributes.aDist;
    const n = pos.count;
    const seen = new Set();
    const used = new Set();
    const edges = [];
    const add = (a, b) => {
      if (a === b) return;
      const lo = a < b ? a : b;
      const hi = a < b ? b : a;
      const key = lo * n + hi;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(lo, hi);
    };
    for (let i = 0; i < index.length; i += 3) {
      const a = index[i], b = index[i + 1], c = index[i + 2];
      add(a, b); add(b, c); add(c, a);
      used.add(a); used.add(b); used.add(c);
    }
    const Idx = n > 65535 ? THREE.Uint32BufferAttribute : THREE.Uint16BufferAttribute;
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', pos);
    lines.setAttribute('aDist', dist);
    lines.setIndex(new Idx(edges, 1));

    const pts = new THREE.BufferGeometry();
    pts.setAttribute('position', pos);
    pts.setAttribute('aDist', dist);
    // Só uma parte dos vértices vira nó: o cérebro tem muitas superfícies sobrepostas.
    const nodes = [...used].filter((i) => keepNodes >= 1 || ((i * 2654435761) >>> 0) / 4294967296 < keepNodes);
    pts.setIndex(new Idx(nodes, 1));
    lines.boundingSphere = geo.boundingSphere;
    pts.boundingSphere = geo.boundingSphere;
    return { lines, points: pts };
  }

  _plexoMaterial(isPoint) {
    return new THREE.ShaderMaterial({
      vertexShader: PLEXO_VS,
      fragmentShader: PLEXO_FS,
      uniforms: {
        uRest: { value: new THREE.Vector4() },
        uColor: { value: new THREE.Color() },
        uHiAlpha: { value: isPoint ? 0.95 : 0.72 },
        uHi: { value: 0 },
        uDim: { value: 0 },
        uVis: { value: 1 },
        uReveal: { value: this.reveal },
        uSize: { value: 3.4 },
        uCore: { value: new THREE.Color() },
        uDpr: { value: this.dpr },
        uRefDist: { value: 0.6 },
        uDepthNear: { value: 0.3 },
        uDepthFar: { value: 0.8 },
        uPoint: { value: isPoint ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });
  }

  /** Relê os tokens de cor. Chame de novo se o tema mudar. */
  readColors() {
    const s = getComputedStyle(document.documentElement);
    const ink = readToken(s, '--ink-900', { r: 0, g: 0, b: 0, a: 1 });
    const brain = readToken(s, '--anat-brain-rest', { ...ink, a: 0.26 });
    // Cérebro em repouso: tinta puxada um degrau para o azul de `--anat-brain-rest`,
    // para ser o ponto focal do busto sem virar área sólida.
    const cool = { r: ink.r * 0.3 + brain.r * 0.7, g: ink.g * 0.3 + brain.g * 0.7, b: ink.b * 0.3 + brain.b * 0.7, a: 1 };
    this.colors = {
      line: readToken(s, '--anat-line', { ...ink, a: 0.16 }),
      node: readToken(s, '--anat-node', { ...ink, a: 0.34 }),
      bone: readToken(s, '--anat-osso', ink),
      rim: readToken(s, '--surface-raised', { r: 1, g: 1, b: 1, a: 1 }),
      ink,
      cool,
      byToken: {},
    };
    const tokens = new Set(Object.values(ESTRUTURAS).map((e) => e.cor).filter(Boolean));
    for (const t of tokens) this.colors.byToken[t] = readToken(s, t, ink);
    for (const rec of this.structures.values()) this._applyColors(rec);
    this.invalidate();
  }

  _applyColors(rec) {
    if (!this.colors) return;
    const { line, node, bone, rim, ink, cool, byToken } = this.colors;
    const lk = rec.look;
    const base = rec.info?.cor ? byToken[rec.info.cor] : null;
    const tone = lk.tone === 'bone' ? bone : lk.tone === 'cool' ? cool : ink;
    const col = base ?? ink;
    // Plexo aceso: a cor da estrutura com um passo de tinta, para a linha ler sobre o próprio sólido.
    const lit = {
      r: col.r * 0.72 + ink.r * 0.28,
      g: col.g * 0.72 + ink.g * 0.28,
      b: col.b * 0.72 + ink.b * 0.28,
    };
    // Linha WebGL tem 1 px físico: em tela comum (DPR 1) ela pesa o dobro da retina.
    const lineScale = this.dpr >= 1.75 ? 1 : 0.8;
    for (const m of rec.meshes) {
      m.material.uniforms.uColor.value.setRGB(col.r, col.g, col.b);
      m.material.uniforms.uTone.value.setRGB(tone.r, tone.g, tone.b);
      m.material.uniforms.uRim.value.setRGB(rim.r, rim.g, rim.b);
    }
    rec.plexo.forEach((o, i) => {
      const u = o.material.uniforms;
      const isPoint = i % 2 === 1;
      const rgb = lk.tone === 'cool' ? cool : lk.tone === 'bone' ? bone : ink;
      // Sem o crânio à frente, o cérebro ganha um degrau de contraste: a troca de camada se lê no modelo.
      const boost = rec.camada === 'cerebro' && this.layers.cranio === false ? 1.4 : 1;
      const alpha = (isPoint ? node.a * lk.node : line.a * lk.line * lineScale) * boost;
      u.uRest.value.set(rgb.r, rgb.g, rgb.b, Math.min(1, alpha));
      u.uHiAlpha.value = isPoint ? 0.9 : 0.7 * lineScale;
      u.uColor.value.setRGB(lit.r, lit.g, lit.b);
      u.uCore.value.setRGB(rim.r, rim.g, rim.b);
    });
  }

  /* ——————————————————————— Enquadramento ——————————————————————— */

  _frame(meta) {
    const all = new THREE.Box3();
    for (const rec of this.structures.values()) all.union(rec.box);
    let head = findFraming(meta, 'cabeca');
    let bust = findFraming(meta, 'busto');
    if (!head) {
      head = this.structures.get('cranio')?.box.clone();
      if (!head || head.isEmpty()) {
        head = new THREE.Box3();
        for (const rec of this.structures.values()) if (rec.camada === 'cerebro') head.union(rec.box);
      }
      if (head.isEmpty()) head = all.clone();
    }
    if (!bust) bust = all.clone();
    // O busto enquadrado vai do topo da cabeça até o meio do coração; o resto
    // do tronco continua para dentro da máscara de fade da base.
    const heart = this.structures.get('coracao')?.box;
    const framed = bust.clone();
    if (heart && !heart.isEmpty()) framed.min.y = Math.max(bust.min.y, (heart.min.y + heart.max.y) / 2);

    this.headBox = head;
    this.framedBox = framed;
    this.headRadius = head.getBoundingSphere(new THREE.Sphere()).radius;
    this.headCenter = head.getCenter(new THREE.Vector3());
    this.bustCenter = framed.getCenter(new THREE.Vector3());
    this.bustRadius = framed.getBoundingSphere(new THREE.Sphere()).radius;

    this._updateLimits();
    this._anchorTop(Math.max(1, this.canvas.clientWidth), Math.max(1, this.canvas.clientHeight));
    this.controls.target.copy(this.bustCenter);
    this._placeCamera(VISTA_ANGULOS[this.view], this.bustDist);

    // Uniformes que dependem do tamanho do modelo.
    const ref = this.bustDist;
    for (const rec of this.structures.values()) {
      for (const o of rec.plexo) {
        o.material.uniforms.uRefDist.value = ref;
        o.material.uniforms.uDepthNear.value = ref - this.bustRadius * 0.3;
        o.material.uniforms.uDepthFar.value = ref + this.bustRadius * 0.8;
      }
    }
  }

  /** Distância para a caixa caber em `fill` da altura útil (acima da faixa da base) e da largura. */
  _fitBox(box, fill) {
    const size = box.getSize(new THREE.Vector3());
    const h = Math.max(1, this.canvas.clientHeight);
    // A faixa de alertas só desloca o modelo para baixo (meia altura dela); não o
    // encolhe, para o busto seguir ocupando a altura do palco.
    const usable = Math.max(0.4, (h - this._inset() - this._topInset() * 0.35) / h);
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const tanV = Math.tan(vfov / 2);
    const tanH = tanV * this.camera.aspect;
    const byH = size.y / 2 / (tanV * fill * usable);
    const byW = Math.max(size.x, size.z) / 2 / (tanH * 0.94);
    return Math.max(byH, byW) + size.z / 2;
  }

  _inset() {
    const h = Math.max(1, this.canvas.clientHeight);
    return Math.min(h * 0.3, this.bottomInset ?? this.opts.bottomInset ?? 80);
  }

  /** Faixa reservada no topo (pílulas de alerta): a cabeça começa abaixo dela. */
  _topInset() {
    const h = Math.max(1, this.canvas.clientHeight);
    return Math.min(h * 0.2, this.topInset ?? this.opts.topInset ?? 0);
  }

  /**
   * Enquadramento de repouso com presença (passada final): o topo do crânio
   * fica logo abaixo das pílulas de alerta e os ombros descem por trás da
   * faixa de consultas. Calcula, na pose de repouso, onde o topo da cabeça
   * cai na tela e desloca a janela de vista para ele ficar a TOP_GAP px do
   * fim da faixa de alertas. Só translada a projeção: não muda a distância.
   */
  _anchorTop(w, h) {
    if (!this.headBox || !this.bustCenter) return;
    const rest = VISTA_ANGULOS[this.view] ?? VISTA_ANGULOS.tresquartos;
    const cam = this._tmpCam ?? (this._tmpCam = new THREE.PerspectiveCamera(FOV, 1, 0.01, 20));
    cam.fov = this.camera.fov;
    cam.aspect = w / h;
    cam.position.setFromSpherical(new THREE.Spherical(this.bustDist, rest.phi, rest.theta)).add(this.bustCenter);
    cam.lookAt(this.bustCenter);
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const top = this._tmp.set(this.headCenter.x, this.headBox.max.y, this.headCenter.z).project(cam);
    const py = (1 - top.y) / 2 * h; // y do topo sem deslocamento
    const desired = this._topInset() + TOP_GAP;
    this.camera.setViewOffset(w, h, 0, py - desired, w, h);
    this.camera.updateProjectionMatrix();
  }

  _updateLimits() {
    if (!this.headBox) return;
    this.headDist = this._fitBox(this.headBox, 0.8);
    // Câmera ~12% mais perto que o encaixe do busto: o modelo comanda o palco.
    this.bustDist = Math.max(this.headDist * 1.08, this._fitBox(this.framedBox, 0.88) / BUST_ZOOM);
    this.controls.minDistance = this.headDist * 0.55;
    this.controls.maxDistance = this.bustDist * 1.25 * BUST_ZOOM;
  }

  /** Altura (px) da faixa da base do palco; o centro óptico sobe metade dela. */
  setBottomInset(px) {
    if (Math.abs((this.bottomInset ?? -1) - px) < 1) return;
    this.bottomInset = px;
    this._resize();
  }

  /** Altura (px) da faixa das pílulas de alerta no topo do palco; o centro óptico desce metade dela. */
  setTopInset(px) {
    if (Math.abs((this.topInset ?? -1) - px) < 1) return;
    this.topInset = px;
    this._resize();
  }

  _placeCamera({ theta, phi }, distance) {
    const s = new THREE.Spherical(distance, phi, theta);
    this.camera.position.setFromSpherical(s).add(this.controls.target);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  /** Ao afastar, o alvo desce da cabeça para o centro do busto. */
  _followFraming() {
    if (!this.headCenter) return;
    const d = this.camera.position.distanceTo(this.controls.target);
    const t = clamp01((d - this.headDist) / Math.max(1e-6, this.bustDist - this.headDist));
    const k = t * t * (3 - 2 * t);
    const desired = this._tmp.copy(this.headCenter).lerp(this.bustCenter, k);
    const delta = desired.sub(this.controls.target);
    if (delta.lengthSq() < 1e-12) return;
    this.controls.target.add(delta);
    this.camera.position.add(delta);
  }

  /* ——————————————————————— API pública ——————————————————————— */

  setLayerVisible(camada, on) {
    if (!(camada in this.layers)) return;
    this.layers[camada] = !!on;
    for (const rec of this.structures.values()) {
      if (rec.camada === camada) rec.visT = on ? 1 : 0;
    }
    if (!on) {
      if (this.structures.get(this.hoverId)?.camada === camada) this._setHover(null, null);
      if (this.structures.get(this.keyId)?.camada === camada) this.highlight(null);
      if (this.structures.get(this.selectedId)?.camada === camada) this.select(null);
    }
    if (camada === 'cranio') {
      for (const rec of this.structures.values()) if (rec.camada === 'cerebro') this._applyColors(rec);
    }
    this._retarget();
    this.invalidate();
  }

  setLayers(map) {
    for (const [k, v] of Object.entries(map || {})) if (this.layers[k] !== !!v) this.setLayerVisible(k, v);
  }

  isVisible(id) {
    const rec = this.structures.get(id);
    return !!rec && (rec.camada == null || this.layers[rec.camada] !== false);
  }

  has(id) {
    return this.structures.has(id);
  }

  /** Vistas: 'frente' | 'lateral' | 'topo' | 'tresquartos'. */
  setView(name) {
    const target = VISTA_ANGULOS[name];
    if (!target || !this.headCenter) return;
    this.view = name;
    this._stopAutoRotate();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const from = new THREE.Spherical().setFromVector3(offset);
    // Caminho mais curto no azimute.
    let dTheta = target.theta - from.theta;
    dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
    this._tweenCamera({
      theta: [from.theta, from.theta + dTheta],
      phi: [from.phi, target.phi],
      radius: [from.radius, from.radius],
      ms: VIEW_MS,
      ease: easeInOut,
    });
  }

  nextView() {
    const i = VISTAS.indexOf(this.view);
    const next = VISTAS[(i + 1) % VISTAS.length];
    this.setView(next);
    return next;
  }

  /** dir > 0 aproxima, dir < 0 afasta. */
  zoom(dir) {
    if (!this.headCenter) return;
    this._stopAutoRotate();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const from = new THREE.Spherical().setFromVector3(offset);
    const r = THREE.MathUtils.clamp(from.radius * (dir > 0 ? 0.8 : 1.25), this.controls.minDistance, this.controls.maxDistance);
    this._tweenCamera({ theta: [from.theta, from.theta], phi: [from.phi, from.phi], radius: [from.radius, r], ms: ZOOM_MS, ease: easeOut });
  }

  _tweenCamera(t) {
    if (this.reducedMotion) {
      this._applyCam(t, 1);
      this._camTween = null;
    } else {
      this._camTween = { ...t, start: performance.now() };
    }
    this.invalidate();
  }

  _applyCam(t, k) {
    const lerp = (a) => a[0] + (a[1] - a[0]) * k;
    const s = new THREE.Spherical(lerp(t.radius), lerp(t.phi), lerp(t.theta));
    s.makeSafe();
    this.camera.position.setFromSpherical(s).add(this.controls.target);
    this.camera.lookAt(this.controls.target);
  }

  /** Acende uma estrutura pelo teclado (lista acessível). O pino vai para o centro dela. */
  highlight(id) {
    const rec = id ? this.structures.get(id) : null;
    this.keyId = rec && rec.interativa && this.isVisible(id) ? id : null;
    if (this.keyId) this._stopAutoRotate();
    this._retarget();
    this.invalidate();
    const p = this.keyId ? this._project(rec.center) : null;
    this.opts.onHover?.(this.keyId ?? this.hoverId, p);
  }

  /** Fixa a seleção. Sem ponto, usa o centro da estrutura. */
  select(id, worldPoint = null) {
    const rec = id ? this.structures.get(id) : null;
    const next = rec && rec.interativa && this.isVisible(id) ? id : null;
    this.selectedId = next;
    this.selectPoint = next ? (worldPoint ? worldPoint.clone() : rec.center.clone()) : null;
    this._retarget();
    this.invalidate();
    this.opts.onSelect?.(next, next ? this._project(this.selectPoint) : null);
  }

  setPaused(paused) {
    this._paused = !!paused;
    if (this._paused) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    } else {
      this.invalidate();
    }
  }

  /* ——————————————————————— Estado e tweens ——————————————————————— */

  _activeIds() {
    return new Set([this.hoverId, this.keyId, this.selectedId].filter(Boolean));
  }

  _retarget() {
    const active = this._activeIds();
    for (const rec of this.structures.values()) {
      rec.hiT = active.has(rec.id) ? 1 : 0;
      rec.dimT = active.size && !active.has(rec.id) ? 1 : 0;
    }
  }

  _stepTweens(dt) {
    let busy = false;
    const kHover = this.reducedMotion ? 1 : 1 - Math.exp(-dt / HOVER_TAU);
    const kVis = this.reducedMotion ? 1 : 1 - Math.exp(-dt / VIS_TAU);
    for (const rec of this.structures.values()) {
      for (const [v, t, k] of [['hi', 'hiT', kHover], ['dim', 'dimT', kHover], ['vis', 'visT', kVis]]) {
        const d = rec[t] - rec[v];
        if (Math.abs(d) > 0.002) {
          rec[v] += d * k;
          busy = true;
        } else {
          rec[v] = rec[t];
        }
      }
    }
    if (this.reveal < 1.25 && this.revealStart) {
      this.reveal = this.reducedMotion ? 2 : 1.25 * easeOut(clamp01((performance.now() - this.revealStart) / REVEAL_MS));
      busy = busy || this.reveal < 1.25;
    }
    return busy;
  }

  _pushUniforms() {
    for (const rec of this.structures.values()) {
      const vis = rec.vis;
      const show = vis > 0.003;
      for (const m of rec.meshes) {
        const u = m.material.uniforms;
        u.uHi.value = rec.hi;
        u.uFade.value = vis * (1 - 0.7 * rec.dim);
        u.uReveal.value = this.reveal;
        // O sólido aceso escreve profundidade: o que está atrás dele some, como na referência.
        m.material.depthWrite = rec.hi > 0.5 && vis > 0.5 && !rec.deep;
        m.visible = show;
        const onTop = rec.deep && rec.hi > 0.02;
        m.material.depthTest = !onTop;
        m.renderOrder = m.userData.baseOrder + (onTop ? ON_TOP : 0);
      }
      for (const o of rec.plexo) {
        const u = o.material.uniforms;
        const onTop = rec.deep && rec.hi > 0.02;
        o.material.depthTest = !onTop;
        o.renderOrder = o.userData.baseOrder + (onTop ? ON_TOP : 0);
        u.uHi.value = rec.hi;
        u.uDim.value = rec.dim;
        u.uVis.value = vis;
        u.uReveal.value = this.reveal;
      }
    }
  }

  _stopAutoRotate() {
    if (this._interacted) return;
    this._interacted = true;
    this.controls.autoRotate = false;
    this.opts.onInteract?.();
  }

  /* ——————————————————————— Laço sob demanda ——————————————————————— */

  invalidate() {
    if (!this.renderer || this._disposed || this._raf) return;
    // Pausado ainda pinta quadros parados (o modelo pode terminar de carregar
    // com o painel aberto); só o laço contínuo fica suspenso, no fim do _tick.
    if (this._hidden || !this._onScreen) return;
    this._raf = requestAnimationFrame(this._tick);
  }

  _tick = (now) => {
    this._raf = 0;
    if (this._disposed) return;
    const dt = Math.min(0.05, this._last ? (now - this._last) / 1000 : 1 / 60);
    this._last = now;
    let busy = this._stepTweens(dt);

    if (this._camTween) {
      const t = this._camTween;
      const k = clamp01((now - t.start) / t.ms);
      this._applyCam(t, t.ease(k));
      if (k >= 1) this._camTween = null;
      busy = true;
    }
    if (this.controls.update(dt)) busy = true;
    if (this.controls.autoRotate && this.structures.size) busy = true;
    this._followFraming();

    if (this._pointer.dirty) {
      this._pointer.dirty = false;
      this._pick();
    }

    this._pushUniforms();
    this.renderer.render(this.scene, this.camera);
    this._emitAnchors();

    if (busy && !this._paused) this.invalidate();
    else this._last = 0;
  };

  _project(world) {
    if (!world) return null;
    const v = this._tmp.copy(world).project(this.camera);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return { x: (v.x + 1) * 0.5 * w, y: (1 - v.y) * 0.5 * h, behind: v.z > 1 };
  }

  _emitAnchors() {
    if (!this.opts.onAnchors) return;
    const hoverWorld = this.keyId ? this.structures.get(this.keyId)?.center : this.hoverPoint;
    this.opts.onAnchors({
      hover: (this.keyId || this.hoverId) ? this._project(hoverWorld) : null,
      select: this.selectedId
        ? { ...this._project(this.selectPoint), rect: this._projectBox(this.structures.get(this.selectedId)?.box), head: this._projectBox(this.headBox) }
        : null,
    });
  }

  /** Retângulo de tela da caixa da estrutura, para o popover não cobri-la. */
  _projectBox(box) {
    if (!box || box.isEmpty()) return null;
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    for (let i = 0; i < 8; i++) {
      this._tmp.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      const p = this._project(this._tmp);
      l = Math.min(l, p.x); r = Math.max(r, p.x); t = Math.min(t, p.y); b = Math.max(b, p.y);
    }
    return { left: l, right: r, top: t, bottom: b };
  }

  /* ——————————————————————— Ponteiro e raycast ——————————————————————— */

  _bind() {
    const c = this.canvas;
    const onMove = (e) => {
      const r = c.getBoundingClientRect();
      this._pointer.x = e.clientX - r.left;
      this._pointer.y = e.clientY - r.top;
      this._pointer.inside = true;
      const d = this._pointer.down;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) d.moved = true;
      if (e.pointerType === 'mouse' && !(d && d.moved)) {
        this._pointer.dirty = true;
        this.invalidate();
      }
    };
    const onDown = (e) => {
      this._pointer.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    };
    const onUp = (e) => {
      const d = this._pointer.down;
      this._pointer.down = null;
      if (!d || d.moved || performance.now() - d.t > 600 || e.button > 0) return;
      const r = c.getBoundingClientRect();
      const hit = this._raycastAt(e.clientX - r.left, e.clientY - r.top);
      this.select(hit?.id ?? null, hit?.point ?? null);
    };
    const onLeave = () => {
      this._pointer.inside = false;
      this._pointer.down = null;
      this._setHover(null, null);
    };
    const onWheel = () => this._stopAutoRotate();
    const onStart = () => this._stopAutoRotate();
    const onChange = () => this.invalidate();
    const onVisibility = () => {
      this._hidden = document.hidden;
      if (!this._hidden) this.invalidate();
    };
    // No celular o palco ocupa meia tela: um arrasto vertical tem que rolar a
    // página (o navegador fica com ele e cancela o ponteiro), e o horizontal
    // gira o busto. O OrbitControls grava touch-action: none no próprio canvas.
    const narrow = window.matchMedia('(max-width: 1023px)');
    const onNarrow = () => { c.style.touchAction = narrow.matches ? 'pan-y' : 'none'; };
    onNarrow();
    narrow.addEventListener('change', onNarrow);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointerleave', onLeave);
    c.addEventListener('wheel', onWheel, { passive: true });
    this.controls.addEventListener('start', onStart);
    this.controls.addEventListener('change', onChange);
    document.addEventListener('visibilitychange', onVisibility);

    const host = this.host;
    const ro = new ResizeObserver(() => this._resize());
    ro.observe(host);
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        this._onScreen = entries.some((en) => en.isIntersecting);
        if (this._onScreen) this.invalidate();
        else { cancelAnimationFrame(this._raf); this._raf = 0; }
      });
      io.observe(host);
    }

    this._unbind = () => {
      narrow.removeEventListener('change', onNarrow);
      c.removeEventListener('pointermove', onMove);
      c.removeEventListener('pointerdown', onDown);
      c.removeEventListener('pointerup', onUp);
      c.removeEventListener('pointerleave', onLeave);
      c.removeEventListener('wheel', onWheel);
      this.controls.removeEventListener('start', onStart);
      this.controls.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      io?.disconnect();
    };
  }

  _resize() {
    if (!this.renderer) return;
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // A faixa da base ocupa o pé do palco: o centro óptico sobe metade dela.
    // A faixa de alertas no topo empurra para baixo; as duas se compensam.
    this.camera.setViewOffset(w, h, 0, (this._inset() - this._topInset()) / 2, w, h);
    this.camera.updateProjectionMatrix();
    if (this.headBox) {
      const prev = this.bustDist;
      this._updateLimits();
      this._anchorTop(w, h);
      // Mantém o mesmo enquadramento relativo quando o palco muda de tamanho.
      if (prev && Math.abs(prev - this.bustDist) > 1e-6) {
        const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(this.bustDist / prev);
        this.camera.position.copy(this.controls.target).add(offset);
      }
    }
    this.invalidate();
  }

  _raycastAt(x, y) {
    if (!this.solids.length) return null;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this._ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const targets = this.solids.filter((m) => this.isVisible(m.userData.anatId));
    const hits = this._raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    // O cérebro é o foco: um toque na cabeça acende o lobo, não o crânio por cima.
    const brain = hits.find((hh) => this.structures.get(hh.object.userData.anatId)?.camada === 'cerebro');
    const hit = brain ?? hits[0];
    return { id: hit.object.userData.anatId, point: hit.point.clone() };
  }

  _pick() {
    if (!this._pointer.inside) return;
    const hit = this._raycastAt(this._pointer.x, this._pointer.y);
    this._setHover(hit?.id ?? null, hit?.point ?? null);
  }

  _setHover(id, point) {
    const changed = id !== this.hoverId;
    this.hoverId = id;
    this.hoverPoint = point;
    this.canvas.style.cursor = id ? 'pointer' : '';
    // Apontar uma estrutura é interação: a rotação automática para, senão o
    // pino e a estrutura acesa escorregam sob o cursor.
    if (id) this._stopAutoRotate();
    if (changed) {
      this._retarget();
      this.opts.onHover?.(id ?? this.keyId, id ? this._project(point) : null);
    }
    this.invalidate();
  }
}

export default AnatomyScene;
