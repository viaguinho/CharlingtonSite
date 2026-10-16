import { useEffect } from 'react';

/**
 * Reflexo que segue o cursor nos cards de vidro e nos ladrilhos em gradiente.
 *
 * Um ouvinte só, no documento, passivo e limitado a um quadro por vez: acha
 * a superfície sob o cursor e escreve `--gx`/`--gy` (em px, relativos a ela)
 * direto no estilo do elemento. Nenhum estado React muda, nada re-renderiza;
 * o CSS (card.css) desenha a luz com essas variáveis.
 *
 * Sem efeito em tela de toque (não há cursor para seguir) e com movimento
 * reduzido (o reflexo é decoração).
 */
const SURFACES = '.card, .metric-strip > *, .metric.is-featured[data-mood], .auth-card';

export function useGlare() {
  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!fine?.matches || reduced?.matches) return undefined;

    let frame = 0;
    let last = null;

    const onMove = (event) => {
      last = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = last?.target;
        if (!(target instanceof Element)) return;
        const surface = target.closest(SURFACES);
        if (!surface) return;
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty('--gx', `${Math.round(last.clientX - rect.left)}px`);
        surface.style.setProperty('--gy', `${Math.round(last.clientY - rect.top)}px`);
      });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
