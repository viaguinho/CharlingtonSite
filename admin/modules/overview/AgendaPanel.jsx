import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE,
  APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS,
} from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { localDay } from '../../core/periods.js';
import { displayStatus, stateOf, isLate, isUnresolved, hasActiveConsent, DERIVED_STATE_LABELS } from '../../core/appointments.js';
import { Card, EmptyState } from '../../components/Card.jsx';
import { Button, IconButton, Chip, Avatar } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import Icon from '../../components/Icon.jsx';
import { age, duration, isoDay, time } from '../../core/format.js';
import { AppointmentDetail, BookingSheet, NoTeleConsent, ATENDIMENTO_ROOM } from '../agenda/AgendaScreen.jsx';
import RescheduleDialog from '../agenda/RescheduleDialog.jsx';
import { useRescheduleDrag } from '../agenda/useRescheduleDrag.js';

/**
 * Agenda da Visão geral.
 *
 * Um gerenciador de agenda no espaço do antigo card "Sua agenda de hoje": dia,
 * semana, mês e lista do mesmo dado, com busca, filtros e remarcação por
 * arrastar. Não é uma segunda agenda: abrir uma consulta mostra o mesmo painel
 * de detalhe da Agenda (avançar o atendimento, cancelar, prontuário), "Novo"
 * abre a mesma folha de agendamento, e toda gravação recarrega a Visão geral
 * inteira — os KPIs e as pendências ao lado falam do mesmo registro.
 *
 * A cor da consulta é o estado dela, nos tons da Agenda; o tipo de atendimento
 * é texto. O sistema não tem cor decorativa para categoria.
 */

const VIEWS = [
  { value: 'dia', label: 'Dia', icon: 'clock' },
  { value: 'semana', label: 'Semana', icon: 'grid' },
  { value: 'mes', label: 'Mês', icon: 'calendar' },
  { value: 'lista', label: 'Lista', icon: 'list' },
];
// A Agenda não tem vista de mês: o mês dela é a Lista.
const AGENDA_VIEW = { dia: 'dia', semana: 'semana', mes: 'lista', lista: 'lista' };
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_HOURS = { from: 7, to: 19 };

/* Situação = a chave que toda tela usa (stateOf), na ordem de trabalho. */
const STATE_OPTIONS = [
  { value: 'sem_desfecho', label: DERIVED_STATE_LABELS.sem_desfecho, tone: 'danger' },
  { value: 'atrasado', label: DERIVED_STATE_LABELS.atrasado, tone: 'danger' },
  { value: APPOINTMENT_STATUS.SCHEDULED, label: 'Agendado, sem confirmação' },
  { value: APPOINTMENT_STATUS.CONFIRMED, label: APPOINTMENT_STATUS_LABELS.confirmado },
  { value: APPOINTMENT_STATUS.CHECKED_IN, label: 'Aguardando na recepção' },
  { value: APPOINTMENT_STATUS.IN_PROGRESS, label: APPOINTMENT_STATUS_LABELS.em_atendimento },
  { value: APPOINTMENT_STATUS.DONE, label: APPOINTMENT_STATUS_LABELS.concluido },
  { value: APPOINTMENT_STATUS.NO_SHOW, label: APPOINTMENT_STATUS_LABELS.faltou },
  { value: APPOINTMENT_STATUS.CANCELLED, label: APPOINTMENT_STATUS_LABELS.cancelado },
  { value: 'evento', label: DERIVED_STATE_LABELS.evento, tone: 'event' },
].map((o) => ({ ...o, tone: o.tone ?? APPOINTMENT_STATUS_TONE[o.value] }));

const TYPE_OPTIONS = Object.values(APPOINTMENT_TYPES).map((t) => ({ value: t, label: APPOINTMENT_TYPE_LABELS[t] }));

/* Sinais = o que o componente de referência chamava de etiqueta (tag): marcas do registro que
   mudam o que se faz com a consulta. */
const SIGNAL_OPTIONS = [
  { value: 'registro', label: 'Registro pendente', hint: 'atrasada ou sem desfecho' },
  { value: 'tele', label: 'Teleconsulta sem consentimento' },
  { value: 'sensorial', label: 'Perfil sensorial registrado' },
  { value: 'obs', label: 'Com observações' },
];

