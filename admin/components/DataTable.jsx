import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { EmptyState, Skeleton } from './Card.jsx';

/**
 * Tabela de dados do painel.
 *
 * `columns` = [{ key, label, align, width, sortable, render, hideBelow }]
 * `rows`    = objetos com `id`
 *
 * Decisões:
 *  - hover de linha muda só o fundo, nunca a posição — listas longas não podem
 *    tremer sob o cursor;
 *  - a coluna numérica usa `tabular-nums` e alinhamento à direita;
 *  - sem dados, renderiza um estado vazio honesto com a ação sugerida;
 *  - a ordenação é anunciada por `aria-sort`.
 */
export function DataTable({
  columns = [],
  rows = [],
  loading = false,
  density = 'comfortable',
  onRowClick,
  selectedId,
  emptyState,
  defaultSort,
  rowKey = (row) => row.id,
  caption,
}) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    const accessor = column?.sortValue ?? ((row) => row[sort.key]);
    const factor = sort.direction === 'desc' ? -1 : 1;

    return [...rows].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * factor;
    });
  }, [rows, sort, columns]);

  function toggleSort(key) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }

  if (loading) {
    return (
      <div className={`table-wrap table-wrap--${density}`}>
        <table className="table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} style={{ width: c.width }}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}><Skeleton width={c.align === 'right' ? '48%' : '78%'} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows.length) {
    return emptyState ?? (
      <EmptyState
        icon="list"
        title="Nenhum registro"
        description="Quando houver dados, eles aparecem aqui."
      />
    );
  }

  return (
    <div className={`table-wrap table-wrap--${density}`}>
      <table className="table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width, textAlign: column.align ?? 'left' }}
                  className={`${column.align === 'right' ? 'num' : ''} ${column.hideBelow ? `hide-below-${column.hideBelow}` : ''}`.trim()}
                  aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {column.sortable ? (
                    <button type="button" className="table__sort" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <Icon
                        name={isSorted ? (sort.direction === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevron-down'}
                        size={12}
                        className={isSorted ? 'is-active' : 'is-idle'}
                      />
                    </button>
                  ) : column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                role={onRowClick ? 'button' : undefined}
                className={`${onRowClick ? 'is-clickable' : ''} ${selectedId === key ? 'is-selected' : ''}`.trim()}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
                } : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{ textAlign: column.align ?? 'left' }}
                    className={`${column.align === 'right' ? 'num' : ''} ${column.hideBelow ? `hide-below-${column.hideBelow}` : ''}`.trim()}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Barra de filtros acima de uma tabela. */
export function TableToolbar({ children, className = '' }) {
  return <div className={`table-toolbar ${className}`.trim()}>{children}</div>;
}
