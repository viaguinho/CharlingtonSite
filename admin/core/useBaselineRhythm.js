import { useEffect } from 'react';

/**
 * Ritmo de linha-base do grid bento.
 *
 * Cada card cresce até o próximo múltiplo de 24px (o mesmo passo do gutter).
 * Sem isso as alturas saíam do conteúdo — 440 numa fileira, 435 na seguinte —
 * e o bento parecia empilhado, não montado. Cards da mesma fileira continuam
 * esticando juntos; o que muda é que toda fileira termina na mesma grade.
 *
 * A medida é da altura NATURAL (sem esticar), para que o card não fique preso
 * a uma altura que já não precisa quando o conteúdo diminui.
 */
const STEP = 24;

// Além dos cards do bento, os blocos soltos entre eles: a faixa de KPIs (161 px
// fora do bento, 168 dentro) e a faixa de aviso (62 px) saíam da linha-base.
const SNAPPED = '.bento > *, .metric-strip, .ops-alert, main .card';

function snap(children) {
  const wanted = children.map((child) => {
    const { alignSelf, minHeight } = child.style;
    child.style.alignSelf = 'start';
    child.style.minHeight = '0px';
    const natural = child.getBoundingClientRect().height;
    child.style.alignSelf = alignSelf;
    child.style.minHeight = minHeight;
    return natural ? Math.ceil(natural / STEP) * STEP : 0;
  });
  children.forEach((child, i) => {
    const next = wanted[i] ? `${wanted[i]}px` : '';
    if (child.style.minHeight !== next) child.style.minHeight = next;
  });
}

export function useBaselineRhythm(key) {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => snap(Array.from(document.querySelectorAll(SNAPPED))));
    };

    // Conteúdo chega depois da rota (dados assíncronos): observa o que muda.
    const resize = new ResizeObserver(run);
    const mutation = new MutationObserver(() => {
      document.querySelectorAll(SNAPPED).forEach((el) => resize.observe(el));
      run();
    });
    const root = document.getElementById('admin-root') ?? document.body;
    mutation.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', run);
    run();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [key]);
}
