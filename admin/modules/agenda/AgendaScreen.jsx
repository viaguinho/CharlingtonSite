import { Fragment, useEffect, useMemo, useState, useCallback, createContext, useContext } from 'react';
import * as repo from '../../data/repository.js';
import { localDay } from '../../core/periods.js';
import { isLate, isUpcoming, isUnresolved, stateOf, displayStatus, hasActiveConsent, messagingOptIn } from '../../core/appointments.js';

/**
 * Crianças sem consentimento vigente para teleconsulta. Chega a cada vista da
 * agenda por contexto: o impedimento aparece no cartão, na linha e no detalhe,
 * onde a recepção confirma e faz a consulta.
 */
const NoTeleConsent = createContext(() => false);
const useNoTeleConsent = () => useContext(NoTeleConsent);
import { useNavigate } from 'react-router-dom';
import {
  STORES, APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE,
  APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS, newAppointment,
} from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip } from '../../components/Card.jsx';
import { Button, IconButton, Chip, Avatar, StatusDot } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Modal, Sheet, ConfirmDialog, useToast } from '../../components/Overlay.jsx';
import { Select, TextField, TextArea, Combobox, FieldRow } from '../../components/Field.jsx';
import { HeatGrid } from '../../charts/index.jsx';
import Icon from '../../components/Icon.jsx';
import { isoDay, time, date, dateLong, duration, age, money } from '../../core/format.js';

/**
 * Agenda e atendimento.
 *
 * Quatro vistas do mesmo dado. A vista de dia é a que a recepção deixa aberta
 * o expediente inteiro: colunas por sala, faixas de hora, e o estado de cada
 * consulta visível de longe — quem confirmou, quem chegou, quem está em
 * atendimento.
 */


