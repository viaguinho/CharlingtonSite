import Icon from './Icon.jsx';

/**
 * Três gramáticas de aba, cada uma com um papel distinto:
 *
 *  pill      — navegação de nível de tela, ativa em tinta escura (REF 3)
 *  underline — troca de recorte dentro de um mesmo conteúdo, ex.: período (REF 2)
 *  segment   — alternância de modo de visualização, ex.: dia/semana/mês
 */

export function Tabs({ items = [], value, onChange, variant = 'pill', className = '', ariaLabel = 'Abas' }) {
  return (
    <div className={`tabs tabs--${variant} ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
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
        onChange={onChange}
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
              {item.count != null ? (
                // Contagem de pendência é escrita por extenso numa segunda linha:
                // um "9" solto ao lado de "Documentos" se lia como 9 emitidos.
                typeof item.count === 'object'
                  ? <span className={`index-list__pending index-list__pending--${item.count.tone}`}>{item.count.hint}</span>
                  : <span className="index-list__count num">{item.count}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
