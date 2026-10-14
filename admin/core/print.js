/**
 * Impressão de um elemento: o navegador imprime APENAS ele.
 *
 * Esconder a interface por lista de classes (rail, topbar, cards…) deixa de
 * funcionar a cada tela nova: o PDF da folha de um laudo saía com a lista de
 * documentos e os indicadores da página impressos antes do papel timbrado.
 * Aqui o caminho é inverso: do elemento até o <body>, todo irmão de cada
 * ancestral é marcado com `data-print-hide` (display:none na impressão), então
 * sobra a folha e nada mais, qualquer que seja a tela ou o portal em que ela
 * está.
 */

const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE']);

export function markForPrint(element) {
  clearPrintMarks();
  let node = element;
  while (node && node !== document.body && node.parentElement) {
    const parent = node.parentElement;
    for (const sibling of parent.children) {
      if (sibling !== node && !SKIP.has(sibling.tagName)) sibling.setAttribute('data-print-hide', '');
    }
    node = parent;
  }
  document.body.classList.add('is-printing');
}

export function clearPrintMarks() {
  document.querySelectorAll('[data-print-hide]').forEach((el) => el.removeAttribute('data-print-hide'));
  document.body.classList.remove('is-printing');
}

/** Imprime o elemento e devolve a página ao normal, mesmo se o diálogo falhar. */
export function printElement(element) {
  if (!element) return;
  markForPrint(element);
  const done = () => { clearPrintMarks(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  // Dois quadros: o navegador precisa aplicar o display:none antes de paginar.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    try { window.print(); } finally { done(); }
  }));
}
