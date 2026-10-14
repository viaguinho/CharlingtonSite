import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, APPOINTMENT_STATUS, APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { localDay } from '../../core/periods.js';
import { appointmentMinutes, findClashes } from '../../core/appointments.js';
import { Modal, useToast } from '../../components/Overlay.jsx';
import { Button } from '../../components/primitives.jsx';
import { Select, TextField, FieldRow } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { isoDay, time, duration } from '../../core/format.js';

/**
 * Remarcação — o único lugar do painel onde um agendamento muda de horário.
 *
 * A Agenda (detalhe da consulta), a Visão geral (card da agenda, pendências e
 * confirmações), o prontuário (cabeçalho e linha do tempo) e o arrastar do card
 * da agenda abrem este mesmo diálogo, então a regra é uma só:
 *  - horário no futuro e dentro do expediente da grade (07h às 19h);
 *  - choque com outro atendimento é aviso, não bloqueio;
 *  - consulta volta para "Agendado": a confirmação valia para o horário antigo,
 *    e a família precisa confirmar o novo (evento interno não tem família);
 *  - o motivo e os horários, de e para, vão para a auditoria — sem coluna nova.
 */

const FIRST_HOUR = 7;
const LAST_HOUR = 19;

const REASONS = [
  { value: 'familia', label: 'Pedido da família' },
  { value: 'clinica', label: 'Pedido da clínica' },
  { value: 'ausencia', label: 'Não compareceu ou atrasou' },
  { value: 'outro', label: 'Outro motivo' },
];

const QUICK = [
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mês', days: 30 },
];

const pad = (n) => String(n).padStart(2, '0');
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return isoDay(d); };
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const shortDate = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const isEvent = (a) => a?.tipo === APPOINTMENT_TYPES.EVENT || !!a?.titulo;

/**
 * @param appointment agendamento a remarcar; null mantém o diálogo fechado
 * @param suggested   Date opcional que já vem preenchida (arrastar no card)
 * @param onDone      chamado depois de gravar, para a tela recarregar
 */
