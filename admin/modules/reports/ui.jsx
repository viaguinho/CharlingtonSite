import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../components/Icon.jsx';

/**
 * Peças pequenas dos Relatórios: popover ancorado, botão redondo, número de
 * cabeçalho e realce de busca. Classes `rp-*` em reports.css.
 */

/* ═══════════════════════════ Botão redondo ═══════════════════════════ */

export function RoundButton({ icon, label, active = false, tone = 'chip', size = 44, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`rp-round rp-round--${tone} ${active ? 'is-active' : ''} ${className}`.trim()}
      style={{ '--size': `${size}px` }}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size >= 44 ? 18 : 16} stroke={1.6} />
    </button>
  );
}

/**
 * Teclado de grupo de rádio/abas (padrão ARIA): só o item escolhido entra no
 * Tab; setas e Home/End trocam a escolha e levam o foco junto.
 */
export function rovingKeys(event, keys, current, pick) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  const at = keys.indexOf(current);
  let next = null;
  if (step) next = (at + step + keys.length) % keys.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = keys.length - 1;
  if (next == null) return;
  event.preventDefault();
  pick(keys[next]);
  const items = event.currentTarget.querySelectorAll('[role="radio"], [role="tab"]');
  items[next]?.focus();
}

/* ═══════════════════════════════ Popover ═══════════════════════════════ */

/**
 * Painel preso a um gatilho, por portal (o card tem overflow e raio). Fecha
 * com Esc e com clique fora; o clique no próprio gatilho fica com ele (alternar).
 * O foco entra no primeiro controle e volta ao gatilho ao fechar.
 */
export function Popover({ open, anchorRef, onClose, align = 'end', width, className = '', label, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = ref.current;
      if (!anchor || !panel) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      let left = align === 'end' ? anchor.right - w : anchor.left;
      left = Math.max(12, Math.min(window.innerWidth - w - 12, left));
      let top = anchor.bottom + 10;
      if (top + h > window.innerHeight - 12 && anchor.top - h - 10 > 12) top = anchor.top - h - 10;
      setPos({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, align]);

  // onClose pela ref: nas dependências, cada render do pai refazia o efeito, o
  // foco saltava ao 1º controle e o "gatilho" virava um nó de dentro do painel.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const trigger = document.activeElement;
    const first = ref.current?.querySelector('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    first?.focus({ preventScroll: true });
    const onDown = (event) => {
      if (ref.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      closeRef.current?.();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current?.(); trigger?.focus?.(); }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      className={`rp-pop ${className}`.trim()}
      role="dialog"
      aria-label={label}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ═══════════════════════════ Número de cabeçalho ═══════════════════════════ */

/** "Concluídos no período / 186 / 16 em 01–16/09 · +12%" — a anatomia do "Activity". */
export function Figure({ head, query }) {
  if (!head) return null;
  return (
    <div className="rp-figure">
      {head.kicker ? <p className="rp-figure__kicker"><Highlight text={head.kicker} query={query} /></p> : null}
      <p className="rp-figure__number num">
        {head.prefix ? <span className="rp-figure__prefix">{head.prefix}</span> : null}
        <span className="rp-figure__value">{head.value}</span>
        {head.unit ? <span className="rp-figure__unit">{head.unit}</span> : null}
      </p>
      {head.sub || head.delta ? (
        <p className="rp-figure__sub">
          {head.delta ? <span className={`rp-delta rp-delta--${head.neutralDelta ? 'neutral' : head.delta.tone}`}>{head.delta.text}</span> : null}
          {head.sub ? <span>{head.sub}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

/** Mini-pílulas de contagem ao lado do gráfico ("34 Wallets / 28 Assets"). */
export function MiniPills({ items = [] }) {
  if (!items.length) return null;
  return (
    <ul className="rp-minis">
      {items.map((item) => (
        <li key={item.label} className={`rp-mini ${item.tone ? `rp-mini--${item.tone}` : ''}`}>
          <strong className="num">{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════════════════════ Tabela e CSV ═══════════════════════════════ */

/** Tabela de dados do card ampliado: a mesma do CSV e do PDF. */
export function DataTable({ table }) {
  if (!table?.rows?.length) return <p className="rp-note">Sem linhas para mostrar neste período.</p>;
  return (
    <div className="rp-table-wrap">
      <table className="rp-table">
        {table.caption ? <caption>{table.caption}</caption> : null}
        <thead><tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {table.rows.map((row, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>{row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j} className="num">{cell}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** CSV de um card: `;`, aspas em toda célula, BOM para o Excel abrir acentos. */
export function tableCSV(title, table, meta = []) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [[title], ...meta, [], table.columns, ...table.rows].map((row) => row.map(cell).join(';'));
  return `﻿${lines.join('\r\n')}`;
}

export function downloadFile(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ═══════════════════════════════ Busca ═══════════════════════════════ */

const fold = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Realça o termo buscado sem perder os acentos do texto original. */
export function Highlight({ text, query }) {
  const q = fold(query).trim();
  if (!q || !text) return text ?? null;
  const at = fold(text).indexOf(q);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rp-mark">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}
