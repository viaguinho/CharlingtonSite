import { localDay } from './periods.js';

/**
 * Estado de um agendamento como a CLÍNICA o enxerga agora.
 *
 * O status gravado é o último que alguém registrou. Uma consulta das 10h que
 * às 14h segue "Confirmada" não está confirmada: está atrasada, sem chegada.
 * Cada tela calculava isso de um jeito — a Agenda Dia dizia "Atrasado", a Lista
 * dizia "Confirmado" e os Relatórios a contavam como "ainda por acontecer".
 * Agora há uma regra só, e toda tela a usa.
 */

/** Minutos após o horário marcado para a consulta sem chegada contar como atraso. */
export const LATE_AFTER_MINUTES = 15;

const PENDING = ['agendado', 'confirmado'];
const ACTIVE = ['agendado', 'confirmado', 'aguardando', 'em_atendimento'];

export function isLate(appointment, now = Date.now()) {
  return PENDING.includes(appointment.status)
    && localDay(appointment.inicio) === localDay(new Date(now).toISOString())
    && now - new Date(appointment.inicio).getTime() > LATE_AFTER_MINUTES * 60000;
}

/** Ainda vai acontecer: pendente, não atrasado e não de um dia que já passou. */
export function isUpcoming(appointment, now = Date.now()) {
  return PENDING.includes(appointment.status)
    && new Date(appointment.inicio).getTime() + LATE_AFTER_MINUTES * 60000 >= now;
}

/** Em aberto hoje ou adiante (inclui quem está na recepção e o atrasado de hoje). */
export function isOpen(appointment, now = Date.now()) {
  return ACTIVE.includes(appointment.status)
    && localDay(appointment.inicio) >= localDay(new Date(now).toISOString());
}

/**
 * Sem desfecho: o horário já passou e ninguém registrou o que aconteceu.
 * Consulta de ontem ainda "Confirmada", criança "Aguardando" desde as 09:15
 * de ontem — não é pendente nem está na recepção. Contá-la como qualquer das
 * duas escondia o caso (somas que fechavam 19 de 20) ou mostrava "esperando
 * há 16 h". É um registro que falta, e toda tela o conta aqui.
 */
export function isUnresolved(appointment, now = Date.now()) {
  if (!ACTIVE.includes(appointment.status)) return false;
  const today = localDay(new Date(now).toISOString());
  if (localDay(appointment.inicio) < today) return true;
  return appointment.status === 'aguardando' && waitInfo(appointment, now).stale;
}

/**
 * O estado que a tela mostra, em uma chave: 'sem_desfecho', 'atrasado' ou o
 * status gravado. Filtros, contagens e chips usam esta chave — assim as abas
 * somam o "Todos" e o KPI conta o mesmo que o chip diz.
 */
export function stateOf(appointment, now = Date.now()) {
  if (isUnresolved(appointment, now)) return 'sem_desfecho';
  if (isLate(appointment, now)) return 'atrasado';
  return appointment.status;
}

export const DERIVED_STATE_LABELS = {
  sem_desfecho: 'Sem desfecho registrado',
  atrasado: 'Atrasado, sem chegada',
};

/** Rótulo e tom de exibição, já considerando atraso e falta de desfecho. */
export function displayStatus(appointment, labels, tones, now = Date.now()) {
  const state = stateOf(appointment, now);
  if (state === 'sem_desfecho') {
    return { label: DERIVED_STATE_LABELS.sem_desfecho, tone: 'danger', icon: 'history', late: false, unresolved: true };
  }
  if (state === 'atrasado') return { label: DERIVED_STATE_LABELS.atrasado, tone: 'danger', icon: 'alert-triangle', late: true };
  // Confirmado e agendado dividem o tom neutro; o ícone os distingue sem cor.
  const icon = appointment.status === 'confirmado' ? 'check' : undefined;
  return { label: labels[appointment.status] ?? appointment.status, tone: tones[appointment.status] ?? 'neutral', icon, late: false };
}

/**
 * Espera na recepção. Acima de STALE_WAIT_MINUTES a tela não afirma "espera há
 * 12h": ninguém espera 12 horas numa recepção. O que existe é uma chegada
 * registrada sem início de atendimento — um registro a conferir, não uma espera.
 */
export const STALE_WAIT_MINUTES = 240;

export function waitInfo(appointment, now = Date.now()) {
  if (!appointment.checkInEm) return { minutes: null, stale: false };
  const minutes = Math.max(0, Math.round((now - new Date(appointment.checkInEm)) / 60000));
  return { minutes, stale: minutes > STALE_WAIT_MINUTES };
}