const pad = (n) => String(n).padStart(2, '0');
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDay(d); };
const shortDay = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekdayLong = (iso) => {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const monthLabel = (iso) => {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const isEvent = (a) => a.tipo === APPOINTMENT_TYPES.EVENT || !!a.titulo;

export default function AgendaPanel({ appointments, patients, rooms = [], consents = [], confirmations, onChanged }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const canWrite = !!can?.write?.('agenda');
  const today = isoDay();

  const [view, setView] = useState('dia');
  const [anchor, setAnchor] = useState(today);
  const [query, setQuery] = useState('');
  const [states, setStates] = useState([]);
  const [types, setTypes] = useState([]);
  const [signals, setSignals] = useState([]);
  const [detail, setDetail] = useState(null);
  const [booking, setBooking] = useState(null);
  const [hover, setHover] = useState(null);       // { appointment, rect }
  // Arrastar a pílula só propõe o horário; o diálogo de remarcação é quem grava.
  const { dragging, dropKey, move, setMove, canMove, dragProps, dropProps } = useRescheduleDrag({
    canWrite,
    onDragStart: () => closeHover(),
  });

  const patientOf = useCallback((id) => patients.find((p) => p.id === id), [patients]);
  const nameOf = (a) => a.titulo || patientOf(a.pacienteId)?.nomeSocial || patientOf(a.pacienteId)?.nome || 'Paciente não vinculado';
  const lacksTeleConsent = useCallback(
    (a) => a.tipo === APPOINTMENT_TYPES.TELE && !hasActiveConsent(consents, 'teleconsulta', a.pacienteId),
    [consents],
  );
  // A grade da Agenda tem uma sala só; a folha de agendamento também.
  const atendimento = rooms.find((r) => r.nome === ATENDIMENTO_ROOM);
  const bookingRooms = atendimento ? [atendimento] : rooms;

  /* ——— Período na tela ——— */
  const period = useMemo(() => {
    if (view === 'dia') return { from: anchor, to: anchor, days: [anchor] };
    if (view === 'lista') {
      const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
      return { from: days[0], to: days[6], days };
    }
    if (view === 'semana') {
      const start = addDays(anchor, -new Date(`${anchor}T12:00:00`).getDay());
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { from: days[0], to: days[6], days };
    }
    // Mês: semanas completas de domingo a sábado, como no componente de referência.
    const first = `${anchor.slice(0, 7)}-01`;
    const last = (() => { const d = new Date(`${first}T12:00:00`); d.setMonth(d.getMonth() + 1, 0); return isoDay(d); })();
    const start = addDays(first, -new Date(`${first}T12:00:00`).getDay());
    const end = addDays(last, 6 - new Date(`${last}T12:00:00`).getDay());
    const days = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return { from: first, to: last, days, gridFrom: start, gridTo: end };
  }, [view, anchor]);

  function shift(direction) {
    if (view === 'dia') setAnchor(addDays(anchor, direction));
    else if (view === 'semana' || view === 'lista') setAnchor(addDays(anchor, 7 * direction));
    else { const d = new Date(`${anchor.slice(0, 7)}-01T12:00:00`); d.setMonth(d.getMonth() + direction); setAnchor(isoDay(d)); }
  }

  const showsToday = today >= (period.gridFrom ?? period.from) && today <= (period.gridTo ?? period.to)
    && (view !== 'mes' || today.slice(0, 7) === anchor.slice(0, 7));

  const periodLabel = view === 'dia'
    ? `${anchor === today ? 'Hoje, ' : anchor === addDays(today, 1) ? 'Amanhã, ' : ''}${anchor === today || anchor === addDays(today, 1) ? weekdayLong(anchor).toLowerCase() : weekdayLong(anchor)} ${shortDay(anchor)}${anchor.slice(0, 4) !== today.slice(0, 4) ? `/${anchor.slice(0, 4)}` : ''}`
    : view === 'semana' ? `Semana de ${shortDay(period.from)} a ${shortDay(period.to)}`
    : view === 'mes' ? monthLabel(anchor)
    : `${shortDay(period.from)} a ${shortDay(period.to)}`;

  /* ——— Filtros ——— */
  const signalsOf = useCallback((a) => {
    const out = [];
    if (isLate(a) || isUnresolved(a)) out.push('registro');
    if (lacksTeleConsent(a)) out.push('tele');
    if (patientOf(a.pacienteId)?.perfilSensorial?.gatilhos) out.push('sensorial');
    if (a.observacoes) out.push('obs');
    return out;
  }, [lacksTeleConsent, patientOf]);

  const inPeriod = useMemo(() => {
    const from = period.gridFrom ?? period.from;
    const to = period.gridTo ?? period.to;
    return appointments
      .filter((a) => { const d = localDay(a.inicio); return d && d >= from && d <= to; })
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''));
  }, [appointments, period]);

  const needle = query.trim().toLocaleLowerCase('pt-BR');
  const matches = useCallback((a) => {
    if (needle) {
      const p = patientOf(a.pacienteId);
      const hay = [a.titulo, p?.nome, p?.nomeSocial, APPOINTMENT_TYPE_LABELS[a.tipo],
        displayStatus(a, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE).label, a.observacoes]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      if (!hay.includes(needle)) return false;
    }
    // Cancelada só aparece quando o filtro pede: a contagem do dia nunca a inclui.
    if (states.length ? !states.includes(stateOf(a)) : a.status === APPOINTMENT_STATUS.CANCELLED) return false;
    if (types.length && !types.includes(a.tipo)) return false;
    if (signals.length && !signalsOf(a).some((s) => signals.includes(s))) return false;
    return true;
  }, [needle, states, types, signals, patientOf, signalsOf]);

  const shown = useMemo(() => inPeriod.filter(matches), [inPeriod, matches]);
  const onDay = useCallback((day) => shown.filter((a) => localDay(a.inicio) === day), [shown]);
  const filtering = !!(needle || states.length || types.length || signals.length);
  const clearFilters = () => { setQuery(''); setStates([]); setTypes([]); setSignals([]); };

  // Contagens dos filtros: o recorte da tela (só o mês, na vista Mês), antes de filtrar.
  const counted = useMemo(
    () => inPeriod.filter((a) => { const d = localDay(a.inicio); return d >= period.from && d <= period.to; }),
    [inPeriod, period],
  );
  const countBy = (fn) => (value) => counted.filter((a) => fn(a, value)).length;

  const strictlyInPeriod = shown.filter((a) => { const d = localDay(a.inicio); return d >= period.from && d <= period.to; });
  const total = counted.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED).length;
  const cancelled = counted.length - total;
  const scope = view === 'dia' ? (anchor === today ? 'hoje' : 'no dia') : view === 'mes' ? 'no mês' : view === 'semana' ? 'na semana' : 'nos 7 dias';
  const subtitle = filtering
    ? `${plural(strictlyInPeriod.length, 'atendimento', 'atendimentos')} de ${total} ${scope} com os filtros`
    : total
      ? [`${plural(total, 'atendimento programado', 'atendimentos programados')} ${scope}`,
        cancelled ? `fora ${plural(cancelled, 'cancelada', 'canceladas')}` : null].filter(Boolean).join(' · ')
      : `Nenhum atendimento ${scope}${cancelled ? ` · ${plural(cancelled, 'cancelada', 'canceladas')}` : ''}`;

  /* ——— Cartão flutuante ——— */
  const hoverTimer = useRef(null);
  const openHover = (appointment, el) => {
    if (dragging) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHover({ appointment, rect: el.getBoundingClientRect() }), 260);
  };
  const closeHover = () => { clearTimeout(hoverTimer.current); setHover(null); };
  useEffect(() => {
    if (!hover) return undefined;
    const close = () => setHover(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [hover]);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  /* ——— Ações ——— */
  const openDay = (day) => { setAnchor(day); setView('dia'); };
  const openAgenda = () => navigate(`/agenda?vista=${AGENDA_VIEW[view]}&dia=${view === 'mes' ? `${anchor.slice(0, 7)}-01` : anchor}`);
  const book = (day, hour) => setBooking({ date: day, hour, roomId: atendimento?.id ?? null });

  const eventProps = (a) => ({
    onClick: () => { closeHover(); setDetail(a); },
    onMouseEnter: (e) => openHover(a, e.currentTarget),
    onMouseLeave: closeHover,
    onFocus: (e) => openHover(a, e.currentTarget),
    onBlur: closeHover,
    ...dragProps(a),
  });

  const ctx = { today, patientOf, nameOf, lacksTeleConsent, eventProps, dropProps, dropKey, canWrite, openDay, book, dragging, canMove };

  return (
    <NoTeleConsent.Provider value={lacksTeleConsent}>
      <Card span={7} rows={2} className="agenda-panel" style={{ alignSelf: 'start' }}>
        <header className="agenda-panel__head">
          <div className="card__heading">
            <h3 className="card__title">{anchor === today && view === 'dia' ? 'Sua agenda de hoje' : 'Sua agenda'}</h3>
            <p className="card__subtitle">{subtitle}</p>
          </div>
          <div className="agenda-panel__tools">
            {canWrite ? (
              <Button size="sm" variant="primary" icon="plus"
                // Hoje, a folha já abre na próxima hora cheia, não às 09:00 que já passaram.
                onClick={() => (anchor > today ? book(anchor) : book(today, Math.min(DAY_HOURS.to, new Date().getHours() + 1)))}>
                Novo agendamento
              </Button>
            ) : null}
            <IconButton name="arrow-up-right" label="Abrir na Agenda" shape="circle" size="sm" onClick={openAgenda} />
          </div>
        </header>

        <div className="agenda-panel__bar">
          <div className="agenda-panel__nav">
            <IconButton name="chevron-left" label="Período anterior" variant="surface" size="sm" onClick={() => shift(-1)} />
            <Button size="sm" onClick={() => setAnchor(today)} disabled={showsToday && (view !== 'dia' || anchor === today)}>Hoje</Button>
            <IconButton name="chevron-right" label="Próximo período" variant="surface" size="sm" onClick={() => shift(1)} />
            <span className="agenda-panel__period" aria-live="polite">{periodLabel}</span>
          </div>
          <Tabs variant="segment" value={view} onChange={(v) => { closeHover(); setView(v); }} ariaLabel="Modo de visualização" items={VIEWS} />
        </div>

        <div className="agenda-panel__filters">
          <label className="agenda-panel__search">
            <Icon name="search" size={15} />
            <span className="sr-only">Buscar na agenda</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente, tipo ou situação"
            />
            {query ? <IconButton name="x" label="Limpar busca" size="sm" onClick={() => setQuery('')} /> : null}
          </label>
          <FilterMenu label="Situação" options={STATE_OPTIONS} value={states} onChange={setStates}
            count={countBy((a, v) => stateOf(a) === v)} swatch />
          <FilterMenu label="Tipo" options={TYPE_OPTIONS} value={types} onChange={setTypes}
            count={countBy((a, v) => a.tipo === v)} />
          <FilterMenu label="Sinais" options={SIGNAL_OPTIONS} value={signals} onChange={setSignals}
            count={countBy((a, v) => signalsOf(a).includes(v))} />
          {filtering ? <Button size="sm" variant="ghost" icon="x" onClick={clearFilters}>Limpar</Button> : null}
        </div>

        {states.length || types.length || signals.length ? (
          <div className="agenda-panel__active" aria-label="Filtros ativos">
            {[
              ...states.map((v) => ({ v, set: setStates, opt: STATE_OPTIONS.find((o) => o.value === v) })),
              ...types.map((v) => ({ v, set: setTypes, opt: TYPE_OPTIONS.find((o) => o.value === v) })),
              ...signals.map((v) => ({ v, set: setSignals, opt: SIGNAL_OPTIONS.find((o) => o.value === v) })),
            ].map(({ v, set, opt }) => (
              <span key={v} className="agenda-panel__tag">
                {opt.tone ? <span className={`agenda-swatch agenda-swatch--${opt.tone}`} aria-hidden="true" /> : null}
                {opt.label}
                <button type="button" aria-label={`Remover filtro ${opt.label}`} onClick={() => set((list) => list.filter((x) => x !== v))}>
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className={`agenda-panel__view agenda-panel__view--${view}${dragging ? ' is-dragging' : ''}`}>
          {view === 'dia' ? <DayView day={anchor} items={onDay(anchor)} ctx={ctx} filtering={filtering} onClear={clearFilters} /> : null}
          {view === 'semana' ? <WeekView days={period.days} onDay={onDay} ctx={ctx} /> : null}
          {view === 'mes' ? <MonthView days={period.days} month={anchor.slice(0, 7)} onDay={onDay} ctx={ctx} /> : null}
          {view === 'lista' ? <ListView days={period.days} onDay={onDay} ctx={ctx} filtering={filtering} onClear={clearFilters} /> : null}
        </div>

        {/* Os próximos 7 dias saíram da lista fixa: viram uma linha que leva à vista
            Lista, na MESMA janela do card Confirmações (de amanhã a hoje + 7). */}
        {view === 'dia' && confirmations?.total ? (
          <button type="button" className="agenda-panel__next" onClick={() => { setAnchor(confirmations.range.from); setView('lista'); }}>
            <span>
              <strong>Próximos 7 dias</strong>
              <span className="muted"> · {shortDay(confirmations.range.from)} a {shortDay(confirmations.range.to)}</span>
            </span>
            <span className="num">
              {plural(confirmations.total, 'consulta', 'consultas')}
              {confirmations.unconfirmed ? <span className="agenda-panel__warn"> · {confirmations.unconfirmed} sem confirmação</span> : null}
            </span>
            <Icon name="chevron-right" size={14} />
          </button>
        ) : null}
      </Card>

      {hover && !detail ? (
        <HoverCard
          appointment={hover.appointment}
          rect={hover.rect}
          patient={patientOf(hover.appointment.pacienteId)}
          room={rooms.find((r) => r.id === hover.appointment.salaId)}
          noConsent={lacksTeleConsent(hover.appointment)}
          movable={canMove(hover.appointment)}
        />
      ) : null}

      <AppointmentDetail
        appointment={detail}
        patient={patientOf(detail?.pacienteId)}
        room={rooms.find((r) => r.id === detail?.salaId)}
        hasTeleConsent={detail ? hasActiveConsent(consents, 'teleconsulta', detail.pacienteId) : false}
        onClose={() => setDetail(null)}
        onChanged={() => { setDetail(null); onChanged?.(); }}
      />

      <BookingSheet
        request={booking}
        patients={patients}
        rooms={bookingRooms}
        onClose={() => setBooking(null)}
        onSaved={() => { setBooking(null); onChanged?.(); }}
      />

      {/* O arrastar só propõe o horário; quem grava é o mesmo diálogo de remarcação
          do restante do painel (choque de horário, motivo, auditoria). */}
      <RescheduleDialog
        appointment={move?.appointment ?? null}
        suggested={move?.start ?? null}
        onClose={() => setMove(null)}
        onDone={() => { setMove(null); onChanged?.(); }}
      />
    </NoTeleConsent.Provider>
  );
}

/* ═══════════════════════════ Filtro em menu ═══════════════════════════ */

function FilterMenu({ label, options, value, onChange, count, swatch = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="agenda-filter" ref={ref}>
      <button
        type="button"
        className={`btn btn--secondary btn--sm agenda-filter__trigger${value.length ? ' is-active' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="filter" size={14} />
        <span className="btn__label">{label}</span>
        {value.length ? <span className="tabs__count num">{value.length}</span> : null}
        <Icon name="chevron-down" size={13} />
      </button>
      {open ? (
        <div className="agenda-filter__menu" role="group" aria-label={`Filtrar por ${label.toLowerCase()}`}>
          <p className="agenda-filter__title">Filtrar por {label.toLowerCase()}</p>
          {options.map((o) => {
            const n = count(o.value);
            const on = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                className={`agenda-filter__item${on ? ' is-on' : ''}`}
                onClick={() => toggle(o.value)}
              >
                <span className="agenda-filter__check" aria-hidden="true">{on ? <Icon name="check" size={12} stroke={2} /> : null}</span>
                {swatch ? <span className={`agenda-swatch agenda-swatch--${o.tone}`} aria-hidden="true" /> : null}
                <span className="agenda-filter__label">
                  {o.label}
                  {o.hint ? <span>{o.hint}</span> : null}
                </span>
                <span className="agenda-filter__count num">{n}</span>
              </button>
            );
          })}
          {value.length ? (
            <button type="button" className="agenda-filter__clear" onClick={() => onChange([])}>Limpar {label.toLowerCase()}</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════ Consulta ═══════════════════════════ */

function EventItem({ appointment: a, ctx, variant = 'detailed' }) {
  const shown = displayStatus(a, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
  const patient = ctx.patientOf(a.pacienteId);
  const event = isEvent(a);
  const tone = event ? 'event' : shown.tone;
  const end = a.fim ? time(a.fim) : null;
  const flags = (
    <>
      {ctx.lacksTeleConsent(a) && a.status !== APPOINTMENT_STATUS.CANCELLED
        ? <Icon name="video" size={13} className="agenda-event__flag" title="Teleconsulta sem consentimento" /> : null}
      {patient?.perfilSensorial?.gatilhos ? <Icon name="heart-pulse" size={13} className="agenda-event__sense" title="Perfil sensorial registrado" /> : null}
    </>
  );
  const cls = `agenda-event agenda-event--${variant} agenda-event--${tone}${shown.late || shown.unresolved ? ' is-pending-record' : ''}${ctx.dragging?.id === a.id ? ' is-dragged' : ''}${ctx.canMove(a) ? ' is-movable' : ''}`;
  const label = `${time(a.inicio)}${end ? `–${end}` : ''} · ${ctx.nameOf(a)} · ${event ? 'Evento interno' : APPOINTMENT_TYPE_LABELS[a.tipo]} · ${shown.label}`;

  if (variant === 'compact') {
    return (
      <button type="button" className={cls} aria-label={label} {...ctx.eventProps(a)}>
        <span className="agenda-event__time num">{time(a.inicio)}</span>
        <span className="agenda-event__name">{ctx.nameOf(a)}</span>
        {flags}
      </button>
    );
  }

  return (
    <button type="button" className={cls} aria-label={label} {...ctx.eventProps(a)}>
      {event ? <span className="agenda-event__icon"><Icon name="calendar" size={14} /></span> : <Avatar name={patient?.nome} src={patient?.foto} size={30} />}
      <span className="agenda-event__text">
        <strong>{ctx.nameOf(a)}</strong>
        <span>
          <span className="num">{time(a.inicio)}{end ? `–${end}` : ''}</span>
          {' · '}
          {event ? 'Evento interno' : [patient?.dataNascimento ? age(patient.dataNascimento).label : null, APPOINTMENT_TYPE_LABELS[a.tipo]].filter(Boolean).join(' · ')}
        </span>
      </span>
      {flags}
      <Chip tone={shown.tone} icon={shown.icon}>{shown.label}</Chip>
    </button>
  );
}

/* ═══════════════════════════ Vista Dia ═══════════════════════════ */

function DayView({ day, items, ctx, filtering, onClear }) {
  const scroller = useRef(null);
  const hours = useMemo(() => {
    const hs = items.map((a) => new Date(a.inicio).getHours());
    const from = Math.min(DAY_HOURS.from, ...hs);
    const to = Math.max(DAY_HOURS.to, ...hs);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [items]);
  const nowHour = day === ctx.today ? new Date().getHours() : null;
  const past = day < ctx.today;

  // Abre na primeira consulta (ou na hora atual, hoje), não sempre às 07:00.
  useEffect(() => {
    const target = items.length ? new Date(items[0].inicio).getHours() : nowHour ?? DAY_HOURS.from;
    const row = scroller.current?.querySelector(`[data-hour="${target}"]`);
    if (row) scroller.current.scrollTop = Math.max(0, row.offsetTop - scroller.current.querySelector('.agenda-day__rows').offsetTop - 8);
  }, [day]);

  return (
    <div className="agenda-day" ref={scroller}>
      {!items.length ? (
        <p className="agenda-day__empty" role="status">
          <Icon name={filtering ? 'filter' : 'calendar'} size={14} />
          <span>
            <strong>{filtering ? 'Nenhuma consulta com esses filtros.' : day === ctx.today ? 'Nenhum atendimento hoje.' : 'Nenhum atendimento neste dia.'}</strong>
            {!filtering && !past && ctx.canWrite ? ' Clique numa faixa de horário para agendar.' : ''}
          </span>
          {filtering ? <Button size="sm" variant="ghost" onClick={onClear}>Limpar filtros</Button> : null}
        </p>
      ) : null}
      <ol className="agenda-day__rows">
        {hours.map((hour) => {
          const list = items.filter((a) => new Date(a.inicio).getHours() === hour);
          const key = `${day}-${hour}`;
          return (
            <li
              key={hour}
              data-hour={hour}
              className={`agenda-day__row${hour === nowHour ? ' is-now' : ''}${ctx.dropKey === key ? ' is-drop' : ''}`}
              {...ctx.dropProps(key, day, hour)}
            >
              <span className="agenda-day__hour num">{pad(hour)}:00</span>
              <div className="agenda-day__slot">
                {list.map((a) => <EventItem key={a.id} appointment={a} ctx={ctx} />)}
                {!list.length && ctx.canWrite && !past && !(day === ctx.today && hour < nowHour) ? (
                  <button type="button" className="agenda-day__add" onClick={() => ctx.book(day, hour)}>
                    <Icon name="plus" size={13} /> Agendar às {pad(hour)}:00
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ═══════════════════════════ Vista Semana ═══════════════════════════ */

function WeekView({ days, onDay, ctx }) {
  return (
    <div className="agenda-week">
      {days.map((day) => {
        const list = onDay(day);
        const d = new Date(`${day}T12:00:00`);
        return (
          <section
            key={day}
            className={`agenda-week__day${day === ctx.today ? ' is-today' : ''}${day < ctx.today ? ' is-past' : ''}${ctx.dropKey === day ? ' is-drop' : ''}`}
            {...ctx.dropProps(day, day)}
          >
            <button type="button" className="agenda-week__head" onClick={() => ctx.openDay(day)} aria-label={`Abrir ${weekdayLong(day)}, ${shortDay(day)}`}>
              <span className="agenda-week__weekday">{WEEKDAYS[d.getDay()]}</span>
              <span className="agenda-week__num num">{d.getDate()}</span>
            </button>
            <div className="agenda-week__list">
              {list.slice(0, 5).map((a) => <EventItem key={a.id} appointment={a} ctx={ctx} variant="compact" />)}
              {list.length > 5 ? (
                <button type="button" className="agenda-more" onClick={() => ctx.openDay(day)}>+{list.length - 5} {list.length - 5 === 1 ? 'outra' : 'outras'}</button>
              ) : null}
              {!list.length ? <span className="agenda-week__empty">—</span> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ Vista Mês ═══════════════════════════ */

function MonthView({ days, month, onDay, ctx }) {
  const scroller = useRef(null);

  // Abre na semana de hoje (ou no começo do mês), não sempre na primeira linha.
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector(`[data-day="${ctx.today}"]`);
    const header = box?.querySelector('.agenda-month__weekday');
    box.scrollTop = cell && ctx.today.slice(0, 7) === month ? Math.max(0, cell.offsetTop - (header?.offsetHeight ?? 0)) : 0;
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="agenda-month" ref={scroller}>
      {WEEKDAYS.map((w) => <span key={w} className="agenda-month__weekday" aria-hidden="true">{w}</span>)}
      {days.map((day) => {
        const list = onDay(day);
        const outside = day.slice(0, 7) !== month;
        return (
          <div
            key={day}
            data-day={day}
            className={`agenda-month__cell${outside ? ' is-outside' : ''}${day === ctx.today ? ' is-today' : ''}${ctx.dropKey === day ? ' is-drop' : ''}`}
            {...ctx.dropProps(day, day)}
          >
            <button type="button" className="agenda-month__num num" onClick={() => ctx.openDay(day)}
              aria-label={`${weekdayLong(day)}, ${shortDay(day)}${list.length ? ` · ${plural(list.length, 'consulta', 'consultas')}` : ''}`}>
              {Number(day.slice(8))}
            </button>
            <div className="agenda-month__list">
              {list.slice(0, 2).map((a) => <EventItem key={a.id} appointment={a} ctx={ctx} variant="compact" />)}
              {list.length > 2 ? (
                <button type="button" className="agenda-more" onClick={() => ctx.openDay(day)}>+{list.length - 2}</button>
              ) : null}
            </div>
            {/* Celular: a célula não comporta nomes; fica a contagem. */}
            {list.length ? <span className="agenda-month__dot num" aria-hidden="true">{list.length}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ Vista Lista ═══════════════════════════ */

function ListView({ days, onDay, ctx, filtering, onClear }) {
  const groups = days.map((day) => [day, onDay(day)]).filter(([, list]) => list.length);
  if (!groups.length) {
    return (
      <EmptyState
        icon={filtering ? 'filter' : 'calendar'}
        title={filtering ? 'Nenhuma consulta com esses filtros' : 'Nada agendado nestes 7 dias'}
        action={filtering
          ? <Button size="sm" onClick={onClear}>Limpar filtros</Button>
          : ctx.canWrite ? <Button size="sm" icon="plus" onClick={() => ctx.book(days[0] >= ctx.today ? days[0] : ctx.today)}>Agendar</Button> : null}
        compact
      />
    );
  }
  return (
    <div className="agenda-list">
      {groups.map(([day, list]) => {
        const active = list.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED);
        const unconfirmed = active.filter((a) => a.status === APPOINTMENT_STATUS.SCHEDULED && !isEvent(a) && !isUnresolved(a)).length;
        return (
          <section key={day} className={`agenda-list__group${ctx.dropKey === day ? ' is-drop' : ''}`} {...ctx.dropProps(day, day)}>
            <button type="button" className="agenda-list__head" onClick={() => ctx.openDay(day)}>
              <span>{day === ctx.today ? 'Hoje, ' : ''}{day === ctx.today ? weekdayLong(day).toLowerCase() : weekdayLong(day)}, {shortDay(day)}</span>
              <span className="num">
                <strong>{plural(active.length, 'consulta', 'consultas')}</strong>
                {unconfirmed ? <span className="agenda-panel__warn"> · {unconfirmed} sem confirmação</span> : null}
              </span>
            </button>
            <div className="agenda-list__items">
              {list.map((a) => <EventItem key={a.id} appointment={a} ctx={ctx} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ Cartão flutuante ═══════════════════════════ */

function HoverCard({ appointment: a, rect, patient, room, noConsent, movable }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: rect.bottom + 6, left: rect.left, ready: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const gap = 8;
    const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - gap ? Math.max(gap, rect.top - height - 6) : below;
    setPos({ top, left, ready: true });
  }, [rect]);

  const shown = displayStatus(a, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
  const event = isEvent(a);
  const startMs = new Date(a.inicio).getTime();
  const minutes = a.fim ? Math.round((new Date(a.fim).getTime() - startMs) / 60000) : null;

  return createPortal(
    <div
      ref={ref}
      className={`agenda-hovercard${pos.ready ? ' is-ready' : ''}`}
      style={{ top: pos.top, left: pos.left }}
      role="tooltip"
    >
      <div className="agenda-hovercard__head">
        <strong>{a.titulo || patient?.nomeSocial || patient?.nome || 'Paciente não vinculado'}</strong>
        <Chip tone={event ? 'info' : shown.tone} icon={shown.icon}>{shown.label}</Chip>
      </div>
      <dl className="agenda-hovercard__facts">
        <div>
          <dt><Icon name="clock" size={13} /></dt>
          <dd className="num">
            {new Date(a.inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {time(a.inicio)}{a.fim ? `–${time(a.fim)}` : ''}
            {minutes ? <span className="muted"> ({duration(minutes)})</span> : null}
          </dd>
        </div>
        <div>
          <dt><Icon name={a.tipo === APPOINTMENT_TYPES.TELE ? 'video' : event ? 'calendar' : 'stethoscope'} size={13} /></dt>
          <dd>
            {event ? 'Evento / Reunião interna' : APPOINTMENT_TYPE_LABELS[a.tipo]}
            {patient?.dataNascimento ? <span className="muted"> · {age(patient.dataNascimento).label}</span> : null}
          </dd>
        </div>
        <div>
          <dt><Icon name="door" size={13} /></dt>
          <dd>{a.tipo === APPOINTMENT_TYPES.TELE ? 'Remoto, sem sala' : room?.nome ?? 'Sala não definida'}</dd>
        </div>
      </dl>
      {noConsent && a.status !== APPOINTMENT_STATUS.CANCELLED ? (
        <p className="agenda-hovercard__note agenda-hovercard__note--warning"><Icon name="video" size={13} /> Sem consentimento para teleconsulta</p>
      ) : null}
      {patient?.perfilSensorial?.gatilhos ? (
        <p className="agenda-hovercard__note"><Icon name="heart-pulse" size={13} /> {patient.perfilSensorial.gatilhos}</p>
      ) : null}
      {a.observacoes ? <p className="agenda-hovercard__obs">{a.observacoes}</p> : null}
      <p className="agenda-hovercard__hint">Clique para abrir{movable ? ' · arraste para remarcar' : ''}</p>
    </div>,
    document.body,
  );
}
