import { useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { withViewTransition } from '../core/viewTransition.js';

/**
 * Três gramáticas de aba, cada uma com um papel distinto:
 *
 *  pill      — navegação de nível de tela, ativa em tinta escura (REF 3)
 *  underline — troca de recorte dentro de um mesmo conteúdo, ex.: período (REF 2)
 *  segment   — alternância de modo de visualização, ex.: dia/semana/mês
 */

/**
 * Indicador deslizante: a pílula (ou o sublinhado) da aba ativa é UM elemento
 * que anda até a aba escolhida, como o seletor segmentado do iOS. Mede a aba
 * ativa no layout e acompanha mudanças de tamanho. Até a primeira medida, a
 * aba ativa pinta o próprio fundo (sem salto na montagem).
 */
function useThumb(ref, value, count) {
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const measure = () => {
      const el = root.querySelector('.tabs__item.is-active');
      setThumb(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll('.tabs__item').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [ref, value, count]);
  return thumb;
}

export function Tabs({ items = [], value, onChange, variant = 'pill', className = '', ariaLabel = 'Abas' }) {
  const ref = useRef(null);
  const thumb = useThumb(ref, value, items.length);
  return (
    <div
      ref={ref}
      className={`tabs tabs--${variant} ${thumb ? 'has-thumb' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {thumb ? (
        <span
          className="tabs__thumb"
          aria-hidden="true"
          style={{ width: thumb.w, height: thumb.h, transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
        />
      ) : null}
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tabs__item ${active ? 'is-active' : ''}`}
            onClick={() => onChange?.(item.value)}
            disabled={item.disabled}
          >
            {item.icon ? <Icon name={item.icon} size={15} /> : null}
            <span>{item.label}</span>
            {/* Contagem de filtro é dado, não alerta: número neutro, e zero aparece
                como zero — um filtro sem número parecia não ter sido contado. */}
            {item.count != null ? <span className="tabs__count num">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Seletor de período — o recorte universal de todo gráfico do painel. */
export const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
];

export function PeriodTabs({ value, onChange, caption }) {
  // O intervalo é escrito ao lado: "Mês" sozinho já significou duas coisas
  // em duas telas. Com a data à vista, não há o que interpretar.
  return (
    <div className="period-tabs">
      <Tabs
        items={PERIOD_OPTIONS.map((o) => ({ ...o, label: PERIOD_LABELS[o.value] ?? o.label }))}
        value={value}
        // Trocar o período troca todos os números da tela: um cruzamento curto
        // (View Transition) diz "mesma tela, outro recorte".
        onChange={(next) => withViewTransition(() => onChange?.(next))}
        variant="underline"
        ariaLabel="Período"
      />
      {caption ? <span className="period-tabs__caption">{caption}</span> : null}
    </div>
  );
}

const PERIOD_LABELS = { week: 'Semana', month: 'Mês', quarter: 'Trimestre', year: 'Ano' };

/** Índice numerado 01–06 como navegação de seção (REF 3). */
export function IndexList({ items = [], value, onChange }) {
  return (
    <nav className="index-list" aria-label="Seções">
      <ol>
        {items.map((item, i) => (
          <li key={item.value}>
            <button
              type="button"
              className={item.value === value ? 'is-active' : ''}
              onClick={() => onChange?.(item.value)}
            >
              <span className="index-list__num num">{String(i + 1).padStart(2, '0')}</span>
              <span className="index-list__label">{item.label}</span>
              {item.count != null && typeof item.count === 'object' ? (
                <span className={`index-list__pending index-list__pending--${item.count.tone}`}>{item.count.hint}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
