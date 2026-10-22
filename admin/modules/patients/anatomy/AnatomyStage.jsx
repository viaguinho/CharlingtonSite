import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon.jsx';
import { CAMADAS, ESTRUTURAS, INTERATIVAS, examesRelacionados } from './estruturas.js';

/**
 * Palco anatômico do prontuário (lazy).
 *
 * three.js só é baixado quando o palco monta (import dinâmico de scene.js).
 * Pino e popover são DOM sobre o canvas, posicionados a cada quadro pela
 * projeção do ponto 3D, sem re-render do React.
 *
 * Não há caixa: o canvas se dissolve nas bordas por máscara, e a matriz de
 * pontos é desenhada pela grade da página (`.pr-grid::before`), não aqui.
 */

const VISTA_ORDEM = ['tresquartos', 'frente', 'lateral', 'topo'];
const VISTA_NOME = { frente: 'Frente', lateral: 'Lateral', topo: 'Topo', tresquartos: '3D' };
const VISTA_LONGA = { frente: 'frente', lateral: 'lateral', topo: 'topo', tresquartos: 'três quartos' };

const CREDITO = 'Modelos 3D: Human Reference Atlas (HuBMAP/Allen Institute) e BodyParts3D © DBCLS — CC BY 4.0, modificados.';
// Versão curta, sempre visível no pé do palco (a licença pede atribuição à vista).
const CREDITO_CURTO = 'Modelo 3D: BodyParts3D © DBCLS e Human Reference Atlas · CC BY 4.0';
// Palco de celular: cabe numa linha, com os mesmos autores e a licença.
const CREDITO_MINIMO = 'BodyParts3D © DBCLS · HRA · CC BY 4.0';
const DESCRICAO = 'Modelo 3D do busto, da cabeça até o tórax: pele em contorno, crânio e mandíbula, cérebro dividido em lobos e estruturas profundas, coluna cervical, medula espinhal, artérias do pescoço e coração. É um modelo de referência, não uma imagem do paciente. Arraste para girar; a lista de estruturas percorre o modelo pelo teclado.';

/* ——————————————— Seletor radial: posições sobre o arco ——————————————— */
const ARC = { w: 132, h: 316, cx: 196, cy: 158, r: 112, rBtn: 156, step: 21 };
function arcPoint(i, n, radius) {
  const deg = 180 - (i - (n - 1) / 2) * ARC.step;
  const a = (deg * Math.PI) / 180;
  return { x: ARC.cx + radius * Math.cos(a), y: ARC.cy + radius * Math.sin(a) };
}
// Pé do último botão na caixa do arco (centro + meio botão de 44 px).
const ARC_BTN_BOTTOM = Math.max(...CAMADAS.map((_, i) => arcPoint(i, CAMADAS.length, ARC.rBtn).y)) + 22;
function arcPath() {
  const n = CAMADAS.length;
  const a0 = arcPoint(-0.9, n, ARC.r);
  const a1 = arcPoint(n - 1 + 0.9, n, ARC.r);
  return `M ${a0.x} ${a0.y} A ${ARC.r} ${ARC.r} 0 0 0 ${a1.x} ${a1.y}`;
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/* ——————————————— Geometria do posicionamento do popover ——————————————— */
function relRect(el, origin) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top };
}
function overlap(a, b) {
  if (!a || !b) return 0;
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return w > 0 && h > 0 ? w * h : 0;
}
function inflate(r, d) {
  return r ? { l: r.l - d, t: r.t - d, r: r.r + d, b: r.b + d } : null;
}

