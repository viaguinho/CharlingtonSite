import { localDay } from '../../../core/periods.js';
import { isLate, isUnresolved, hasActiveConsent, stateOf } from '../../../core/appointments.js';
import { APPOINTMENT_STATUS_LABELS, STORES } from '../../../data/schema.js';
import { declaredAllergies } from './allergyConflict.js';

/**
 * Estados do paciente agora — a mesma leitura que o cabeçalho antigo fazia,
 * extraída para que a pílula da próxima consulta, as pílulas de alerta do
 * palco e a faixa do celular digam exatamente a mesma coisa.
 */
export function patientStates(patient, appointments, consents = [], unreadable = []) {
  // Leitura que falhou não é "nenhum registro": o estado fica DESCONHECIDO e o palco diz isso,
  // em vez de afirmar "sem consentimento" ou de calar um "sem desfecho".
  // O consentimento só pesa para quem tem teleconsulta; sem ela, não há o que verificar.
  const consentUnknown = unreadable.includes(STORES.CONSENTS) && appointments.some((a) => a.tipo === 'teleconsulta');
  const visitsUnknown = unreadable.includes(STORES.APPOINTMENTS);
  // O que ainda não aconteceu, de hoje em diante — inclusive um horário de
  // hoje já passado mas ainda pendente.
  const todayKey = localDay(new Date().toISOString());
  const open = appointments
    .filter((a) => localDay(a.inicio) >= todayKey && ['agendado', 'confirmado', 'aguardando', 'em_atendimento'].includes(a.status))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  // Quem está na recepção ou atrasado HOJE não tem "próxima consulta": tem uma
  // consulta acontecendo agora.
  const present = open.find((a) => ['aguardando', 'em_atendimento'].includes(a.status) && !isUnresolved(a)) ?? null;
  const late = open.find((a) => isLate(a)) ?? null;
  const next = open.find((a) => a !== present && !isLate(a) && !isUnresolved(a)) ?? null;
  // Horário passado sem desfecho (de hoje ou de outro dia): o mais recente.
  const unresolvedAll = appointments.filter((a) => isUnresolved(a)).sort((a, b) => b.inicio.localeCompare(a.inicio));
  const unresolved = unresolvedAll[0] ?? null;

  // Teleconsulta sem consentimento vigente: as já feitas e a próxima em aberto.
  // "Em aberto" inclui a de hoje que atrasou, a que já chegou e a que está em
  // atendimento: é quando o médico abre a chamada, e o alerta não pode sumir.
  const teleConsent = unreadable.includes(STORES.CONSENTS) || hasActiveConsent(consents, 'teleconsulta', patient.id);
  const teleDone = teleConsent ? [] : appointments.filter((a) => a.tipo === 'teleconsulta' && a.status === 'concluido');
  const teleNext = teleConsent ? null : open.find((a) => a.tipo === 'teleconsulta') ?? null;

  // "Nega alergias" e vazio não são alergia: viram o neutro "Nenhuma registrada".
  const allergies = declaredAllergies(patient.clinico?.alergias ?? []);

  return { present, late, next, unresolved, unresolvedAll, teleDone, teleNext, allergies, consentUnknown, visitsUnknown };
}

/** Primeiro atendimento concluído — início do acompanhamento. */
export function firstVisit(appointments) {
  return [...appointments]
    .filter((a) => a.status === 'concluido')
    .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''))[0] ?? null;
}

/**
 * Estado de UMA consulta como a tela deve dizê-lo — o mesmo das pílulas de
 * alerta e da Linha do tempo: uma consulta passada sem desfecho diz "Sem
 * desfecho", e a de hoje já passada sem chegada diz "Atrasado", mesmo que o
 * status gravado ainda seja "Confirmado". Azul não é estado: "Confirmado" fica
 * neutro (ponto vazado), e o rótulo diz o resto.
 */
const VISIT_TONE = {
  sem_desfecho: 'danger',
  atrasado: 'danger',
  faltou: 'danger',
  aguardando: 'warning',
  em_atendimento: 'warning',
  agendado: 'warning',   // sem confirmação: o mesmo âmbar do resto do sistema
  confirmado: 'pending',
  concluido: 'neutral',
  evento: 'neutral',
};
// "Na recepção" é como a pílula de alerta chama quem já chegou: a faixa diz igual.
const VISIT_LABEL = { sem_desfecho: 'Sem desfecho', atrasado: 'Atrasado', aguardando: 'Na recepção', evento: 'Evento' };

export function visitState(appointment, now = Date.now()) {
  const key = stateOf(appointment, now);
  return {
    key,
    label: VISIT_LABEL[key] ?? APPOINTMENT_STATUS_LABELS[key] ?? key,
    tone: VISIT_TONE[key] ?? 'neutral',
  };
}