export default function RescheduleDialog({ appointment, suggested = null, onClose, onDone }) {
  const { plaza } = useSession();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [others, setOthers] = useState({ appointments: [], patients: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appointment) { setForm(null); return undefined; }
    const current = new Date(appointment.inicio);
    // Horário que já passou: a sugestão é o mesmo horário de amanhã.
    const base = suggested ?? (current.getTime() > Date.now() ? current : new Date(`${addDays(isoDay(), 1)}T${hhmm(current)}:00`));
    setForm({
      data: isoDay(base),
      hora: hhmm(base),
      duracao: appointmentMinutes(appointment),
      motivo: 'familia',
    });
    let alive = true;
    const where = plaza ? { praca: plaza } : {};
    Promise.all([
      repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
      repo.list(STORES.PATIENTS, { where }).catch(() => []),
    ]).then(([appointments, patients]) => { if (alive) setOthers({ appointments, patients }); });
    return () => { alive = false; };
  }, [appointment?.id, suggested?.getTime?.()]); // eslint-disable-line react-hooks/exhaustive-deps

  const event = isEvent(appointment);
  const patient = others.patients.find((p) => p.id === appointment?.pacienteId);
  const name = appointment?.titulo || patient?.nomeSocial || patient?.nome || 'Paciente';

  const check = useMemo(() => {
    if (!appointment || !form) return null;
    const start = new Date(`${form.data}T${form.hora}:00`);
    if (!form.data || !form.hora || Number.isNaN(start.getTime())) return { error: 'Informe a data e a hora.' };
    const end = new Date(start.getTime() + Number(form.duracao) * 60000);
    const hour = start.getHours();
    if (start.getTime() <= Date.now()) return { start, end, error: 'Escolha um horário que ainda não passou.' };
    // Fora da grade a consulta sumiria da Agenda do dia.
    if (hour < FIRST_HOUR || hour > LAST_HOUR) {
      return { start, end, error: `A agenda atende das ${pad(FIRST_HOUR)}:00 às ${pad(LAST_HOUR)}:59.` };
    }
    const same = start.getTime() === new Date(appointment.inicio).getTime()
      && Number(form.duracao) === appointmentMinutes(appointment);
    return {
      start, end, same,
      clashes: findClashes(others.appointments, appointment, start, end),
    };
  }, [appointment, form, others.appointments]);

  if (!appointment || !form) return null;

  const set = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setForm((f) => ({ ...f, [field]: value }));
  };

  // "Em 1 semana" conta a partir da consulta, ou de hoje se ela já passou.
  const anchorDay = localDay(appointment.inicio) > isoDay() ? localDay(appointment.inicio) : isoDay();
  const nameOf = (a) => (a.titulo || others.patients.find((p) => p.id === a.pacienteId)?.nome || 'outro atendimento').split(' ').slice(0, 2).join(' ');

  async function save() {
    if (!check || check.error || check.same) return;
    setBusy(true);
    try {
      const from = new Date(appointment.inicio);
      const reason = REASONS.find((r) => r.value === form.motivo)?.label;
      await repo.update(STORES.APPOINTMENTS, appointment.id, {
        inicio: check.start.toISOString(),
        fim: check.end.toISOString(),
        ...(event ? {} : { status: APPOINTMENT_STATUS.SCHEDULED }),
      }, {
        auditDetail: `Remarcação de ${name}: ${shortDate(from)} ${time(appointment.inicio)} → ${shortDate(check.start)} ${hhmm(check.start)}${event ? '' : ` (${reason})`}`,
      });
      toast.success(`${event ? 'Evento remarcado' : 'Consulta remarcada'} para ${shortDate(check.start)} às ${hhmm(check.start)}.`);
      onDone?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      size="md"
      title={event ? 'Remarcar evento' : 'Remarcar consulta'}
      description={`${name} · ${event ? 'Evento interno' : APPOINTMENT_TYPE_LABELS[appointment.tipo]}`}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Manter horário</Button>
          <Button variant="primary" icon="calendar" onClick={save} loading={busy} disabled={!check || !!check.error || !!check.same}>
            Remarcar
          </Button>
        </>
      }
    >
      <div className="reschedule">
        <dl className="reschedule__move">
          <div>
            <dt>Horário atual</dt>
            <dd className="num">
              <span>{shortDate(new Date(appointment.inicio))}</span>
              <span>{time(appointment.inicio)}{appointment.fim ? `–${time(appointment.fim)}` : ''}</span>
            </dd>
          </div>
          <Icon name="arrow-right" size={14} />
          <div>
            <dt>Novo horário</dt>
            <dd className="num">
              {check?.start && !Number.isNaN(check.start.getTime())
                ? <><span>{shortDate(check.start)}</span><span>{hhmm(check.start)}–{hhmm(check.end)}</span></>
                : '—'}
            </dd>
          </div>
        </dl>

        <div className="reschedule__quick" role="group" aria-label="Atalhos de data">
          <span>Mesmo horário em</span>
          {QUICK.map((q) => (
            <Button key={q.days} size="sm" onClick={() => setForm((f) => ({ ...f, data: addDays(anchorDay, q.days) }))}>{q.label}</Button>
          ))}
        </div>

        <FieldRow>
          <TextField label="Data" type="date" min={isoDay()} value={form.data} onChange={set('data')} />
          <TextField label="Hora" type="time" step={300} value={form.hora} onChange={set('hora')} />
        </FieldRow>
        <FieldRow>
          <Select
            label="Duração" value={form.duracao} onChange={set('duracao')}
            options={[...new Set([30, 45, 60, 90, 120, appointmentMinutes(appointment)])].sort((a, b) => a - b)
              .map((m) => ({ value: m, label: duration(m) }))}
          />
          {event ? <div /> : (
            <Select label="Motivo" value={form.motivo} onChange={set('motivo')} options={REASONS} />
          )}
        </FieldRow>

        {check?.error ? (
          <div className="ops-alert ops-alert--danger" role="alert">
            <Icon name="alert-triangle" size={15} />
            <p>{check.error}</p>
          </div>
        ) : null}
        {!check?.error && check?.clashes?.length ? (
          <div className="ops-alert ops-alert--danger" role="status">
            <Icon name="alert-triangle" size={15} />
            <p>
              <strong>Choca com {check.clashes.length === 1 ? 'outro atendimento' : `${check.clashes.length} atendimentos`}:</strong>{' '}
              {check.clashes.slice(0, 3).map((a) => `${nameOf(a)} às ${time(a.inicio)}`).join(', ')}.
              Dá para remarcar mesmo assim.
            </p>
          </div>
        ) : null}
        {!check?.error && !event ? (
          <p className="reschedule__note">
            A consulta volta para <strong>Agendado</strong>: peça à família a confirmação do novo horário em Comunicação. O horário antigo fica livre.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