const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);   // 07h às 19h
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AgendaScreen() {
  const { plaza, can } = useSession();
  const navigate = useNavigate();
  const toast = useToast();

  const [view, setView] = useState('dia');
  const [anchor, setAnchor] = useState(() => isoDay());
  const [data, setData] = useState({ appointments: [], patients: [], rooms: [], blocks: [] });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const where = plaza ? { praca: plaza } : {};
    const [appointments, patients, rooms, blocks, consents] = await Promise.all([
      repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
      repo.list(STORES.PATIENTS, { where }).catch(() => []),
      repo.list(STORES.ROOMS, { where }).catch(() => []),
      repo.list(STORES.BLOCKS, { where }).catch(() => []),
      repo.list(STORES.CONSENTS, {}).catch(() => []),
    ]);
    setData({ appointments, patients, rooms, blocks, consents });
    setLoading(false);
  }, [plaza]);

  useEffect(() => { load(); }, [load]);

  const dayAppointments = useMemo(
    () => data.appointments
      .filter((a) => localDay(a.inicio) === anchor)
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? '')),
    [data.appointments, anchor],
  );

  const weekDays = useMemo(() => {
    const base = new Date(`${anchor}T12:00:00`);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return isoDay(day);
    });
  }, [anchor]);

  const monthDays = useMemo(() => {
    const first = new Date(`${anchor.slice(0, 7)}-01T12:00:00`);
    const last = new Date(first);
    last.setMonth(first.getMonth() + 1, 0);
    return { from: isoDay(first), to: isoDay(last) };
  }, [anchor]);

  function shift(direction) {
    const next = new Date(`${anchor}T12:00:00`);
    if (view === 'dia') next.setDate(next.getDate() + direction);
    else if (view === 'semana') next.setDate(next.getDate() + 7 * direction);
    else next.setMonth(next.getMonth() + direction, 1);
    setAnchor(isoDay(next));
  }

  // A faixa de indicadores descreve o que está na tela. Antes ela ficava
  // presa no dia enquanto a lista mostrava o mês — e dizia "Faltas 0" em cima
  // de uma lista com sete faltas.
  const scope = view === 'dia' ? 'no dia' : view === 'semana' ? 'na semana' : 'no mês';
  const visible = useMemo(() => {
    if (view === 'dia') return dayAppointments;
    const [from, to] = view === 'semana' ? [weekDays[0], weekDays[6]] : [monthDays.from, monthDays.to];
    return data.appointments
      .filter((a) => { const d = localDay(a.inicio); return d && d >= from && d <= to; })
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''));
  }, [view, dayAppointments, data.appointments, weekDays, monthDays]);

  const stats = useMemo(() => ({
    total: visible.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED).length,
    // Confirmação só faz sentido para o que ainda vai acontecer: "19/90"
    // misturava consultas já concluídas no denominador.
    upcoming: visible.filter((a) => isUpcoming(a)).length,
    confirmed: visible.filter((a) => isUpcoming(a) && a.status === APPOINTMENT_STATUS.CONFIRMED).length,
    late: visible.filter((a) => isLate(a)).length,
    // Passou e ninguém registrou o desfecho: fora de "na recepção" e de "por
    // acontecer", contado à parte — assim as partes fecham o total.
    unresolved: visible.filter((a) => isUnresolved(a)).length,
    inProgress: visible.filter((a) => a.status === APPOINTMENT_STATUS.IN_PROGRESS && !isUnresolved(a)).length,
    waiting: visible.filter((a) => a.status === APPOINTMENT_STATUS.CHECKED_IN && !isUnresolved(a)).length,
    done: visible.filter((a) => a.status === APPOINTMENT_STATUS.DONE).length,
    noShow: visible.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW).length,
    cancelled: visible.filter((a) => a.status === APPOINTMENT_STATUS.CANCELLED).length,
  }), [visible]);
  const pendingRecords = useMemo(() => data.appointments.filter((a) => isUnresolved(a)), [data.appointments]);
  const lacksTeleConsent = useCallback(
    (a) => a.tipo === 'teleconsulta' && !hasActiveConsent(data.consents ?? [], 'teleconsulta', a.pacienteId),
    [data.consents],
  );
  const optIn = messagingOptIn(data.consents ?? []);

  return (
    <NoTeleConsent.Provider value={lacksTeleConsent}>
      <PageHeader
        eyebrow="Atendimento"
        title="Agenda"
        stacked
        description="Quem vem hoje e quem já chegou."
        toolbar={
          <>
            <div className="agenda-nav">
              <IconButton name="chevron-left" label="Período anterior" variant="surface"
                onClick={() => shift(-1)} />
              <button type="button" className="agenda-nav__label" onClick={() => setAnchor(isoDay())}>
                {view === 'dia' ? dateLong(anchor) : view === 'semana' ? `Semana de ${date(weekDays[0])}` : monthLabel(anchor)}
              </button>
              <IconButton name="chevron-right" label="Próximo período" variant="surface"
                onClick={() => shift(1)} />
            </div>
            <Tabs
              variant="segment"
              value={view}
              onChange={setView}
              ariaLabel="Modo de visualização"
              items={[
                { value: 'dia', label: 'Dia' },
                { value: 'semana', label: 'Semana' },
                { value: 'lista', label: 'Lista' },
                { value: 'ocupacao', label: 'Por horário' },
              ]}
            />
          </>
        }
        actions={
          can.write('agenda') ? (
            <Button variant="primary" icon="plus" onClick={() => setBooking({ date: anchor })}>
              Novo agendamento
            </Button>
          ) : null
        }
      />

      <MetricStrip loading={loading}>
        {/* A soma das partes fica escrita sob o total: por acontecer, atrasadas,
            na recepção, concluídas e faltas fecham o número grande. */}
        {/* O número grande é o que ainda vai acontecer no recorte: "21 na
            semana" somava passado e futuro e não respondia pergunta nenhuma.
            Recorte todo no passado: o total, com o que aconteceu. */}
        <Metric
          featured
          label={stats.upcoming ? `Por acontecer ${scope}` : `Consultas ${scope}`}
          value={stats.upcoming || stats.total}
          target={[
            stats.upcoming ? `de ${stats.total} ${scope === 'no dia' ? 'no dia' : scope === 'na semana' ? 'na semana' : `em ${monthLabel(anchor).split(' ')[0].toLowerCase()} (01 a ${monthDays.to.slice(8)})`}` : null,
            stats.late ? `${stats.late} ${stats.late === 1 ? 'atrasada' : 'atrasadas'}` : null,
            stats.unresolved ? `${stats.unresolved} sem desfecho` : null,
            stats.waiting ? `${stats.waiting} na recepção` : null,
            stats.inProgress ? `${stats.inProgress} em atendimento` : null,
            stats.done ? `${stats.done} ${stats.done === 1 ? 'concluída' : 'concluídas'}` : null,
            stats.noShow ? `${stats.noShow} ${stats.noShow === 1 ? 'falta' : 'faltas'}` : null,
            // A lista mostra os cancelados em "Todos"; o total aqui não. Dito,
            // 90 e 95 deixam de ser dois números para a mesma coisa.
            stats.cancelled ? `fora ${stats.cancelled} ${stats.cancelled === 1 ? 'cancelada' : 'canceladas'}` : null,
          ].filter(Boolean).join(' · ') || 'exceto canceladas'}
        />
        <Metric
          label="Confirmadas por acontecer"
          value={stats.upcoming ? stats.confirmed : '—'}
          denominator={stats.upcoming || null}
          // Num dia passado não há o que confirmar; a consulta ainda gravada como
          // "confirmada" é sem desfecho, e o rótulo diz isso em vez de "0".
          target={stats.upcoming
            ? `de ${stats.upcoming} por acontecer · ${stats.upcoming - stats.confirmed} sem confirmação`
            : (
              // Sem valor: o mesmo estado vazio de KPI de Operações (ícone + frase).
              <span className="metric__empty">
                <Icon name="calendar" size={13} />
                {stats.unresolved
                  ? `Nada por acontecer · ${stats.unresolved} sem desfecho (registro ainda "confirmado" ou "agendado")`
                  : 'Nada por acontecer'}
              </span>
            )}
        />
        <Metric label="Aguardando" value={stats.waiting} tone={stats.waiting ? 'warning' : undefined} />
        <Metric label="Concluídas" value={stats.done} />
        {/* Falta em número é neutro em toda tela; o vermelho é da marca de falta nos gráficos. */}
        <Metric label="Faltas" value={stats.noShow} />
      </MetricStrip>

      {/* Dois avisos, dois tons. Atraso sem chegada é erro de agora (vermelho);
          consulta sem confirmação é tarefa de rotina, no mesmo tom que tem em
          Relatórios. Juntos numa faixa vermelha, a rotina virava alarme. */}
      {/* Sem desfecho é contado na agenda INTEIRA, não só no recorte: no Dia de
          hoje o registro esquecido de ontem sumia do aviso. */}
      {stats.late || pendingRecords.length ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          <div className="ops-alert ops-alert--danger" role="status">
            <Icon name="alert-triangle" size={15} />
            <p>
              {stats.late ? <><strong>{stats.late} {stats.late === 1 ? 'consulta atrasada' : 'consultas atrasadas'} sem chegada.</strong>{' '}</> : null}
              {pendingRecords.length ? <><strong>{pendingRecords.length} {pendingRecords.length === 1 ? 'consulta que já passou está' : 'consultas que já passaram estão'} sem desfecho registrado.</strong>{' '}</> : null}
              Registre chegada, atendimento ou falta.
            </p>
            {(() => {
              // Leva ao dia do registro que falta: o sem desfecho mais antigo, ou hoje.
              const first = [...pendingRecords, ...visible.filter((x) => isLate(x))].sort((x, y) => x.inicio.localeCompare(y.inicio))[0];
              const day = first ? localDay(first.inicio) : isoDay();
              // Já estando nesse dia, o botão levaria para onde o leitor está.
              if (view === 'dia' && day === anchor) return null;
              return (
                <Button size="sm" onClick={() => { setAnchor(day); setView('dia'); }}>
                  {day === isoDay() ? 'Ver hoje' : `Ver ${new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                </Button>
              );
            })()}
          </div>
        </>
      ) : null}
      {stats.upcoming - stats.confirmed ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          <div className="ops-alert" role="status">
            <Icon name="message-circle" size={15} />
            <p>
              <strong>{stats.upcoming - stats.confirmed} {stats.upcoming - stats.confirmed === 1 ? 'consulta ainda sem confirmação' : 'consultas ainda sem confirmação'}</strong> {scope}.
              {optIn ? '' : ' Nenhuma família com consentimento para mensagens: registre o opt-in antes de pedir confirmação.'}
            </p>
            <Button size="sm" onClick={() => navigate('/comunicacao')}>{optIn ? 'Pedir confirmação' : 'Registrar consentimento'}</Button>
          </div>
        </>
      ) : null}

      <div style={{ height: 'var(--gutter)' }} />

      {view === 'dia' ? (
        <DayView
          day={anchor}
          appointments={dayAppointments}
          patients={data.patients}
          rooms={data.rooms}
          loading={loading}
          onOpen={setDetail}
          onSlot={(hour, roomId) => setBooking({ date: anchor, hour, roomId })}
        />
      ) : null}

      {view === 'semana' ? (
        <WeekView
          days={weekDays}
          appointments={data.appointments}
          patients={data.patients}
          onOpen={setDetail}
          onDay={(day) => { setAnchor(day); setView('dia'); }}
        />
      ) : null}

      {view === 'lista' ? (
        <ListView
          title={`Agendamentos de ${monthLabel(anchor).toLowerCase()}`}
          appointments={visible}
          patients={data.patients}
          loading={loading}
          onOpen={setDetail}
        />
      ) : null}

      {view === 'ocupacao' ? (
        <OccupancyView appointments={visible} month={monthLabel(anchor).toLowerCase()} />
      ) : null}

      <BookingSheet
        request={booking}
        patients={data.patients}
        rooms={data.rooms}
        onClose={() => setBooking(null)}
        onSaved={() => { setBooking(null); load(); }}
      />

      <AppointmentDetail
        appointment={detail}
        patient={data.patients.find((p) => p.id === detail?.pacienteId)}
        room={data.rooms.find((r) => r.id === detail?.salaId)}
        hasTeleConsent={detail ? hasActiveConsent(data.consents ?? [], 'teleconsulta', detail.pacienteId) : false}
        onClose={() => setDetail(null)}
        onChanged={() => { setDetail(null); load(); }}
      />
    </NoTeleConsent.Provider>
  );
}

/** Coluna para atendimentos que não ocupam sala física. */
const UNALLOCATED = '__sem_sala__';
const UNALLOCATED_COLUMN = { id: UNALLOCATED, nome: 'Sem sala / remoto' };

/* ═══════════════════════════ Vista de dia ═══════════════════════════ */

function DayView({ appointments, patients, rooms: allRooms, day, loading, onOpen, onSlot }) {
  // A manutenção é o estado ATUAL da sala, sem data de início: pintá-la sobre
  // um dia passado afirmava um fato que o registro não tem.
  const rooms = day && day < isoDay()
    ? allRooms.map((r) => (r.status === 'manutencao' ? { ...r, status: 'disponivel' } : r))
    : allRooms;
  // Teleconsulta não ocupa sala, e uma consulta pode ser marcada antes de a
  // sala ser definida. Sem uma coluna para esses casos, o atendimento some da
  // grade enquanto continua contado no resumo do dia — a recepção veria "3
  // consultas hoje" sobre um quadro vazio. A coluna só aparece quando há o que
  // colocar nela.
  const semSala = appointments.some(
    (a) => !a.salaId && a.status !== APPOINTMENT_STATUS.CANCELLED,
  );
  const columns = rooms.length
    ? (semSala ? [...rooms, UNALLOCATED_COLUMN] : rooms)
    : [{ id: null, nome: 'Consultório' }];

  // Sala em manutenção e sem nenhuma consulta no dia vira um bloco só, da
  // primeira à última hora: 13 caixas vazias iguais liam como carregamento.
  const blocked = new Set(
    rooms
      .filter((r) => r.status === 'manutencao')
      .filter((r) => !appointments.some((a) => a.salaId === r.id && a.status !== APPOINTMENT_STATUS.CANCELLED))
      .map((r) => r.id),
  );

  if (loading) {
    return <Card><CardBody><EmptyState icon="calendar" title="Carregando agenda…" compact /></CardBody></Card>;
  }

  return (
    <Card variant="flush">
      <div className="day-grid" style={{ '--columns': columns.length }}>
        <div className="day-grid__corner" />
        {columns.map((room) => (
          <div
            key={room.id ?? 'default'}
            className={`day-grid__room${room.id === UNALLOCATED ? ' day-grid__room--unallocated' : ''}`}
          >
            <Icon name={room.id === UNALLOCATED ? 'video' : 'door'} size={13} />
            {room.nome}
            {room.status === 'manutencao' ? <span className="day-grid__room-note">em manutenção</span> : null}
          </div>
        ))}

        {HOURS.map((hour) => (
          <HourRow
            key={hour}
            hour={hour}
            columns={columns}
            blocked={blocked}
            appointments={appointments}
            patients={patients}
            onOpen={onOpen}
            onSlot={onSlot}
          />
        ))}
      </div>

      {!appointments.length ? (
        <EmptyState
          icon="calendar"
          title="Nenhum agendamento neste dia"
          description="Clique em um horário livre para agendar."
          compact
        />
      ) : null}
    </Card>
  );
}

function HourRow({ hour, columns, blocked, appointments, patients, onOpen, onSlot }) {
  const noTele = useNoTeleConsent();
  return (
    <>
      <div className="day-grid__hour num">{String(hour).padStart(2, '0')}:00</div>
      {columns.map((room) => {
        if (blocked.has(room.id)) {
          // Um bloco da primeira à última hora; as linhas seguintes não
          // desenham célula nesta coluna (a grade pula a área ocupada).
          return hour === HOURS[0] ? (
            <div
              key={room.id}
              className="day-grid__cell day-grid__cell--blocked"
              style={{ gridRow: `span ${HOURS.length}` }}
            >
              <span className="day-grid__blocked" aria-label={`${room.nome} em manutenção`}>
                <strong>Em manutenção</strong>
                <span>Sem agendamento até a sala ser liberada em Operações.</span>
              </span>
            </div>
          ) : null;
        }
        const slot = appointments.filter((a) => {
          const h = new Date(a.inicio).getHours();
          const sameRoom = room.id === UNALLOCATED ? !a.salaId
            : room.id ? a.salaId === room.id
            : true;
          // Renderiza apenas na hora exata do início para não duplicar, a duração (height) cobrirá as próximas
          return h === hour && sameRoom;
        });

        // Horário ocupado por alguma consulta em andamento que começou antes?
        const isCovered = appointments.some((a) => {
          if (a.status === APPOINTMENT_STATUS.CANCELLED) return false;
          const sameRoom = room.id === UNALLOCATED ? !a.salaId : room.id ? a.salaId === room.id : true;
          if (!sameRoom) return false;
          const s = new Date(a.inicio).getTime();
          // Duração padrão caso falte 'fim' é 60 minutos
          const e = a.fim ? new Date(a.fim).getTime() : s + 60 * 60000;
          const hourStart = new Date(`${a.inicio.slice(0,10)}T${String(hour).padStart(2, '0')}:00:00`).getTime();
          return hourStart >= s && hourStart < e;
        });

        return (
          <div key={room.id ?? 'default'} className="day-grid__cell">
            {slot.length ? slot.map((appointment) => {
              const patient = patients.find((p) => p.id === appointment.pacienteId);
              const startDt = new Date(appointment.inicio);
              const endDt = new Date(appointment.fim || (startDt.getTime() + 60 * 60000));
              const durationMins = Math.round((endDt - startDt) / 60000);
              const topPx = (startDt.getMinutes() / 60) * 72;
              const heightPx = (durationMins / 60) * 72;

              // O bloco curto não cabe em duas linhas: o conteúdo se adapta à
              // altura em vez de vazar por baixo da caixa (o tipo e o estado
              // ficam no título e no painel de detalhe).
              const blockHeight = Math.max(20, Math.round(heightPx));
              const compact = blockHeight < 64;
              const detail = isUnresolved(appointment)
                ? `${APPOINTMENT_TYPE_LABELS[appointment.tipo]} · sem desfecho registrado`
                : isLate(appointment)
                ? `Atrasado ${duration(Math.round((Date.now() - new Date(appointment.inicio)) / 60000))} · sem chegada`
                : appointment.status === APPOINTMENT_STATUS.CHECKED_IN && appointment.checkInEm
                ? `Aguardando há ${duration(Math.max(0, Math.round((Date.now() - new Date(appointment.checkInEm)) / 60000)))}`
                : `${APPOINTMENT_TYPE_LABELS[appointment.tipo]} · ${APPOINTMENT_STATUS_LABELS[appointment.status]}`;
              const name = patient?.nomeSocial || patient?.nome || 'Sem paciente';

              return (
                <button
                  key={appointment.id}
                  type="button"
                  style={{ top: `${Math.round(topPx)}px`, height: `${blockHeight}px` }}
                  className={`slot slot--${displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE).tone} ${isUnresolved(appointment) || isLate(appointment) ? 'is-pending-record' : ''} ${compact ? 'is-compact' : ''}`}
                  onClick={() => onOpen(appointment)}
                  title={`${time(appointment.inicio)}–${time(endDt.toISOString())} · ${name} · ${detail}`}
                >
                  <span className="slot__time num">{time(appointment.inicio)}–{time(endDt.toISOString())}</span>
                  <span className="slot__name">{compact ? displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE).label : name}</span>
                  {compact ? null : <span className="slot__type">{detail}</span>}
                  {noTele(appointment) && !compact ? <Chip tone="warning" icon="video" wrap>Sem consentimento</Chip> : null}
                  {noTele(appointment) && compact ? <Icon name="video" size={13} className="slot__flag" /> : null}
                </button>
              );
            }) : room.status === 'manutencao' ? (
              // Manutenção com consulta no dia (marcada antes do bloqueio): a
              // hora vazia não oferece "+", mas o bloco único não cabe aqui.
              <span className="day-grid__blocked" aria-label={`${room.nome} em manutenção`} />
            ) : isCovered ? null : (
              <button
                type="button"
                className="day-grid__empty"
                onClick={() => onSlot(hour, room.id === UNALLOCATED ? null : room.id)}
                aria-label={
                  room.id === UNALLOCATED
                    ? `Agendar às ${hour}:00 sem sala`
                    : `Agendar às ${hour}:00 em ${room.nome}`
                }
              >
                <Icon name="plus" size={14} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ═══════════════════════════ Vista de semana ═══════════════════════════ */

function WeekView({ days, appointments, patients, onOpen, onDay }) {
  const noTele = useNoTeleConsent();
  const today = isoDay();

  return (
    <Card variant="flush">
      <div className="week-grid">
        {days.map((day) => {
          // Cancelados aparecem na grade (riscados, no fim do dia): a faixa diz
          // "fora 1 cancelada" e o leitor precisa achar qual. A contagem do dia
          // continua sem eles, como o total da semana.
          const all = appointments
            .filter((a) => localDay(a.inicio) === day)
            .sort((a, b) => a.inicio.localeCompare(b.inicio));
          const list = all.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED);
          const shownList = [...list, ...all.filter((a) => a.status === APPOINTMENT_STATUS.CANCELLED)];
          const dayDate = new Date(`${day}T12:00:00`);

          return (
            <section key={day} className={`week-day ${day === today ? 'is-today' : ''}`}>
              <button type="button" className="week-day__head" onClick={() => onDay(day)}>
                <span className="week-day__weekday">{WEEKDAYS[dayDate.getDay()]}</span>
                <span className="week-day__num num">{dayDate.getDate()}</span>
                {list.length ? (
                  <span className="week-day__count num" title={`${list.length} ${list.length === 1 ? 'consulta' : 'consultas'}`}>
                    {list.length} {list.length === 1 ? 'consulta' : 'consultas'}
                  </span>
                ) : null}
              </button>

              <ul className="week-day__list">
                {shownList.map((appointment) => {
                  const patient = patients.find((p) => p.id === appointment.pacienteId);
                  return (
                    <li key={appointment.id}>
                      <button
                        type="button"
                        className={`week-slot week-slot--${displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE).tone} ${isUnresolved(appointment) || isLate(appointment) ? 'is-pending-record' : ''}`}
                        onClick={() => onOpen(appointment)}
                      >
                        <span className="num">
                          {time(appointment.inicio)} · {displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE).label}
                        </span>
                        <span>{patient?.nomeSocial || patient?.nome || '—'}</span>
                        {/* Tipo no cartão: teleconsulta ou presencial muda o que a recepção prepara. */}
                        <span className="week-slot__type">{APPOINTMENT_TYPE_LABELS[appointment.tipo]}</span>
                        {noTele(appointment) && appointment.status !== APPOINTMENT_STATUS.CANCELLED ? (
                          <Chip tone="warning" icon="video" wrap>Sem consentimento</Chip>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {!list.length ? <li className="week-day__empty">—</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══════════════════════════ Vista de lista ═══════════════════════════ */

function ListView({ title, appointments, patients, loading, onOpen }) {
  const noTele = useNoTeleConsent();
  const [status, setStatus] = useState('all');

  // Filtro pelo estado que a tela MOSTRA: a consulta atrasada sai de
  // "Confirmado" e ganha a própria aba, com a mesma contagem do cartão.
  const keyOf = (a) => stateOf(a);
  // Ordem de trabalho: primeiro o registro que falta (sem desfecho, atrasado),
  // depois de hoje em diante em ordem de horário, e por fim o que já passou,
  // do mais recente ao mais antigo. Do dia 30 para trás, as consultas de hoje
  // ficavam na 40ª linha.
  const today = isoDay();
  const rank = (a) => (['sem_desfecho', 'atrasado'].includes(keyOf(a)) ? 0 : (localDay(a.inicio) ?? '') >= today ? 1 : 2);
  // Sem título entre os grupos, a lista ia de 30/09 direto para 16/09.
  const GROUPS = ['Registro pendente', 'De hoje em diante', 'De dias anteriores'];
  const rows = useMemo(() => {
    return appointments
      .filter((a) => status === 'all' || keyOf(a) === status)
      .sort((a, b) => rank(a) - rank(b)
        || (rank(a) === 2 ? (b.inicio ?? '').localeCompare(a.inicio ?? '') : (a.inicio ?? '').localeCompare(b.inicio ?? '')));
  }, [appointments, status, today]);
  const groupSize = (r) => rows.filter((a) => rank(a) === r).length;

  return (
    <Card variant="flush">
      <CardHeader
        title={title}
        actions={
          <Tabs
            variant="underline"
            value={status}
            onChange={setStatus}
            ariaLabel="Filtrar por situação"
            // "Atrasado" vem logo após "Todos": é o que a faixa vermelha manda
            // resolver, e no fim da fileira ele ficava cortado fora do card.
            // Filtro vazio não ocupa largura (a não ser o selecionado); as
            // abas visíveis somam sempre o "Todos".
            items={[
              { value: 'all', label: 'Presencial', count: appointments.length },
              { value: 'sem_desfecho', label: 'Sem desfecho', count: appointments.filter((a) => keyOf(a) === 'sem_desfecho').length },
              { value: 'atrasado', label: 'Atrasado', count: appointments.filter((a) => keyOf(a) === 'atrasado').length },
              ...Object.values(APPOINTMENT_STATUS).map((s) => ({
                value: s, label: APPOINTMENT_STATUS_LABELS[s], count: appointments.filter((a) => keyOf(a) === s).length,
              })),
            ].filter((item) => item.value === 'all' || item.count > 0 || item.value === status)}
          />
        }
      />
      <CardBody>
        {rows.length ? (
          <ul className="appointment-list">
            {rows.map((appointment, i) => {
              const patient = patients.find((p) => p.id === appointment.pacienteId);
              const group = rank(appointment);
              const opensGroup = i === 0 || rank(rows[i - 1]) !== group;
              return (
                <Fragment key={appointment.id}>
                {opensGroup ? (
                  <li className="appointment-list__group" role="presentation">
                    {GROUPS[group]} <span className="num">{groupSize(group)}</span>
                  </li>
                ) : null}
                <li>
                  <button type="button" onClick={() => onOpen(appointment)}>
                    <span className="appointment-list__date">
                      <strong className="num">{date(appointment.inicio)}</strong>
                      <span className="num">{time(appointment.inicio)}</span>
                    </span>
                    <Avatar name={patient?.nome} size={34} />
                    <span className="appointment-list__text">
                      <strong>{patient?.nomeSocial || patient?.nome || '—'}</strong>
                      <span>{APPOINTMENT_TYPE_LABELS[appointment.tipo]}</span>
                    </span>
                    {noTele(appointment) && appointment.status !== APPOINTMENT_STATUS.CANCELLED
                      ? <Chip tone="warning" icon="video">Sem consentimento</Chip>
                      : null}
                    {(() => {
                      const shown = displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
                      return <Chip tone={shown.tone} icon={shown.icon}>{shown.label}</Chip>;
                    })()}
                  </button>
                </li>
                </Fragment>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon="calendar"
            title={loading ? 'Carregando…' : 'Nenhum agendamento'}
            description={status === 'all'
              ? 'Os agendamentos aparecem aqui assim que forem criados.'
              : 'Nenhum agendamento com essa situação.'}
          />
        )}
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════ Ocupação ═══════════════════════════ */

function OccupancyView({ appointments, month }) {
  const { rows, columns, values, total } = useMemo(() => {
    const map = {};
    let count = 0;
    for (const appointment of appointments) {
      if (!appointment.inicio || appointment.status === APPOINTMENT_STATUS.CANCELLED) continue;
      const d = new Date(appointment.inicio);
      const key = `${String(d.getHours()).padStart(2, '0')}h|${WEEKDAYS[d.getDay()]}`;
      map[key] = (map[key] ?? 0) + 1;
      count += 1;
    }
    return {
      // "09h" é a faixa das 09:00 às 09:59: uma consulta das 09:30 conta aqui.
      // O rótulo "09:00" afirmava um horário que ninguém marcou.
      rows: HOURS.map((h) => `${String(h).padStart(2, '0')}h`),
      columns: WEEKDAYS.slice(1, 6),
      values: map,
      total: count,
    };
  }, [appointments]);

  return (
    <Card>
      <CardHeader
        title="Agendamentos por horário"
        eyebrow={`Mês de ${month}`}
        subtitle={total ? `${total} agendamentos, exceto cancelados · cada linha soma os horários iniciados dentro daquela hora` : undefined}
      />
      <CardBody>
        {total ? (
          <HeatGrid rows={rows} columns={columns} values={values} unit="agendamentos" title={`Agendamentos por hora e dia da semana em ${month}`} />
        ) : (
          <EmptyState
            icon="chart-bar"
            title="Sem histórico suficiente"
            description="Depois de algumas semanas de atendimento, este mapa mostra os horários de maior e menor procura — útil para dimensionar a equipe."
          />
        )}
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════ Agendamento ═══════════════════════════ */

function BookingSheet({ request, patients, rooms, onClose, onSaved }) {
  const { plaza, user } = useSession();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request) { setForm(null); return; }
    const hour = request.hour ?? 9;
    setForm({
      pacienteId: '',
      salaId: request.roomId ?? rooms[0]?.id ?? null,
      data: request.date,
      horaInicio: `${String(hour).padStart(2, '0')}:00`,
      duracao: 60,
      tipo: APPOINTMENT_TYPES.RETURN,
      observacoes: '',
    });
  }, [request, rooms]);

  if (!form) return null;

  const set = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function save() {
    if (!form.pacienteId) { toast.error('Selecione o paciente.'); return; }

    setBusy(true);
    try {
      const inicio = new Date(`${form.data}T${form.horaInicio}:00`);
      const fim = new Date(inicio.getTime() + Number(form.duracao) * 60000);

      await repo.create(STORES.APPOINTMENTS, {
        ...newAppointment({ praca: plaza, userId: user?.id }),
        pacienteId: form.pacienteId,
        salaId: form.salaId,
        profissionalId: user?.id,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        tipo: form.tipo,
        status: APPOINTMENT_STATUS.SCHEDULED,
        observacoes: form.observacoes,
      });

      toast.success('Consulta agendada.');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!request}
      onClose={onClose}
      width={460}
      title="Novo agendamento"
      description={dateLong(form.data)}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Agendar</Button>
        </>
      }
    >
      <div className="booking-form">
        <Combobox
          label="Paciente" required
          value={form.pacienteId}
          onChange={(value) => setForm((f) => ({ ...f, pacienteId: value }))}
          options={patients.map((p) => ({
            value: p.id,
            label: p.nomeSocial || p.nome,
            hint: p.dataNascimento ? age(p.dataNascimento).label : undefined,
          }))}
          placeholder="Buscar paciente cadastrado"
          emptyMessage="Nenhum paciente cadastrado ainda."
        />

        <FieldRow>
          <TextField label="Data" type="date" value={form.data} onChange={set('data')} />
          <TextField label="Hora" type="time" value={form.horaInicio} onChange={set('horaInicio')} />
        </FieldRow>

        <FieldRow>
          <Select
            label="Duração" value={form.duracao} onChange={set('duracao')}
            options={[30, 45, 60, 90, 120].map((m) => ({ value: m, label: duration(m) }))}
          />
          <Select
            label="Tipo" value={form.tipo} onChange={set('tipo')}
            options={Object.values(APPOINTMENT_TYPES).map((t) => ({ value: t, label: APPOINTMENT_TYPE_LABELS[t] }))}
          />
        </FieldRow>

        {rooms.length > 1 ? (
          <Select
            label="Sala" value={form.salaId ?? ''} onChange={set('salaId')}
            options={rooms.map((r) => ({ value: r.id, label: r.nome }))}
          />
        ) : null}

        <TextArea label="Observações" rows={3} value={form.observacoes} onChange={set('observacoes')} />
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════ Detalhe ═══════════════════════════ */

function AppointmentDetail({ appointment, patient, room, hasTeleConsent, onClose, onChanged }) {
  const noTele = useNoTeleConsent();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [teleConsentPrompt, setTeleConsentPrompt] = useState(null);

  // Zera a edição quando muda a consulta
  useEffect(() => { setCorrecting(false); }, [appointment?.id]);

  if (!appointment) return null;

  async function setStatus(status, extra = {}) {
    setBusy(true);
    try {
      await repo.update(STORES.APPOINTMENTS, appointment.id, { status, ...extra });
      toast.success('Situação atualizada.');
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Espera é o tempo ENTRE a chegada e o início do atendimento. Contar
  // "agora − chegada" num atendimento já encerrado dava "Esperando 33h" para
  // quem foi atendido às 8h, ao lado de "Aguardando 0" na mesma tela.
  const waitEnd = appointment.inicioAtendimento ?? appointment.fimAtendimento ?? null;
  const waited = appointment.checkInEm
    ? Math.round(((waitEnd ? new Date(waitEnd).getTime() : Date.now()) - new Date(appointment.checkInEm).getTime()) / 60000)
    : null;
  const waitingNow = appointment.status === APPOINTMENT_STATUS.CHECKED_IN && !waitEnd && !isUnresolved(appointment);
  // Consulta que passou sem nenhum registro: é ela que está pendurada, e era
  // justamente a que não mostrava tempo nenhum.
  const pendingSince = isUnresolved(appointment)
    ? Math.round((Date.now() - new Date(appointment.inicio).getTime()) / 60000)
    : null;

  return (
    <>
      <Sheet
        open={!!appointment}
        onClose={onClose}
        width={420}
        title={patient?.nomeSocial || patient?.nome || 'Agendamento'}
        description={`${date(appointment.inicio)} às ${time(appointment.inicio)} · ${APPOINTMENT_TYPE_LABELS[appointment.tipo]}`}
        footer={
          <>
            {/* Consulta encerrada (concluída, falta ou já cancelada) não se
                cancela: o desfecho já está registrado. */}
            {[APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.CANCELLED].includes(appointment.status)
              ? <span />
              : <Button variant="danger" onClick={() => setCancelling(true)} disabled={busy}>Cancelar consulta</Button>}
            <Button
              variant="primary"
              onClick={() => window.location.hash = `#/pacientes/${appointment.pacienteId}`}
              disabled={!appointment.pacienteId}
            >
              Abrir prontuário
            </Button>
          </>
        }
      >
        <div className="appointment-detail">
          <div className="appointment-detail__status">
            {(() => {
              const shown = displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
              return <StatusDot tone={shown.tone} label={shown.label} />;
            })()}
            {appointment && noTele(appointment) ? (
              <Chip tone="warning" icon="video" wrap>Sem consentimento para teleconsulta · registrar no prontuário antes de atender</Chip>
            ) : null}
            {waited != null && waitingNow ? (
              <Chip tone={waited > 30 ? 'danger' : waited > 15 ? 'warning' : 'neutral'}>
                Esperando há {duration(waited)}
              </Chip>
            ) : waited != null ? (
              <Chip tone="neutral">Esperou {duration(Math.max(0, waited))}</Chip>
            ) : null}
            {pendingSince != null ? (
              <Chip tone="danger" icon="history">
                {appointment.checkInEm ? 'Chegada registrada' : 'Sem chegada registrada'} · o horário passou há {duration(pendingSince)}
              </Chip>
            ) : null}
          </div>

          {/* A ficha do atendimento: abrir uma consulta do passado e encontrar só
              o estado deixava o médico sem responsável, sala, valor nem o
              consentimento que a teleconsulta exigia. */}
          <dl className="appointment-detail__facts">
            <div><dt>Tipo</dt><dd>{APPOINTMENT_TYPE_LABELS[appointment.tipo]}</dd></div>
            <div><dt>Horário</dt><dd className="num">{date(appointment.inicio)} · {time(appointment.inicio)}{appointment.fim ? `–${time(appointment.fim)}` : ''}</dd></div>
            <div>
              <dt>{appointment.tipo === 'teleconsulta' ? 'Atendimento' : 'Sala'}</dt>
              <dd>{appointment.tipo === 'teleconsulta' ? 'Remoto, sem sala' : room?.nome ?? 'Sala não definida'}</dd>
            </div>
            {patient?.dataNascimento ? (
              <div><dt>Idade</dt><dd>{age(patient.dataNascimento).label}</dd></div>
            ) : null}
            {appointment.valor ? (
              <div><dt>Valor</dt><dd className="num">{money(appointment.valor)}</dd></div>
            ) : null}
            {appointment.tipo === 'teleconsulta' ? (
              <div>
                <dt>Consentimento</dt>
                <dd>{hasTeleConsent ? 'Registrado para teleconsulta' : 'Não registrado'}</dd>
              </div>
            ) : null}
            {appointment.checkInEm ? (
              <div><dt>Chegada</dt><dd className="num">{time(appointment.checkInEm)}</dd></div>
            ) : null}
            {[APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.IN_PROGRESS].includes(appointment.status) || appointment.inicioAtendimento ? (
              <div><dt>Início do atendimento</dt><dd className={appointment.inicioAtendimento ? "num" : ""}>{appointment.inicioAtendimento ? time(appointment.inicioAtendimento) : 'não registrado'}</dd></div>
            ) : null}
            {appointment.fimAtendimento ? (
              <div><dt>Conclusão</dt><dd className="num">{time(appointment.fimAtendimento)}</dd></div>
            ) : null}
          </dl>

          <div className="appointment-detail__flow">
            <span className="field__label">
              {[APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.CANCELLED].includes(appointment.status) && !correcting
                ? 'Desfecho registrado' : 'Avançar o atendimento'}
            </span>
            {[APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.CANCELLED].includes(appointment.status) && !correcting ? (
              <div className="appointment-detail__actions">
                <p style={{ margin: 0, fontSize: 'var(--t-caption)', color: 'var(--ink-500)' }}>
                  {APPOINTMENT_STATUS_LABELS[appointment.status]} em {date(appointment.fimAtendimento || appointment.inicio)} às {time(appointment.fimAtendimento || appointment.inicio)}.
                </p>
                <Button size="sm" onClick={() => setCorrecting(true)}>Corrigir desfecho</Button>
              </div>
            ) : (
              <div className="appointment-detail__actions">
                <Button size="sm" icon="check" disabled={busy || appointment.status === APPOINTMENT_STATUS.CONFIRMED} aria-current={appointment.status === APPOINTMENT_STATUS.CONFIRMED}
                  onClick={() => { setCorrecting(false); setStatus(APPOINTMENT_STATUS.CONFIRMED); }}>Confirmada</Button>
                <Button size="sm" icon="clock" disabled={busy || appointment.status === APPOINTMENT_STATUS.CHECKED_IN} aria-current={appointment.status === APPOINTMENT_STATUS.CHECKED_IN}
                  onClick={() => { setCorrecting(false); setStatus(APPOINTMENT_STATUS.CHECKED_IN, { checkInEm: new Date().toISOString() }); }}>
                  Fez check-in
                </Button>
                <Button size="sm" icon="stethoscope" disabled={busy || appointment.status === APPOINTMENT_STATUS.IN_PROGRESS} aria-current={appointment.status === APPOINTMENT_STATUS.IN_PROGRESS}
                  onClick={() => { 
                    setCorrecting(false); 
                    if (noTele(appointment) && !hasTeleConsent) {
                      setTeleConsentPrompt({ status: APPOINTMENT_STATUS.IN_PROGRESS, extra: { inicioAtendimento: new Date().toISOString() } });
                    } else {
                      setStatus(APPOINTMENT_STATUS.IN_PROGRESS, { inicioAtendimento: new Date().toISOString() }); 
                    }
                  }}>
                  Iniciar atendimento
                </Button>
                <Button size="sm" variant="primary" icon="check" disabled={busy || appointment.status === APPOINTMENT_STATUS.DONE} aria-current={appointment.status === APPOINTMENT_STATUS.DONE}
                  onClick={() => { 
                    setCorrecting(false); 
                    if (noTele(appointment) && !hasTeleConsent) {
                      setTeleConsentPrompt({ status: APPOINTMENT_STATUS.DONE, extra: { fimAtendimento: new Date().toISOString() } });
                    } else {
                      setStatus(APPOINTMENT_STATUS.DONE, { fimAtendimento: new Date().toISOString() }); 
                    }
                  }}>
                  Concluir
                </Button>
                <Button size="sm" icon="x" disabled={busy || appointment.status === APPOINTMENT_STATUS.NO_SHOW} aria-current={appointment.status === APPOINTMENT_STATUS.NO_SHOW}
                  onClick={() => { setCorrecting(false); setStatus(APPOINTMENT_STATUS.NO_SHOW); }}>Registrar falta</Button>
              </div>
            )}
          </div>

          {patient?.perfilSensorial?.gatilhos ? (
            <div className="appointment-detail__sensory">
              <Icon name="heart-pulse" size={14} />
              <div>
                <strong>Perfil sensorial</strong>
                <p>{patient.perfilSensorial.gatilhos}</p>
                {patient.perfilSensorial.toleranciaEspera ? (
                  <p>Tolerância de espera: {patient.perfilSensorial.toleranciaEspera}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {appointment.observacoes ? (
            <div>
              <span className="field__label">Observações</span>
              <p className="appointment-detail__notes">{appointment.observacoes}</p>
            </div>
          ) : null}
        </div>
      </Sheet>

      <ConfirmDialog
        open={cancelling}
        onCancel={() => setCancelling(false)}
        onConfirm={async () => { setCancelling(false); await setStatus(APPOINTMENT_STATUS.CANCELLED); }}
        title="Cancelar esta consulta?"
        message="O horário volta a ficar livre e o cancelamento fica registrado no histórico do paciente."
        confirmLabel="Cancelar consulta"
      />

      <ConfirmDialog
        open={!!teleConsentPrompt}
        onCancel={() => setTeleConsentPrompt(null)}
        onConfirm={() => {
          const p = teleConsentPrompt;
          setTeleConsentPrompt(null);
          setStatus(p.status, p.extra);
        }}
        title="Teleconsulta sem consentimento"
        message="Não há consentimento registrado para teleconsulta. Registrar agora ou seguir assim mesmo?"
        confirmLabel="Seguir assim mesmo"
        cancelLabel="Voltar"
      />
    </>
  );
}

function monthLabel(isoDate) {
  const label = new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
