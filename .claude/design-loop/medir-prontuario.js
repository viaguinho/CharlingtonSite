/*
 * Medição do prontuário para o crítico de sistema (roda no perfil headless).
 * Devolve fatos do DOM renderizado — tamanhos de texto, pesos, raios, alvos,
 * contraste estimado e transbordos — sem que o crítico leia o código.
 */
await __sleep(4500);
const root = document.querySelector('.pr');
if (!root) return { erro: 'prontuário não renderizou' };

const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const CANVAS = [238, 240, 243];

// Fundo efetivo: compõe os fundos translúcidos dos ancestrais sobre o canvas.
function effectiveBg(el) {
  const layers = [];
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    const [r, g, b, a = 1] = parse(bg);
    if (bg !== 'rgba(0, 0, 0, 0)' && a > 0) { layers.push([r, g, b, a]); if (a >= 1) break; }
  }
  let out = CANVAS;
  for (const [r, g, b, a] of layers.reverse()) out = [out[0] * (1 - a) + r * a, out[1] * (1 - a) + g * a, out[2] * (1 - a) + b * a];
  return out;
}

const texts = [];
const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const t = walker.currentNode; const el = t.parentElement;
  if (!t.textContent.trim() || !el) continue;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
  const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
  const fg = parse(cs.color); const bg = effectiveBg(el);
  const fa = fg[3] ?? 1; const fgc = [0, 1, 2].map((i) => fg[i] * fa + bg[i] * (1 - fa));
  texts.push({ texto: t.textContent.trim().slice(0, 40), classe: el.className?.toString().slice(0, 40), px: parseFloat(cs.fontSize), peso: cs.fontWeight, contraste: +ratio(fgc, bg).toFixed(2), area: el.closest('.pr-stage') ? 'palco' : el.closest('.pr-side') ? 'direita' : el.closest('.pr-profile') ? 'esquerda' : 'topo' });
}

const tamanhos = {}; texts.forEach((t) => { tamanhos[t.px] = (tamanhos[t.px] || 0) + 1; });
const baixoContraste = texts.filter((t) => t.contraste < (t.px >= 18.66 ? 3 : 4.5)).slice(0, 30);

const alvos = [...root.querySelectorAll('button, a, [role=button], input, select')]
  .map((el) => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width && r.height && (r.width < 44 || r.height < 44))
  .map(({ el, r }) => ({ rotulo: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), classe: el.className?.toString().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }));

const raios = {}; root.querySelectorAll('*').forEach((el) => { const v = getComputedStyle(el).borderRadius; if (v && v !== '0px') raios[v] = (raios[v] || 0) + 1; });

const bordaMaisSombra = [...root.querySelectorAll('*')].filter((el) => { const cs = getComputedStyle(el); return parseFloat(cs.borderTopWidth) >= 1 && cs.borderTopStyle !== 'none' && cs.boxShadow !== 'none' && !cs.boxShadow.startsWith('inset'); })
  .slice(0, 15).map((el) => el.className?.toString().slice(0, 40));

const azulPreenchido = [...root.querySelectorAll('*')].filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && getComputedStyle(el).backgroundColor === 'rgb(0, 113, 227)'; }).map((el) => el.className?.toString().slice(0, 40));

const stage = document.querySelector('.pr-stage')?.getBoundingClientRect();
const main = document.getElementById('conteudo') || document.scrollingElement;

return {
  viewport: [innerWidth, innerHeight],
  rolagemLateral: document.documentElement.scrollWidth > innerWidth + 1 || (main.scrollWidth > main.clientWidth + 1),
  palco: stage ? { x: Math.round(stage.x), y: Math.round(stage.y), w: Math.round(stage.width), h: Math.round(stage.height), fracLargura: +(stage.width / innerWidth).toFixed(2), visivelNaDobra: Math.round(Math.min(stage.bottom, innerHeight) - stage.top) } : null,
  tamanhosDeTexto: tamanhos,
  pesos: [...new Set(texts.map((t) => t.peso))],
  textosAbaixoDoAA: baixoContraste,
  alvosMenoresQue44: alvos,
  raios,
  bordaMaisSombra,
  azulPreenchidoNaDobra: azulPreenchido,
  consoleErros: window.__erros || [],
};