/**
 * Consultas por acontecer nas próximas `days` × 24 h, e quantas estão
 * confirmadas. A Visão geral e os Relatórios contam pela mesma regra.
 */
export function confirmationWindow(appointments, days = 7, now = Date.now()) {
  // Dias de CALENDÁRIO, de amanhã até hoje + 7 (18 a 24/09 numa quinta, 17/09).
  // A janela móvel de 168 h mudava o número sozinha ao longo do dia e não
  // fechava com a lista de dias da mesma tela.
  const base = new Date(now);
  const day = (offset) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const range = { from: day(1), to: day(days) };
  const upcoming = appointments.filter((a) => {
    const d = localDay(a.inicio);
    return d >= range.from && d <= range.to && PENDING.includes(a.status);
  });
  const confirmed = upcoming.filter((a) => a.status === 'confirmado').length;
  // A primeira sem confirmação é por onde a recepção começa a ligar.
  const firstUnconfirmed = upcoming
    .filter((a) => a.status !== 'confirmado')
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0] ?? null;
  const byDay = new Map();
  for (const a of upcoming) {
    const d = localDay(a.inicio);
    const row = byDay.get(d) ?? { total: 0, unconfirmed: 0 };
    row.total += 1;
    if (a.status !== 'confirmado') row.unconfirmed += 1;
    byDay.set(d, row);
  }
  return {
    range, total: upcoming.length, confirmed, unconfirmed: upcoming.length - confirmed, firstUnconfirmed,
    byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

/**
 * O(s) mais antigo(s) de uma lista, por DIA. Dois laudos de 21/07 empatam:
 * nomear só um escondia o outro.
 */
export function oldestByDay(items, dayOf) {
  if (!items.length) return null;
  const day = items.map(dayOf).filter(Boolean).sort()[0];
  return { day, items: items.filter((item) => dayOf(item) === day) };
}

/** "Bernardo Lins Teixeira", "Bernardo e Heitor", "Bernardo, Heitor e mais 2". */
export function namesList(names) {
  const unique = [...new Set(names)];
  if (unique.length <= 1) return unique[0] ?? '—';
  const first = unique.map((n) => n.split(' ')[0]);
  if (unique.length === 2) return `${first[0]} e ${first[1]}`;
  return `${first[0]}, ${first[1]} e mais ${unique.length - 2}`;
}

/**
 * Faltas seguidas: quantas das últimas consultas encerradas (concluída ou
 * falta) foram falta, a partir da mais recente. Duas faltas em dois dias
 * seguidos de uma criança em acompanhamento é sinal clínico, não estatística.
 */
export const CONSECUTIVE_NO_SHOW_ALERT = 2;

export function trailingNoShows(appointments) {
  const closed = appointments
    .filter((a) => a.status === 'concluido' || a.status === 'faltou')
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const run = [];
  for (const a of closed) {
    if (a.status !== 'faltou') break;
    run.push(a);
  }
  return run;
}

/**
 * Consentimento vigente para uma finalidade: o registro mais recente dela,
 * concedido e não revogado. Teleconsulta sem ele não tem base legal
 * (LGPD art. 14, §1º; Res. CFM 2.314/2022).
 */
export function hasActiveConsent(consents, purpose, patientId) {
  const latest = consents
    .filter((c) => c.finalidade === purpose && (!patientId || c.pacienteId === patientId || c.titularId === patientId))
    .sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? ''))[0];
  return Boolean(latest?.concedidoEm && !latest.revogadoEm);
}

/**
 * Famílias com opt-in vigente para mensagens (WhatsApp ou e-mail). Sem
 * nenhuma, "Pedir confirmação" não tem a quem escrever: a tela que oferece a
 * ação precisa dizer isso antes do clique.
 */
export function messagingOptIn(consents = []) {
  const ids = new Set(consents
    .filter((c) => ['comunicacao_whatsapp', 'comunicacao_email'].includes(c.finalidade)
      && c.concedidoEm && !c.revogadoEm)
    .map((c) => c.pacienteId ?? c.titularId));
  return ids.size;
}

/**
 * Teleconsultas sem consentimento vigente da família: as já realizadas (o
 * registro que falta regularizar) e as marcadas (antes de acontecer). Contar só
 * as futuras escondia 11 atendimentos feitos sem base legal.
 */
export function teleconsultsWithoutConsent(appointments, consents) {
  const tele = appointments.filter((a) => a.tipo === 'teleconsulta'
    && !hasActiveConsent(consents, 'teleconsulta', a.pacienteId));
  const done = tele.filter((a) => a.status === 'concluido');
  const upcoming = tele.filter((a) => isUpcoming(a)).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const children = new Set([...done, ...upcoming].map((a) => a.pacienteId));
  return { done, upcoming, children };
}
