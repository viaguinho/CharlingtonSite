import { flushSync } from 'react-dom';

/**
 * Troca de estado com View Transitions (API nativa do navegador).
 *
 * O `<ViewTransition>` do React ainda não existe no React estável que o painel
 * usa (19.2), e trocar para o canal canary num prontuário não vale o risco.
 * Aqui a troca é síncrona dentro de `document.startViewTransition`, e os
 * elementos que devem "viajar" levam um `view-transition-name` próprio no
 * CSS/JSX (ex.: `patient-<id>` na Lista e nos Cards de Pacientes).
 *
 * Sem suporte do navegador ou com movimento reduzido, a troca acontece seca,
 * sem animação — o estado final é o mesmo.
 */
export function withViewTransition(update) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) {
    update();
    return null;
  }
  return document.startViewTransition(() => {
    flushSync(update);
  });
}

/** Nome de transição compartilhada, seguro para CSS (id pode ter qualquer caractere). */
export function vtName(prefix, id) {
  return `${prefix}-${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
