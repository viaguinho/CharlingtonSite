import { useState } from 'react';
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
/**
 * `collapse` (só no palco): a alergia fica sempre inteira, e dois ou mais outros
 * estados viram um resumo que abre sob demanda. Empilhados sobre o busto, três
 * alertas cobriam a cabeça e o cérebro inteiros a 1280 px.
 */
export function AlertPills({ states, onReschedule, compact = false, part = 'all', collapse = false }) {
  const [expanded, setExpanded] = useState(false);
  const { allergies, unresolved, unresolvedAll = [], late, present, teleNext, teleDone, consentUnknown, visitsUnknown } = states;
  const items = [];

  // A alergia sempre tem lugar: sem registro, a pílula diz isso (neutra), e
  // ausência de pílula não se confunde com "não perguntado".
  items.push(allergies.length
    ? { key: 'alergia', tone: 'danger', icon: 'alert-triangle', label: 'Alergias', text: allergies.join(' · ') }
    : { key: 'alergia', tone: 'neutral', icon: 'alert-triangle', label: 'Alergias', text: 'Nenhuma registrada' });
  if (unresolved) {
    // Vários horários sem desfecho: o número bate com a trilha, e o Remarcar
    // vai para o mais recente que ainda pode ser remarcado (o do alerta pode
    // ser um check-in antigo, sem remarcação).
    const remarkable = unresolvedAll.find((a) => canReschedule(a)) ?? null;
    const shown = remarkable ?? unresolved;   // o horário do texto é o do botão
    items.push({
      key: 'sem-desfecho', tone: 'danger', icon: 'history',
      label: unresolvedAll.length > 1 ? `Sem desfecho (${unresolvedAll.length})` : 'Sem desfecho',
      // A data e a hora nunca quebram no meio.
      text: <>{APPOINTMENT_TYPE_LABELS[shown.tipo]} de <span className="pr-alert__nowrap">{dateTime(shown.inicio)}</span></>,
      action: onReschedule && remarkable ? () => onReschedule(remarkable) : null,
    });
  }
  if (late && !unresolvedAll.includes(late)) {
    items.push({
      key: 'atrasado', tone: 'danger', icon: 'clock',
      label: 'Atrasado',
      text: <><span className="pr-alert__nowrap">Hoje {time(late.inicio)}</span>, {late.tipo === 'teleconsulta' ? 'não iniciada' : 'sem chegada'} · {APPOINTMENT_TYPE_LABELS[late.tipo]}</>,
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
  // Não leu: diz que não sabe, em vez de calar um estado ou de inventar um alerta.
  if (visitsUnknown) {
    items.push({
      key: 'consultas-ilegiveis', tone: 'warning', icon: 'history',
      label: 'Consultas não lidas',
      text: 'Atrasos e consultas sem desfecho não podem ser conferidos agora',
    });
  }
  if (consentUnknown) {
    items.push({
      key: 'consentimento-ilegivel', tone: 'warning', icon: 'video',
      label: 'Consentimento não lido',
      text: 'Não foi possível verificar o consentimento de teleconsulta',
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

  // `part`: o cabeçalho do painel fixa só a alergia ('allergy') e deixa os
  // demais estados ('others') rolarem com o corpo — com 5 alertas, um cabeçalho
  // inteiro grudado deixava 60 px de conteúdo a 1024×768.
  const shown = items.filter((item) => part === 'all' || (part === 'allergy') === (item.key === 'alergia'));
  if (!shown.length) return null;

  const others = shown.filter((item) => item.key !== 'alergia');
  const folded = collapse && others.length >= 2 && !expanded;
  const visible = folded ? shown.filter((item) => item.key === 'alergia') : shown;
  const summaryTone = others.some((o) => o.tone === 'danger') ? 'danger' : 'warning';

  return (
    <ul className={`pr-alerts ${compact ? 'pr-alerts--compact' : ''}`.trim()} aria-label={part === 'others' ? 'Estados do paciente' : 'Alertas do paciente'}>
      {visible.map((item) => (
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
      {collapse && others.length >= 2 ? (
        <li className={`pr-alert pr-alert--summary pr-alert--${summaryTone}`}>
          <button type="button" className="pr-alert__summary" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            <span className="pr-alert__icon" aria-hidden="true"><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} /></span>
            <span className="pr-alert__text">
              <strong>{expanded ? 'Recolher estados' : `${others.length} estados do paciente`}</strong>
              {expanded ? null : <span>{others.map((o) => o.label.replace(/ \(\d+\)$/, '')).join(' · ')}</span>}
            </span>
          </button>
        </li>
      ) : null}
    </ul>
  );
}
