import { canReschedule } from '../../../core/appointments.js';
import { APPOINTMENT_TYPE_LABELS } from '../../../data/schema.js';
import Icon from '../../../components/Icon.jsx';
import { date, dateTime, time } from '../../../core/format.js';

/**
 * Pílulas de alerta do palco (as "Mild Inflammation" da referência).
 *
 * Só estados que o prontuário já registra. Nenhuma fica presa a uma região
 * do modelo: alergia não mora no lobo frontal, e um pino ali sugeriria uma
 * localização que ninguém mediu.
 */
export function AlertPills({ states, onReschedule, compact = false }) {
  const { allergies, unresolved, late, present, teleNext, teleDone } = states;
  const items = [];

  // A alergia sempre tem lugar: sem registro, a pílula diz isso (neutra), e
  // ausência de pílula não se confunde com "não perguntado".
  items.push(allergies.length
    ? { key: 'alergia', tone: 'danger', icon: 'alert-triangle', label: 'Alergias', text: allergies.join(' · ') }
    : { key: 'alergia', tone: 'neutral', icon: 'alert-triangle', label: 'Alergias', text: 'Nenhuma registrada' });
  if (unresolved) {
    items.push({
      key: 'sem-desfecho', tone: 'danger', icon: 'history',
      label: 'Sem desfecho',
      // A data e a hora nunca quebram no meio.
      text: <>{APPOINTMENT_TYPE_LABELS[unresolved.tipo]} de <span className="pr-alert__nowrap">{dateTime(unresolved.inicio)}</span></>,
      action: onReschedule && canReschedule(unresolved) ? () => onReschedule(unresolved) : null,
    });
  }
  if (late && late !== unresolved) {
    items.push({
      key: 'atrasado', tone: 'danger', icon: 'clock',
      label: 'Atrasado',
      text: <><span className="pr-alert__nowrap">Hoje {time(late.inicio)}</span>, sem chegada · {APPOINTMENT_TYPE_LABELS[late.tipo]}</>,
      action: onReschedule && canReschedule(late) ? () => onReschedule(late) : null,
    });
  }
  if (present) {
    items.push({
      key: 'presente', tone: 'warning', icon: 'door',
      label: present.status === 'em_atendimento' ? 'Em atendimento' : 'Na recepção',
      text: present.status === 'em_atendimento'
        ? `Consulta das ${time(present.inicio)}`
        : `Desde ${time(present.checkInEm)} · consulta das ${time(present.inicio)}`,
    });
  }
  if (teleNext || teleDone.length) {
    const parts = [];
    if (teleNext) parts.push(<>próxima em <span className="pr-alert__nowrap">{date(teleNext.inicio)}</span></>);
    if (teleDone.length) parts.push(`${teleDone.length} já ${teleDone.length === 1 ? 'realizada' : 'realizadas'}`);
    items.push({
      key: 'tele', tone: 'warning', icon: 'video',
      label: 'Sem consentimento para teleconsulta',
      text: parts.map((p, i) => <span key={i}>{i ? ' · ' : null}{p}</span>),
    });
  }

  return (
    <ul className={`pr-alerts ${compact ? 'pr-alerts--compact' : ''}`.trim()} aria-label="Alertas do paciente">
      {items.map((item) => (
        <li key={item.key} className={`pr-alert pr-alert--${item.tone}${item.key === 'alergia' ? ' pr-alert--allergy' : ''}`} role={item.key === 'alergia' ? 'status' : undefined}>
          <span className="pr-alert__icon" aria-hidden="true"><Icon name={item.icon} size={14} /></span>
          <span className="pr-alert__text">
            <strong>{item.label}</strong>
            <span>{item.text}</span>
          </span>
          {item.action ? (
            <button type="button" className="pr-alert__action" onClick={item.action}>Remarcar</button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
