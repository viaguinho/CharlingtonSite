import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../components/Icon.jsx';
import { isoDay } from '../../core/format.js';
import { PRESETS, presetRange, customRange, pillDate, atNoon, daysBetween } from './period.js';

/**
 * Painel de datas dos Relatórios.
 *
 * Pendura-se sob a barra de ferramentas (`anchorRef`), alinhado à direita, e
 * oferece dois caminhos: os atalhos de período (aplicam na hora) e um
 * intervalo livre em dois meses (aplica no botão "Aplicar").
 *
 * Seleção do intervalo: o primeiro clique marca o início, o mouse (ou as
 * setas) mostra a prévia, o segundo clique marca o fim — `customRange` ordena.
 * Quando o painel abre pela pílula de início (ou de fim), o primeiro clique
 * troca só aquela ponta e mantém a outra; a partir daí o painel volta ao
 * modo livre.
 *
 * O calendário é uma grade com tabindex móvel (roving): só o dia em foco entra
 * na ordem de Tab; as setas percorrem os dias.
 */

const MIN_DAY = '2020-01-01';
const MAX_AHEAD_DAYS = 365;
const NARROW_QUERY = '(max-width: 639px)';
const ANCHOR_GAP = 10;
const VIEWPORT_MARGIN = 16;

const WEEKDAYS = [
  { short: 'dom', long: 'domingo' },
  { short: 'seg', long: 'segunda-feira' },
  { short: 'ter', long: 'terça-feira' },
  { short: 'qua', long: 'quarta-feira' },
  { short: 'qui', long: 'quinta-feira' },
  { short: 'sex', long: 'sexta-feira' },
  { short: 'sáb', long: 'sábado' },
];

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ——————————————————————————— datas "AAAA-MM-DD" ——————————————————————————— */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const yearOf = (day) => Number(day.slice(0, 4));
const monthOf = (day) => Number(day.slice(5, 7)) - 1;
const dateOf = (day) => Number(day.slice(8, 10));
/** Mês corrido desde o ano 0: dá para somar e comparar meses como inteiros. */
const monthIdx = (day) => yearOf(day) * 12 + monthOf(day);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const weeksIn = (idx) => {
  const y = Math.floor(idx / 12);
  const m = idx % 12;
  return Math.ceil((new Date(y, m, 1).getDay() + daysInMonth(y, m)) / 7);
};
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const clampDay = (day, lo, hi) => (day < lo ? lo : day > hi ? hi : day);
const weekdayOf = (day) => atNoon(day).getDay();

function addDays(day, delta) {
  const d = atNoon(day);
  d.setDate(d.getDate() + delta);
  return isoDay(d);
}

/** Soma meses mantendo o dia do mês (31 de janeiro + 1 mês = 28/29 de fevereiro). */
function addMonths(day, delta) {
  const idx = monthIdx(day) + delta;
  const y = Math.floor(idx / 12);
  const m = idx % 12;
  return ymd(y, m, Math.min(dateOf(day), daysInMonth(y, m)));
}

/** "16 de outubro de 2026" — o nome acessível de cada dia. */
function dayLabel(day) {
  return `${dateOf(day)} de ${MONTH_NAMES[monthOf(day)]} de ${yearOf(day)}`;
}

/** Semanas que o mês ocupa; o painel reserva pelo menos 5 para não pular de altura a cada troca. */
const MIN_WEEKS = 5;

function buildMonth(idx, weeks = 6) {
  const y = Math.floor(idx / 12);
  const m = idx % 12;
  const lead = new Date(y, m, 1).getDay();
  const total = daysInMonth(y, m);
  const rows = [];
  for (let r = 0; r < weeks; r += 1) {
    const cells = [];
    for (let c = 0; c < 7; c += 1) {
      const n = r * 7 + c - lead + 1;
      cells.push(n >= 1 && n <= total ? { day: ymd(y, m, n), n, col: c, last: n === total } : null);
    }
    rows.push(cells);
  }
  return { idx, title: `${MONTH_NAMES[m]} de ${y}`, rows };
}

const cx = (...parts) => parts.filter(Boolean).join(' ');

