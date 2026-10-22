import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { APPOINTMENT_TYPE_LABELS } from '../../data/schema.js';
import DateRangePopover from './DateRangePopover.jsx';
import { pillDate } from './period.js';
import { Popover, RoundButton } from './ui.jsx';

/**
 * Barra de ferramentas da referência, em pílulas:
 *   [lupa] [ajustes] [calendário●] [início] [fim] [+ Adicionar widget] [Criar relatório]
 * Cada uma tem função real: busca nos cards, filtro por tipo de atendimento,
 * período com atalhos e intervalo livre, catálogo de widgets e o assistente
 * de relatório.
 */

const TYPE_OPTIONS = ['primeira', 'retorno', 'teleconsulta', 'procedimento', 'laudo'];

function SearchPill({ query, onQuery, onSubmit }) {
  const [open, setOpen] = useState(Boolean(query));
  const input = useRef(null);
  const lupa = useRef(null);
  // Esc desmonta o campo: o foco volta à lupa, não cai no body.
  const refocus = useRef(false);
  useEffect(() => {
    if (open) input.current?.focus();
    else if (refocus.current) { refocus.current = false; lupa.current?.focus(); }
  }, [open]);
  if (!open) {
    return <RoundButton ref={lupa} icon="search" label="Buscar nos cards" tone="pill" size={48} aria-expanded={false} onClick={() => setOpen(true)} />;
  }
  return (
    <label className="rp-search">
      <Icon name="search" size={18} stroke={1.6} />
      <input
        ref={input}
        type="search"
        value={query}
        placeholder="Buscar card: faltas, CID, Pix…"
        aria-label="Buscar nos cards dos relatórios"
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
          if (e.key === 'Escape') { e.stopPropagation(); onQuery(''); refocus.current = true; setOpen(false); }
        }}
        onBlur={() => { if (!query) setOpen(false); }}
      />
      {query ? (
        <button type="button" className="rp-search__clear" aria-label="Limpar busca" onMouseDown={(e) => e.preventDefault()} onClick={() => { onQuery(''); input.current?.focus(); }}>
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </label>
  );
}

function FilterPill({ types, onTypes }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  const count = types?.size ?? 0;
  const toggle = (key) => {
    const next = new Set(types ?? []);
    if (next.has(key)) next.delete(key); else next.add(key);
    onTypes(next.size ? next : null);
  };
  return (
    <span ref={anchor} className="rp-anchor">
      <RoundButton
        icon="sliders"
        label={count ? `Filtro: ${count} ${count === 1 ? 'tipo' : 'tipos'} de atendimento` : 'Filtrar por tipo de atendimento'}
        tone={count || open ? 'ink' : 'pill'}
        size={48}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      />
      {count ? <span className="rp-badge num" aria-hidden="true">{count}</span> : null}
      <Popover open={open} anchorRef={anchor} onClose={() => setOpen(false)} align="start" width={300} label="Filtrar por tipo de atendimento">
        <div className="rp-menu">
          <p className="rp-menu__label">Tipo de atendimento</p>
          <ul className="rp-checks">
            {TYPE_OPTIONS.map((key) => (
              <li key={key}>
                <label className={`rp-check ${types?.has(key) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={Boolean(types?.has(key))} onChange={() => toggle(key)} />
                  <span className="rp-check__box" aria-hidden="true"><Icon name="check" size={12} /></span>
                  {APPOINTMENT_TYPE_LABELS[key]}
                </label>
              </li>
            ))}
          </ul>
          <p className="rp-menu__hint">Recalcula os cards que vêm de atendimento. Receita, evoluções e documentos entram só quando ligados a um atendimento do tipo escolhido; medicações do prontuário e a situação dos pacientes não seguem o filtro.</p>
          {count ? <button type="button" className="rp-menu__item" onClick={() => onTypes(null)}><Icon name="x" size={15} /> Limpar filtro</button> : null}
        </div>
      </Popover>
    </span>
  );
}

export function ReportToolbar({ range, onRange, query, onQuery, onSearchSubmit, types, onTypes, onAddWidget, onCreateReport, hiddenCount }) {
  const dates = useRef(null);
  const [edge, setEdge] = useState(undefined);
  const open = edge !== undefined;
  const openAt = (which) => setEdge((current) => (current === which ? undefined : which));

  return (
    <div className="rp-toolbar" role="toolbar" aria-label="Ferramentas dos relatórios">
      <SearchPill query={query} onQuery={onQuery} onSubmit={onSearchSubmit} />
      <FilterPill types={types} onTypes={onTypes} />
      <div ref={dates} className="rp-toolbar__dates">
        <RoundButton
          icon="calendar"
          label="Escolher período"
          tone="ink"
          size={48}
          aria-expanded={open && edge === null}
          aria-haspopup="dialog"
          onClick={() => openAt(null)}
        />
        <button type="button" className={`rp-pill num ${open && edge === 'from' ? 'is-open' : ''}`} aria-expanded={open && edge === 'from'} aria-label={`Início do período: ${pillDate(range.from)}`} onClick={() => openAt('from')}>
          {pillDate(range.from)}
        </button>
        <button type="button" className={`rp-pill num ${open && edge === 'to' ? 'is-open' : ''}`} aria-expanded={open && edge === 'to'} aria-label={`Fim do período: ${pillDate(range.to)}`} onClick={() => openAt('to')}>
          {pillDate(range.to)}
        </button>
      </div>
      {/* No celular viram botões redondos (só o ícone): cabem com a lupa e o filtro numa linha. */}
      <button type="button" className="rp-pill rp-pill--action" onClick={onAddWidget} title="Adicionar widget">
        <Icon name="plus" size={18} stroke={1.6} /> <span className="rp-pill__text">Adicionar widget</span>
        {hiddenCount ? <span className="rp-pill__count num">{hiddenCount}</span> : null}
      </button>
      <button type="button" className="rp-pill rp-pill--action rp-pill--report" onClick={onCreateReport} title="Criar relatório">
        <Icon name="file-text" size={18} stroke={1.6} className="rp-pill__icon" /> <span className="rp-pill__text">Criar relatório</span>
      </button>
      <DateRangePopover
        open={open}
        anchorRef={dates}
        value={range}
        focusEdge={edge ?? null}
        onChange={onRange}
        onClose={() => setEdge(undefined)}
      />
    </div>
  );
}

/**
 * Pílulas de tema: âncoras para as seções, grudadas no topo da rolagem. A
 * ativa acompanha a seção que ocupa o alto da tela.
 */
export function ThemePills({ sections, active, onJump, counts }) {
  return (
    <nav className="rp-themes" aria-label="Temas do relatório">
      <ul>
        {sections.map((s) => (
          <li key={s.key}>
            <a
              href={`#rp-${s.key}`}
              className={`rp-theme ${active === s.key ? 'is-active' : ''} ${counts?.[s.key] === 0 ? 'is-empty' : ''}`}
              aria-current={active === s.key ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); onJump(s.key); }}
            >
              {s.label}
              {counts ? <span className="rp-theme__count num">{counts[s.key]}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