/* ——————————————— Linhas de "Relacionado ao paciente" ——————————————— */
function RelatedRows({ estrutura, attachments, onOpenAttachments }) {
  const relacionados = examesRelacionados(estrutura, attachments);
  if (!relacionados.length) return null;
  return (
    <div className="an-pop__rel">
      <p className="an-pop__label">Relacionado ao paciente</p>
      {relacionados.map((r) => (
        <button
          key={r.origem}
          type="button"
          className="an-pop__row"
          aria-label={`Abrir ${r.rotulo}`}
          onClick={() => onOpenAttachments?.(r.origem)}
        >
          <span>{r.linha}</span>
          <span className="an-pop__val">
            {r.total}
            <Icon name="arrow-up-right" size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ——————————————— Popover compacto ——————————————— */
function StructurePopover({ estrutura, attachments, onOpenAttachments, titleId, onClose }) {
  const [more, setMore] = useState(false);
  const moreId = `${titleId}-mais`;
  useEffect(() => setMore(false), [estrutura.id]);
  return (
    <>
      <div className="an-pop__head">
        <h3 className="an-pop__title" id={titleId}>
          {estrutura.nomeBase}
          {estrutura.ladoCurto ? <span className="an-sr">, lado {estrutura.lado}</span> : null}
        </h3>
        {estrutura.ladoCurto ? <span className="an-pop__chip" aria-hidden="true">{estrutura.ladoCurto}</span> : null}
        <button type="button" className="an-pop__close" aria-label="Fechar" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <p className="an-pop__lead">{estrutura.resumo}</p>
      {more ? <p className="an-pop__more-text" id={moreId}>{estrutura.funcao}</p> : null}
      <button
        type="button"
        className="an-pop__more"
        aria-expanded={more}
        aria-controls={more ? moreId : undefined}
        onClick={() => setMore((v) => !v)}
      >
        {more ? 'Menos' : 'Saiba mais'}
        <Icon name={more ? 'chevron-up' : 'chevron-down'} size={14} />
      </button>
      <RelatedRows estrutura={estrutura} attachments={attachments} onOpenAttachments={onOpenAttachments} />
    </>
  );
}

/* ——————————————— Fallback sem WebGL / erro de carga ——————————————— */
function FallbackList({ attachments, onOpenAttachments }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="an-fallback">
      <p className="an-fallback__msg" role="status">Não foi possível abrir o modelo 3D neste navegador.</p>
      <ul className="an-fallback__list">
        {INTERATIVAS.filter((e) => !e.opcional).map((e) => {
          const expanded = open === e.id;
          return (
            <li key={e.id} className="an-fallback__item">
              <button
                type="button"
                className="an-fallback__btn"
                aria-expanded={expanded}
                aria-controls={`an-fb-${e.id}`}
                onClick={() => setOpen(expanded ? null : e.id)}
              >
                <span>{e.nome}</span>
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
              </button>
              {expanded ? (
                <div className="an-fallback__body" id={`an-fb-${e.id}`}>
                  <p className="an-pop__lead">{e.funcao}</p>
                  <RelatedRows estrutura={e} attachments={attachments} onOpenAttachments={onOpenAttachments} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ———————————————————————————— O palco ———————————————————————————— */
export default function AnatomyStage({
  attachments = [],
  alerts = null,
  rail = null,
  paused = false,
  onOpenAttachments,
  modelUrl,
  metaUrl,
}) {
  const uid = useId().replace(/:/g, '');
  const stageRef = useRef(null);
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const pinRef = useRef(null);
  const fixedPinRef = useRef(null);
  const popRef = useRef(null);
  const leadRef = useRef(null);
  const listRef = useRef(null);
  const listWrapRef = useRef(null);
  const alertsRef = useRef(null);
  const layersRef = useRef(null);
  const baseRef = useRef(null);
  const returnFocusRef = useRef(null);
  const anchorsRef = useRef({ hover: null, select: null });

  const [status, setStatus] = useState(() => (typeof window !== 'undefined' && !hasWebGL() ? 'error' : 'loading'));
  const [present, setPresent] = useState(null); // ids presentes no modelo
  const [hoverId, setHoverId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [layers, setLayers] = useState(() => Object.fromEntries(CAMADAS.map((c) => [c.id, true])));
  const [lastLayer, setLastLayer] = useState(CAMADAS[0].id);
  const [view, setView] = useState('tresquartos');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listFocused, setListFocused] = useState(false);
  const [listNotice, setListNotice] = useState('');

  /* ——— Posicionamento sem re-render ——— */
  const place = useCallback(() => {
    const { hover, select } = anchorsRef.current;
    const stage = stageRef.current;
    if (!stage) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const pin = pinRef.current;
    if (pin) {
      const ok = hover && !hover.behind;
      pin.style.opacity = ok ? '1' : '0';
      if (ok) pin.style.transform = `translate3d(${Math.round(hover.x)}px, ${Math.round(hover.y)}px, 0)`;
    }
    const fixed = fixedPinRef.current;
    if (fixed) {
      const ok = select && !select.behind;
      fixed.style.opacity = ok ? '1' : '0';
      if (ok) fixed.style.transform = `translate3d(${Math.round(select.x)}px, ${Math.round(select.y)}px, 0)`;
    }
    const pop = popRef.current;
    if (!pop || !select) return;

    // Ao lado da estrutura, do lado com mais espaço livre, sem cobrir alertas,
    // camadas, lista, a faixa da base nem a cabeça (o busto é o herói). Um
    // traço-guia liga o popover ao pino.
    const origin = stage.getBoundingClientRect();
    const base = relRect(baseRef.current, origin);
    const forbidden = [
      inflate(relRect(alertsRef.current, origin), 10),
      inflate(relRect(layersRef.current?.querySelector('.an-layers__btns'), origin), 10),
      inflate(relRect(listWrapRef.current, origin), 10),
    ].filter(Boolean);
    const head = select.head ? inflate({ l: select.head.left, t: select.head.top, r: select.head.right, b: select.head.bottom }, 8) : null;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const gap = 28;
    const topMin = Math.max(16, (relRect(alertsRef.current, origin)?.b ?? 0) + 12);
    const maxY = (base ? base.t - 12 : H - 16) - ph;
    const sr = select.rect ? { l: select.rect.left, t: select.rect.top, r: select.rect.right, b: select.rect.bottom } : null;
    const xs = [
      head ? head.r + gap : null,
      head ? head.l - gap - pw : null,
      W - pw - 16,
      16,
      sr ? sr.r + gap : null,
      sr ? sr.l - gap - pw : null,
      select.x + gap,
      select.x - gap - pw,
    ].filter((v) => v != null);
    const ys = [select.y - ph * 0.4, select.y - ph - gap, select.y + gap, topMin, maxY];
    let best = null;
    for (const x0 of xs) {
      for (const y0 of ys) {
        const x = Math.max(16, Math.min(W - pw - 16, x0));
        const y = Math.max(topMin, Math.min(maxY, y0));
        const box = { l: x, t: y, r: x + pw, b: y + ph };
        const blocked = forbidden.reduce((acc, f) => acc + overlap(box, f), 0);
        const onHead = overlap(box, head);
        const covers = sr ? overlap(box, sr) : 0;
        const pinHit = select.x > box.l - 12 && select.x < box.r + 12 && select.y > box.t - 12 && select.y < box.b + 12 ? 1 : 0;
        const score = blocked * 1000 + pinHit * 500000 + onHead * 40 + covers * 4 + Math.hypot(x + pw / 2 - select.x, y + ph / 2 - select.y) * 0.5;
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    pop.style.transform = `translate3d(${Math.round(best.x)}px, ${Math.round(best.y)}px, 0)`;

    // Traço-guia: do pino até o ponto mais próximo da borda do popover.
    const lead = leadRef.current;
    if (lead) {
      const ok = !select.behind;
      const ex = Math.max(best.x, Math.min(best.x + pw, select.x));
      const ey = Math.max(best.y, Math.min(best.y + ph, select.y));
      const len = Math.hypot(ex - select.x, ey - select.y);
      lead.style.opacity = ok && len > 14 ? '1' : '0';
      // Começa fora do anel do pino (raio ~20 px).
      const k = len ? Math.min(1, 20 / len) : 0;
      lead.setAttribute('x1', String(select.x + (ex - select.x) * k));
      lead.setAttribute('y1', String(select.y + (ey - select.y) * k));
      lead.setAttribute('x2', String(ex));
      lead.setAttribute('y2', String(ey));
    }
  }, []);

  /* ——— Montagem da cena ——— */
  useEffect(() => {
    if (status === 'error') return undefined;
    let scene = null;
    let cancelled = false;
    import('./scene.js')
      .then(({ AnatomyScene }) => {
        if (cancelled || !hostRef.current) return;
        scene = new AnatomyScene(hostRef.current, {
          modelUrl,
          metaUrl,
          reducedMotion: prefersReducedMotion(),
          bottomInset: baseRef.current ? baseRef.current.offsetHeight + 16 : 80,
          topInset: alertsRef.current?.offsetHeight ? alertsRef.current.offsetTop + alertsRef.current.offsetHeight + 12 : 0,
          onReady: ({ ids }) => {
            setPresent(new Set(ids));
            setStatus('ready');
          },
          onError: (err) => {
            console.error('[anatomia] modelo 3D indisponível', err?.error ?? err);
            setStatus('error');
          },
          onHover: (id) => setHoverId(id),
          onSelect: (id) => setSelectedId(id),
          onAnchors: (a) => {
            anchorsRef.current = a;
            place();
          },
        });
        // O canvas é a imagem: nome curto e a descrição do recorte para o leitor de tela.
        scene.canvas.removeAttribute('aria-hidden');
        scene.canvas.setAttribute('role', 'img');
        scene.canvas.setAttribute('aria-label', 'Busto anatômico em 3D');
        scene.canvas.setAttribute('aria-describedby', `an-desc-${uid}`);
        sceneRef.current = scene;
        scene.load();
      })
      .catch((err) => {
        console.error('[anatomia] falha ao carregar o palco', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, metaUrl]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused, status]);

  // A faixa da base empurra o centro óptico para cima.
  useEffect(() => {
    const el = baseRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => sceneRef.current?.setBottomInset?.(el.offsetHeight + 16));
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  // A faixa das pílulas de alerta no topo: o arco de camadas começa abaixo dela
  // (variável CSS) e a cabeça do modelo desce para não ficar coberta.
  useEffect(() => {
    const el = alertsRef.current;
    const stage = stageRef.current;
    if (!el || !stage || typeof ResizeObserver === 'undefined') return undefined;
    const sync = () => {
      const h = el.offsetHeight ? el.offsetTop + el.offsetHeight : 0;
      stage.style.setProperty('--an-top', `${h}px`);
      // Arco ou fileira. O arco começa abaixo dos alertas, centrado na altura
      // útil (mesma conta de anatomy.css), e não pode descer sobre a faixa de
      // consultas; num palco estreito ele cai sobre o rosto. Nos dois casos as
      // camadas viram uma fileira abaixo dos alertas e a cabeça desce abaixo dela.
      const arcTop = Math.max(h + 20, stage.clientHeight * 0.46 - ARC.h / 2);
      const baseTop = baseRef.current ? baseRef.current.offsetTop : stage.clientHeight;
      const asRow = stage.clientWidth <= 400 || arcTop + ARC_BTN_BOTTOM > baseTop - 8;
      stage.dataset.layers = asRow ? 'row' : 'arc';
      const row = asRow ? layersRef.current?.offsetHeight ?? 0 : 0;
      const top = row ? h + 12 + row : h;
      sceneRef.current?.setTopInset?.(top ? top + 12 : 0);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    ro.observe(stage);
    if (baseRef.current) ro.observe(baseRef.current);
    sync();
    return () => ro.disconnect();
  }, [status, alerts]);

  /* ——— Estruturas navegáveis (só as presentes e visíveis) ——— */
  const options = useMemo(
    () => INTERATIVAS.filter((e) => (!present || present.has(e.id)) && (e.camada == null || layers[e.camada])),
    [present, layers],
  );

  /* ——— Popover: foco e Esc ——— */
  const closePopover = useCallback(() => {
    sceneRef.current?.select(null);
    setSelectedId(null);
  }, []);
  const closeAndReturn = useCallback(() => {
    const back = returnFocusRef.current;
    closePopover();
    back?.focus?.({ preventScroll: true });
  }, [closePopover]);

  useEffect(() => {
    if (!selectedId) {
      // Fechou: × e Esc já devolvem o foco; se ele ficou perdido no popover removido, volta.
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      if (back && document.contains(back) && document.activeElement === document.body) back.focus?.({ preventScroll: true });
      return undefined;
    }
    if (!returnFocusRef.current) {
      const active = document.activeElement;
      returnFocusRef.current = active && active !== document.body ? active : listRef.current;
    }
    // Foco vai para o popover; o leitor de tela lê o título.
    const raf = requestAnimationFrame(() => {
      place();
      if (document.activeElement !== listRef.current) popRef.current?.focus({ preventScroll: true });
    });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeAndReturn();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedId, closeAndReturn, place]);

  /* ——— Camadas ——— */
  const toggleLayer = (id) => {
    setLastLayer(id);
    setLayers((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      sceneRef.current?.setLayerVisible(id, next[id]);
      return next;
    });
  };

  /* ——— Controles ——— */
  const zoom = (dir) => sceneRef.current?.zoom(dir);
  const cycleView = () => {
    const next = VISTA_ORDEM[(VISTA_ORDEM.indexOf(view) + 1) % VISTA_ORDEM.length];
    setView(next);
    sceneRef.current?.setView(next);
  };

  /* ——— Lista acessível (listbox com aria-activedescendant) ——— */
  const activeOption = options[activeIndex] ?? null;
  const moveTo = (i) => {
    if (!options.length) return;
    const idx = (i + options.length) % options.length;
    setActiveIndex(idx);
    sceneRef.current?.highlight(options[idx].id);
    document.getElementById(`an-opt-${uid}-${options[idx].id}`)?.scrollIntoView({ block: 'nearest' });
  };
  const onListKey = (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        moveTo(activeIndex < 0 ? options.length - 1 : activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveTo(0);
        break;
      case 'End':
        e.preventDefault();
        moveTo(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (status !== 'ready') {
          // Antes de o modelo montar não há o que abrir: avisa em vez de calar.
          e.preventDefault();
          setListNotice('O modelo 3D ainda está carregando. Tente de novo em instantes.');
          break;
        }
        if (activeOption) {
          e.preventDefault();
          returnFocusRef.current = listRef.current;
          sceneRef.current?.select(activeOption.id);
          requestAnimationFrame(() => popRef.current?.focus({ preventScroll: true }));
        }
        break;
      default:
    }
  };
  const onListFocus = () => {
    setListFocused(true);
    if (activeIndex < 0 && options.length) moveTo(0);
    else if (activeOption) sceneRef.current?.highlight(activeOption.id);
  };
  const onListBlur = () => {
    setListFocused(false);
    setListNotice('');
    sceneRef.current?.highlight(null);
  };

  // Se a estrutura ativa da lista sumiu (camada desligada), recomeça.
  useEffect(() => {
    if (activeIndex >= options.length) setActiveIndex(options.length ? 0 : -1);
  }, [options.length, activeIndex]);

  // O modelo montou com a lista em foco: o aviso de carga vira a instrução normal.
  useEffect(() => {
    if (status === 'ready') setListNotice('');
  }, [status]);
  const listHint = listNotice || (status === 'ready' ? 'Setas percorrem · Enter abre' : 'Carregando o modelo 3D…');

  const hovered = hoverId ? ESTRUTURAS[hoverId] : null;
  const selected = selectedId ? ESTRUTURAS[selectedId] : null;
  const n = CAMADAS.length;
  const lastIdx = CAMADAS.findIndex((c) => c.id === lastLayer);
  const cursor = arcPoint(lastIdx, n, ARC.r);

  const base = (
    <div className="an-base" ref={baseRef}>
      <div className="an-rail">{rail}</div>
      {status !== 'error' ? (
        <div className="an-controls" role="group" aria-label="Controles do modelo">
          <button type="button" className="an-glass-btn an-glass-btn--zoom" aria-label="Aproximar" onClick={() => zoom(1)} disabled={status !== 'ready'}>
            <Icon name="plus" size={20} />
          </button>
          <button type="button" className="an-glass-btn an-glass-btn--zoom" aria-label="Afastar" onClick={() => zoom(-1)} disabled={status !== 'ready'}>
            <Icon name="minus" size={20} />
          </button>
          <button
            type="button"
            className="an-glass-btn an-glass-btn--text"
            aria-label={`Mudar vista (atual: ${VISTA_LONGA[view]})`}
            onClick={cycleView}
            disabled={status !== 'ready'}
          >
            {VISTA_NOME[view]}
          </button>
        </div>
      ) : null}
    </div>
  );
  // Crédito sempre à vista no pé do palco; o texto completo vai para o leitor de tela e o title.
  const creditLine = (
    <p className="an-credit-line" title={CREDITO}>
      <span className="an-credit-line__full" aria-hidden="true">{CREDITO_CURTO}</span>
      <span className="an-credit-line__min" aria-hidden="true">{CREDITO_MINIMO}</span>
      <span className="an-sr">{CREDITO}</span>
    </p>
  );

  if (status === 'error') {
    return (
      <section className="an-stage an-stage--fallback" aria-label="Anatomia">
        {alerts ? <div className="an-alerts">{alerts}</div> : null}
        <FallbackList attachments={attachments} onOpenAttachments={onOpenAttachments} />
        {base}
        {creditLine}
      </section>
    );
  }

  return (
    <section
      ref={stageRef}
      className={`an-stage${status === 'ready' ? ' is-ready' : ''}${hovered ? ' is-hovering' : ''}`}
      aria-label="Anatomia"
    >
      <div ref={hostRef} className="an-canvas-host" />
      <p id={`an-desc-${uid}`} className="an-sr">{DESCRICAO}</p>

      {status === 'loading' ? (
        <div className="an-loading" role="status">
          <span className="an-loading__dot" aria-hidden="true" />
          Abrindo o modelo 3D
        </div>
      ) : null}

      {/* Pino do hover / teclado. Com a lista aberta, o nome fica na lista e o rótulo some. */}
      <div
        ref={pinRef}
        className={`an-pin${hovered && hovered.id === selectedId ? ' is-same' : ''}`}
        aria-hidden="true"
        style={hovered?.cor ? { '--an-color': `var(${hovered.cor})` } : undefined}
      >
        <span className="an-pin__mark"><span className="an-pin__dot" /></span>
        {hovered && !listFocused ? <span className="an-pin__label">{hovered.curto}</span> : null}
      </div>
      {/* Pino fixo da seleção */}
      <div
        ref={fixedPinRef}
        className="an-pin an-pin--fixed"
        aria-hidden="true"
        style={selected?.cor ? { '--an-color': `var(${selected.cor})` } : undefined}
      >
        <span className="an-pin__mark"><span className="an-pin__dot" /></span>
      </div>

      {/* Traço-guia do pino ao popover */}
      {selected ? (
        <svg className="an-lead" aria-hidden="true" style={selected.cor ? { '--an-color': `var(${selected.cor})` } : undefined}>
          <line ref={leadRef} x1="0" y1="0" x2="0" y2="0" />
        </svg>
      ) : null}

      {/* Popover de vidro */}
      {selected ? (
        <div
          ref={popRef}
          className="an-popover"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`an-pop-${uid}`}
          tabIndex={-1}
          style={selected.cor ? { '--an-color': `var(${selected.cor})` } : undefined}
        >
          <StructurePopover
            estrutura={selected}
            attachments={attachments}
            onOpenAttachments={onOpenAttachments}
            titleId={`an-pop-${uid}`}
            onClose={closeAndReturn}
          />
        </div>
      ) : null}

      {/* Alertas (slot) */}
      {alerts ? <div className="an-alerts" ref={alertsRef}>{alerts}</div> : null}

      {/* Seletor radial de camadas */}
      <div ref={layersRef} className="an-layers" role="group" aria-label="Camadas do modelo" style={{ width: ARC.w, height: ARC.h }}>
        <svg className="an-layers__arc" width={ARC.w} height={ARC.h} viewBox={`0 0 ${ARC.w} ${ARC.h}`} aria-hidden="true">
          <path d={arcPath()} />
          {CAMADAS.map((c, i) => {
            const p = arcPoint(i, n, ARC.r);
            return <circle key={c.id} className={`an-layers__node${layers[c.id] ? ' is-on' : ''}`} cx={p.x} cy={p.y} r={2.5} />;
          })}
          <circle className="an-layers__cursor" cx={0} cy={0} r={6} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} />
        </svg>
        <div className="an-layers__btns">
          {CAMADAS.map((c, i) => {
            const p = arcPoint(i, n, ARC.rBtn);
            return (
              <button
                key={c.id}
                type="button"
                className={`an-glass-btn an-layers__btn${layers[c.id] ? ' is-on' : ''}`}
                style={{ left: p.x, top: p.y }}
                aria-pressed={layers[c.id]}
                aria-label={c.nome}
                title={`${layers[c.id] ? 'Ocultar' : 'Mostrar'} ${c.nome.toLowerCase()}`}
                onClick={() => toggleLayer(c.id)}
                onFocus={() => setLastLayer(c.id)}
                onMouseEnter={() => setLastLayer(c.id)}
              >
                <Icon name={c.icone} size={20} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista acessível de estruturas */}
      <div ref={listWrapRef} className={`an-list${listFocused ? ' is-open' : ''}`}>
        <p className="an-list__hint" id={`an-list-hint-${uid}`} aria-live="polite">{listHint}</p>
        <ul
          ref={listRef}
          className="an-list__box"
          role="listbox"
          tabIndex={0}
          aria-busy={status !== 'ready' || undefined}
          aria-label="Estruturas anatômicas"
          aria-describedby={`an-list-hint-${uid}`}
          aria-activedescendant={activeOption ? `an-opt-${uid}-${activeOption.id}` : undefined}
          onKeyDown={onListKey}
          onFocus={onListFocus}
          onBlur={onListBlur}
        >
          {options.map((e, i) => (
            <li
              key={e.id}
              id={`an-opt-${uid}-${e.id}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`an-list__opt${i === activeIndex ? ' is-active' : ''}`}
              style={e.cor ? { '--an-color': `var(${e.cor})` } : undefined}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                setActiveIndex(i);
                returnFocusRef.current = listRef.current;
                sceneRef.current?.select(e.id);
              }}
            >
              <span className="an-list__swatch" aria-hidden="true" />
              {e.nome}
            </li>
          ))}
        </ul>
      </div>

      {base}
      {creditLine}
    </section>
  );
}