function summaryOf(range) {
  const length = daysBetween(range);
  return `${pillDate(range.from)} → ${pillDate(range.to)} · ${length} ${length === 1 ? 'dia' : 'dias'}`;
}

/** Devolve o foco ao botão que abriu o painel (ou ao primeiro foco da barra). */
function focusAnchor(anchor) {
  if (!anchor) return;
  const target = anchor.matches?.(FOCUSABLE)
    ? anchor
    : anchor.querySelector('[aria-expanded="true"]') || anchor.querySelector(FOCUSABLE);
  target?.focus?.({ preventScroll: true });
}

function useNarrow() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return narrow;
}

/* ———————————————————————————————— componente ——————————————————————————————— */

export default function DateRangePopover({ open, ...props }) {
  if (!open) return null;
  // Montar de novo a cada abertura zera o rascunho: o estado nasce do `value`.
  return createPortal(<Popover {...props} />, document.body);
}

function Popover({ anchorRef, value, focusEdge = null, onChange, onClose }) {
  const titleId = useId();
  const rootRef = useRef(null);
  const focusRequest = useRef(true);
  const narrow = useNarrow();
  const count = narrow ? 1 : 2;

  const today = useMemo(() => isoDay(new Date()), []);
  const maxDay = useMemo(() => addDays(today, MAX_AHEAD_DAYS), [today]);
  const minIdx = monthIdx(MIN_DAY);
  const maxIdx = monthIdx(maxDay);

  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const [edge, setEdge] = useState(focusEdge);
  const [anchor, setAnchor] = useState(null);
  const [previewDay, setPreviewDay] = useState(null);
  const [focusDay, setFocusDay] = useState(() =>
    clampDay(focusEdge === 'to' ? value.to : value.from, MIN_DAY, maxDay));
  const [view, setView] = useState(() => initialView(focusEdge, value.from, value.to));

  /** Primeiro mês visível para a ponta em foco; a de fim fica no mês da direita. */
  function initialView(edgeName, from, to) {
    const fromIdx = monthIdx(clampDay(from, MIN_DAY, maxDay));
    const target = edgeName === 'to'
      ? Math.max(fromIdx, monthIdx(clampDay(to, MIN_DAY, maxDay)) - (count - 1))
      : fromIdx;
    return clamp(target, minIdx, Math.max(minIdx, maxIdx - (count - 1)));
  }

  // O dia em foco precisa estar sempre à vista: é a única parada de Tab da grade.
  const focusIdx = monthIdx(focusDay);
  const left = clamp(
    clamp(view, focusIdx - (count - 1), focusIdx),
    minIdx,
    Math.max(minIdx, maxIdx - (count - 1)),
  );
  const months = useMemo(() => {
    const idxs = Array.from({ length: count }, (_, i) => left + i);
    const weeks = Math.max(MIN_WEEKS, ...idxs.map(weeksIn));
    return idxs.map((idx) => buildMonth(idx, weeks));
  }, [left, count]);

  /* Recorte mostrado: a prévia segue o mouse (ou as setas) até o segundo clique. */
  let shown = draft;
  if (anchor) shown = customRange(anchor, previewDay ?? anchor);
  else if (edge === 'from' && previewDay) shown = customRange(previewDay, draft.to);
  else if (edge === 'to' && previewDay) shown = customRange(draft.from, previewDay);

  /* ——— posição: sob a âncora, alinhado à direita, dentro da janela ——— */
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const place = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const rect = anchorRef?.current?.getBoundingClientRect();
      const wantLeft = rect ? rect.right - w : vw - w - VIEWPORT_MARGIN;
      const wantTop = rect ? rect.bottom + ANCHOR_GAP : VIEWPORT_MARGIN;
      el.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(wantLeft, vw - w - VIEWPORT_MARGIN))}px`;
      el.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(wantTop, vh - h - VIEWPORT_MARGIN))}px`;
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(el);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      observer?.disconnect();
    };
  }, [anchorRef]);

  /* ——— Esc fecha e devolve o foco; clique fora fecha ——— */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      focusAnchor(anchorRef?.current);
    };
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      // Cliques na própria barra são da tela (trocar de ponta, fechar pelo botão).
      if (anchorRef?.current?.contains(event.target)) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [anchorRef, onClose]);

  /* ——— foco no dia da ponta ao abrir e a cada movimento de teclado ——— */
  useEffect(() => {
    if (!focusRequest.current) return;
    focusRequest.current = false;
    rootRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [focusDay, left, count]);

  /* ——— a tela trocou de pílula com o painel aberto: recomeça pela nova ponta ——— */
  const lastEdge = useRef(focusEdge);
  useEffect(() => {
    if (lastEdge.current === focusEdge) return;
    lastEdge.current = focusEdge;
    const target = clampDay(focusEdge === 'to' ? draft.to : draft.from, MIN_DAY, maxDay);
    setEdge(focusEdge);
    setAnchor(null);
    setPreviewDay(null);
    setFocusDay(target);
    setView(initialView(focusEdge, draft.from, draft.to));
    focusRequest.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEdge]);

  /* ——— ações ——— */
  const finish = () => {
    onClose?.();
    focusAnchor(anchorRef?.current);
  };

  const applyPreset = (preset) => {
    onChange?.(presetRange(preset));
    finish();
  };

  const apply = () => {
    const unchanged = draft.from === value.from && draft.to === value.to;
    // Sem mexer nas datas, o atalho de origem continua valendo (e a comparação com ele).
    onChange?.(unchanged && value.preset
      ? { from: value.from, to: value.to, preset: value.preset }
      : customRange(draft.from, draft.to));
    finish();
  };

  const select = (day) => {
    if (day < MIN_DAY || day > maxDay) return;
    setFocusDay(day);
    if (anchor) {
      const next = customRange(anchor, day);
      setDraft({ from: next.from, to: next.to });
      setAnchor(null);
      setEdge(null);
    } else if (edge === 'from' || edge === 'to') {
      const next = edge === 'from' ? customRange(day, draft.to) : customRange(draft.from, day);
      setDraft({ from: next.from, to: next.to });
      setEdge(null);
    } else {
      setAnchor(day);
      setDraft({ from: day, to: day });
    }
  };

  const moveTo = (day) => {
    const idx = monthIdx(day);
    focusRequest.current = true;
    setFocusDay(day);
    setPreviewDay(day);
    setView(clamp(left, idx - (count - 1), idx));
  };

  const shiftMonths = (delta) => {
    const nextLeft = left + delta;
    if (nextLeft < minIdx || nextLeft + count - 1 > maxIdx) return;
    setView(nextLeft);
    // Se o dia em foco saiu da vista, a parada de Tab vai junto.
    if (focusIdx < nextLeft) setFocusDay(clampDay(addMonths(focusDay, nextLeft - focusIdx), MIN_DAY, maxDay));
    else if (focusIdx > nextLeft + count - 1) {
      setFocusDay(clampDay(addMonths(focusDay, nextLeft + count - 1 - focusIdx), MIN_DAY, maxDay));
    }
  };

  const onGridKeyDown = (event) => {
    const day = event.target?.dataset?.day;
    if (!day || event.altKey || event.ctrlKey || event.metaKey) return;
    let next;
    switch (event.key) {
      case 'ArrowLeft': next = addDays(day, -1); break;
      case 'ArrowRight': next = addDays(day, 1); break;
      case 'ArrowUp': next = addDays(day, -7); break;
      case 'ArrowDown': next = addDays(day, 7); break;
      case 'PageUp': next = addMonths(day, event.shiftKey ? -12 : -1); break;
      case 'PageDown': next = addMonths(day, event.shiftKey ? 12 : 1); break;
      case 'Home': next = addDays(day, -weekdayOf(day)); break;
      case 'End': next = addDays(day, 6 - weekdayOf(day)); break;
      default: return;
    }
    event.preventDefault();
    moveTo(clampDay(next, MIN_DAY, maxDay));
  };

  /** Tab fica dentro do painel: volta ao primeiro depois do último, e vice-versa. */
  const onRootKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const items = Array.from(rootRef.current?.querySelectorAll(FOCUSABLE) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const canPrev = left > minIdx;
  const canNext = left + count - 1 < maxIdx;
  const liveText = anchor
    ? `Início em ${pillDate(anchor)}. Escolha o fim do intervalo.`
    : `Período: ${summaryOf(draft)}`;

  return (
    <div
      ref={rootRef}
      className="rp-date"
      role="dialog"
      aria-label="Escolher período"
      onKeyDown={onRootKeyDown}
    >
      <div className="rp-date__body">
        <div className="rp-date__presets" role="group" aria-label="Atalhos de período">
          {PRESETS.map((preset) => {
            const active = value.preset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                className={cx('rp-date__preset', active && 'is-active')}
                aria-pressed={active}
                onClick={() => applyPreset(preset.value)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div
          className="rp-date__months"
          onKeyDown={onGridKeyDown}
          onPointerLeave={() => setPreviewDay(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setPreviewDay(null);
          }}
        >
          {/* Chave por posição: os botões de mês mantêm o foco quando o mês troca. */}
          {months.map((month, i) => (
            <div className="rp-date__month" key={i}>
              <div className="rp-date__month-head">
                {i === 0 ? (
                  <button
                    type="button"
                    className="rp-date__nav"
                    aria-label="Mês anterior"
                    aria-disabled={!canPrev || undefined}
                    onClick={() => shiftMonths(-1)}
                  >
                    <Icon name="chevron-left" size={18} />
                  </button>
                ) : <span className="rp-date__nav-gap" aria-hidden="true" />}
                <div className="rp-date__month-title" id={`${titleId}-${i}`}>{month.title}</div>
                {i === count - 1 ? (
                  <button
                    type="button"
                    className="rp-date__nav"
                    aria-label="Próximo mês"
                    aria-disabled={!canNext || undefined}
                    onClick={() => shiftMonths(1)}
                  >
                    <Icon name="chevron-right" size={18} />
                  </button>
                ) : <span className="rp-date__nav-gap" aria-hidden="true" />}
              </div>

              <div role="grid" aria-labelledby={`${titleId}-${i}`} className="rp-date__grid">
                <div role="row" className="rp-date__weekdays">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday.short} role="columnheader" aria-label={weekday.long} className="rp-date__weekday">
                      {weekday.short}
                    </span>
                  ))}
                </div>
                {month.rows.map((row, r) => (
                  <div
                    role="row"
                    className="rp-date__week"
                    key={r}
                    aria-hidden={row.every((cell) => !cell) || undefined}
                  >
                    {row.map((cell, c) => {
                      if (!cell) return <span key={c} role="presentation" className="rp-date__blank" />;
                      const { day } = cell;
                      const disabled = day < MIN_DAY || day > maxDay;
                      const isStart = day === shown.from;
                      const isEnd = day === shown.to;
                      const inside = day > shown.from && day < shown.to;
                      const selected = day >= shown.from && day <= shown.to;
                      const spans = shown.from !== shown.to;
                      const band = inside || (spans && (isStart || isEnd));
                      return (
                        <button
                          key={day}
                          type="button"
                          role="gridcell"
                          className={cx(
                            'rp-date__day',
                            (isStart || isEnd) && 'is-edge',
                            band && 'is-band',
                            spans && isStart && 'is-band-start',
                            spans && isEnd && 'is-band-end',
                            band && (cell.col === 0 || cell.n === 1) && 'is-row-start',
                            band && (cell.col === 6 || cell.last) && 'is-row-end',
                            day === today && 'is-today',
                            disabled && 'is-disabled',
                          )}
                          data-day={day}
                          tabIndex={day === focusDay ? 0 : -1}
                          aria-selected={selected}
                          aria-disabled={disabled || undefined}
                          aria-current={day === today ? 'date' : undefined}
                          aria-label={dayLabel(day)}
                          onClick={() => select(day)}
                          onMouseEnter={() => { if (!disabled) setPreviewDay(day); }}
                        >
                          <span className="rp-date__dot">{cell.n}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rp-date__footer">
        <p className="rp-date__summary">{summaryOf(shown)}</p>
        <span className="rp-date__sr" role="status">{liveText}</span>
        <div className="rp-date__actions">
          <button type="button" className="rp-date__btn rp-date__btn--ghost" onClick={finish}>
            Cancelar
          </button>
          <button type="button" className="rp-date__btn rp-date__btn--primary" onClick={apply}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
