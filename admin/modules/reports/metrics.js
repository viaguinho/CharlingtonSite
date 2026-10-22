import {
  APPOINTMENT_STATUS, APPOINTMENT_TYPE_LABELS, ENTRY_TYPES, ENTRY_STATUS, DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS, PATIENT_STATUS, PATIENT_STATUS_LABELS,
} from '../../data/schema.js';
import { findCID10 } from '../../data/cid10.js';
import { isoDay } from '../../core/format.js';
import { hasHistory, inRange, inWindow, localDay, rangeShort } from '../../core/periods.js';
import { isLate, isUpcoming, isUnresolved, waitInfo, confirmationWindow } from '../../core/appointments.js';
import { skylineWindow } from '../../charts/DotCalendar.jsx';
import { atNoon, grainFor, rangeBuckets, rangeBucketKey } from './period.js';

/**
 * Todos os números dos Relatórios, calculados num lugar só.
 *
 * A tela, o card ampliado, o CSV e o PDF do "Criar relatório" leem o mesmo
 * objeto: um número nunca é recalculado de outro jeito em outro lugar. As
 * regras (amostra mínima, corte de horário, "sem histórico") vieram da tela
 * antiga sem mudança — os comentários contam por quê.
 */

export const MIN_COMPARE = 3;
export const MIN_NOSHOW_SAMPLE = 5;
export const MIN_DAY_SAMPLE = 10;
export const MIN_TYPE_SAMPLE = 5;
export const MIN_RATE_GAP = 0.05;
export const MIN_NOSHOW_GAP = 2;

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Semana clínica começa na segunda; domingo vai para o fim e só aparece com dado.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const AGE_BANDS = [
  { key: '0-2', label: '0–2 anos', min: 0, max: 2 },
  { key: '3-5', label: '3–5 anos', min: 3, max: 5 },
  { key: '6-11', label: '6–11 anos', min: 6, max: 11 },
  { key: '12-17', label: '12–17 anos', min: 12, max: 17 },
  { key: '18+', label: '18 anos ou mais', min: 18, max: Infinity },
];

const PENDING = [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED];
const plural = (n, one, many) => (n === 1 ? one : many);
const sum = (list, pick = (x) => x) => list.reduce((t, x) => t + (Number(pick(x)) || 0), 0);
const mean = (list) => (list.length ? sum(list) / list.length : null);
const paidOn = (e) => localDay(e.pagamentoEm) ?? e.vencimento;

export function variation(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Indicadores de produção de um conjunto de agendamentos. */
export function summarizeProduction(appointments) {
  const done = appointments.filter((a) => a.status === APPOINTMENT_STATUS.DONE);
  const noShow = appointments.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW);
  const cancelled = appointments.filter((a) => a.status === APPOINTMENT_STATUS.CANCELLED);
  // Taxa de faltas = faltas ÷ atendimentos esperados (concluídos + faltas).
  // Cancelamento avisado não é falta e sai do denominador.
  const expected = done.length + noShow.length;
  const doneWithStart = done.filter((a) => a.inicioAtendimento);
  const teleconsultasCount = doneWithStart.filter((a) => a.tipo === 'teleconsulta').length;
  const missingStartCount = done.length - doneWithStart.length;
  const durations = doneWithStart
    .filter((a) => a.fimAtendimento)
    .map((a) => (new Date(a.fimAtendimento) - new Date(a.inicioAtendimento)) / 60000);
  // Espera é na recepção: teleconsulta não tem chegada à clínica e fica fora.
  const waitBaseList = appointments.filter((a) => a.tipo !== 'teleconsulta' && a.checkInEm && [APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.IN_PROGRESS].includes(a.status));
  const waits = waitBaseList.filter((a) => a.inicioAtendimento).map((a) => (new Date(a.inicioAtendimento) - new Date(a.checkInEm)) / 60000);
  return {
    done: done.length, noShow: noShow.length, cancelled: cancelled.length,
    expected, total: expected + cancelled.length,
    absenteeism: expected ? noShow.length / expected : null,
    avgDuration: mean(durations),
    avgWait: mean(waits),
    waitCount: waits.length,
    waitBase: waitBaseList.length,
    missingStartCount,
    missingWaitStartCount: waitBaseList.length - waits.length,
    teleconsultasCount,
  };
}

/** Diferença relativa entre a maior e a menor duração média. */
export function durationSpread(rows) {
  if (rows.length < 2) return 0;
  const values = rows.map((r) => r.value);
  return (Math.max(...values) - Math.min(...values)) / Math.max(...values);
}

/**
 * Baldes da série no grão diário sem o fim de semana vazio. Sábado e domingo
 * zerados entravam como queda e as linhas viravam serrote; com atendimento,
 * o dia fica.
 */
function workBuckets(range, hasData) {
  return rangeBuckets(range).filter((b) => !b.weekend || hasData(b));
}

/**
 * Série alinhada por posição: o 3º dia útil do período contra o 3º dia útil
 * do anterior. Por data corrida, os fins de semana dos dois trechos caíam em
 * posições diferentes e a faixa se fechava em triângulos.
 */
function alignedSeries(range, prevRange, pickCurrent, pickPrevious) {
  const prevBuckets = { from: prevRange.from, to: prevRange.to };
  const current = workBuckets(range, (b) => pickCurrent(b) !== 0);
  const previous = workBuckets(prevBuckets, (b) => pickPrevious(b) !== 0);
  const out = current.map((bucket, i) => ({
    key: bucket.key,
    label: bucket.label,
    partial: bucket.partial,
    current: pickCurrent(bucket),
    previous: previous[i] ? pickPrevious(previous[i]) : null,
    previousLabel: previous[i]?.label ?? null,
  }));
  // O anterior com mais dias úteis: a cauda entra sem par no atual (current
  // nulo), senão gráfico e tabela somavam menos que o número do cabeçalho.
  for (const bucket of previous.slice(current.length)) {
    out.push({ key: `prev-${bucket.key}`, label: '', partial: false, current: null, previous: pickPrevious(bucket), previousLabel: bucket.label, extra: true });
  }
  return out;
}

function countBy(list, keyOf) {
  const map = new Map();
  for (const item of list) {
    const key = keyOf(item);
    if (key == null) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * @param data   { appointments, patients, notes, entries, documents, consents, medications }
 * @param range  { from, to, preset }   recorte escolhido
 * @param prev   trecho de comparação (comparisonRange)
 * @param types  Set de tipos de atendimento a considerar, ou null (todos)
 * @param plaza  unidade selecionada, ou null
 */
export function computeReport({ data, range, prev, types = null, plaza = null, now = new Date(), continuityDays = 90 }) {
  const today = isoDay(now);
  const nowMs = now.getTime();

  // Filtro de tipo: vale para tudo o que vem de atendimento. Reunião interna
  // nunca é produção assistencial.
  const typeOk = (a) => !types || !types.size || types.has(a.tipo);
  const appointmentsAll = data.appointments.filter(typeOk);
  const appointmentIds = new Set(appointmentsAll.map((a) => a.id));
  // Receita ligada a atendimento segue o filtro; lançamento solto só entra sem filtro.
  const entryOk = (e) => !types || !types.size || (e.atendimentoId ? appointmentIds.has(e.atendimentoId) : false);
  const entriesAll = data.entries.filter((e) => e.tipo !== ENTRY_TYPES.REVENUE || entryOk(e));
  // Evolução e documento seguem o filtro pelo atendimento a que estão ligados;
  // sem vínculo, só entram sem filtro. Medicação do prontuário não tem vínculo.
  const linkedOk = (x) => !types || !types.size || (x.atendimentoId ? appointmentIds.has(x.atendimentoId) : false);

  const scoped = {
    appointments: appointmentsAll.filter((a) => inRange(localDay(a.inicio), range)),
    entries: entriesAll.filter((e) => inRange(paidOn(e), range)),
    // O perfil epidemiológico obedece ao período como todo o resto. Antes ele
    // somava o histórico inteiro sob um seletor de "Semana" e afirmava 28
    // registros de autismo numa semana, numa clínica de 12 pacientes.
    notes: data.notes.filter((n) => linkedOk(n) && inRange(localDay(n.assinadaEm ?? n.criadoEm), range)),
    documents: data.documents.filter((d) => linkedOk(d) && inRange(localDay(d.assinatura?.assinadoEm ?? d.criadoEm), range)),
    medications: (data.medications || []).filter((m) => {
      if (plaza && m.praca && m.praca !== plaza) return false;
      return inRange(localDay(m.iniciadaEm ?? m.criadoEm), range);
    }),
  };
  const patientsById = new Map(data.patients.map((p) => [p.id, p]));

  /* ─────────────────────────── Produção ─────────────────────────── */

  const production = {
    ...summarizeProduction(scoped.appointments),
    open: scoped.appointments.filter((a) => isUpcoming(a, nowMs)).length,
    late: scoped.appointments.filter((a) => isLate(a, nowMs)).length,
    waiting: scoped.appointments.filter((a) => [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS].includes(a.status) && !isUnresolved(a, nowMs)).length,
    unresolved: scoped.appointments.filter((a) => isUnresolved(a, nowMs)).length,
  };
  const prevAppointments = appointmentsAll.filter((a) => inWindow(a.inicio, prev));
  const previous = summarizeProduction(prevAppointments);
  const history = hasHistory(appointmentsAll.map((a) => localDay(a.inicio)), prev, range);
  // A janela anterior é descrita UMA vez para a página inteira: ou houve
  // registro nela (e todo número mostra a comparação), ou não houve.
  const prevHasRecords = history && previous.total > 0;
  // Comparação exige amostra dos dois lados: "−6 min" vindo de uma única
  // chegada registrada tinha o mesmo peso visual de uma tendência.
  const comparable = prevHasRecords && production.total >= MIN_COMPARE && previous.total >= MIN_COMPARE;
  const smallSample = prevHasRecords && !comparable;
  const prevLabel = rangeShort(prev);
  const noBase = appointmentsAll.length ? `sem registro em ${prevLabel} para comparar` : 'sem histórico anterior para comparar';

  const revenueEntries = scoped.entries.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PAID);
  const revenue = sum(revenueEntries, (e) => e.valor);
  const prevRevenueEntries = entriesAll.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && inWindow(e.pagamentoEm ?? e.vencimento, prev));
  const prevPaid = prevRevenueEntries.filter((e) => e.status === ENTRY_STATUS.PAID);
  const prevRevenue = sum(prevPaid, (e) => e.valor);
  // "R$ 0,00 em 01–06/07" afirmava uma medida onde não havia lançamento.
  const prevHasRevenue = prevRevenueEntries.length > 0;

  // Espera em curso: a média só conta atendimentos já iniciados. Quem está na
  // recepção agora fica fora dela — e a tela diz isso.
  const liveWaits = appointmentsAll
    .filter((a) => a.status === APPOINTMENT_STATUS.CHECKED_IN && a.checkInEm && localDay(a.inicio) === today)
    .map((a) => waitInfo(a, nowMs))
    .sort((a, b) => b.minutes - a.minutes);

  /* ─────────────────────── Tipos e duração ─────────────────────── */

  // Tipos dos CONCLUÍDOS — o mesmo universo do número principal.
  const typeMap = countBy(scoped.appointments.filter((a) => a.status === APPOINTMENT_STATUS.DONE), (a) => a.tipo);
  const typeTotal = sum([...typeMap.values()]);
  const byType = [...typeMap.entries()].sort((a, b) => b[1] - a[1]).map(([type, value]) => ({
    key: type,
    label: APPOINTMENT_TYPE_LABELS[type] ?? type,
    value,
    // Arredondamento simples: contagens iguais sempre têm o mesmo percentual.
    share: typeTotal ? value / typeTotal : 0,
  }));

  const durationMap = new Map();
  for (const a of scoped.appointments) {
    if (a.status !== APPOINTMENT_STATUS.DONE || !a.inicioAtendimento || !a.fimAtendimento) continue;
    const minutes = (new Date(a.fimAtendimento) - new Date(a.inicioAtendimento)) / 60000;
    const row = durationMap.get(a.tipo) ?? { sum: 0, n: 0 };
    row.sum += minutes; row.n += 1; durationMap.set(a.tipo, row);
  }
  const durationByType = [...durationMap.entries()].map(([type, r]) => ({
    key: type,
    label: APPOINTMENT_TYPE_LABELS[type] ?? type,
    value: r.sum / r.n,
    n: r.n,
    total: typeMap.get(type) ?? r.n,
  })).sort((a, b) => b.value - a.value);

  /* ──────────────────────── Séries no tempo ──────────────────────── */

  const grain = grainFor(range);
  const doneIn = (list, bucket, r) => list.filter((a) => a.status === APPOINTMENT_STATUS.DONE && rangeBucketKey(localDay(a.inicio), r) === bucket.key).length;
  const prevForBuckets = { from: prev.from, to: prev.to };
  const prevDone = prevAppointments;

  const comparison = alignedSeries(range, prev,
    (b) => doneIn(scoped.appointments, b, range),
    (b) => doneIn(prevDone, b, prevForBuckets));

  const noShowIn = (list, bucket, r) => list.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW && rangeBucketKey(localDay(a.inicio), r) === bucket.key).length;
  const noShowSeries = alignedSeries(range, prev,
    (b) => noShowIn(scoped.appointments, b, range),
    (b) => noShowIn(prevDone, b, prevForBuckets));

  const paidIn = (list, bucket, r) => sum(list.filter((e) => rangeBucketKey(paidOn(e), r) === bucket.key), (e) => e.valor);
  const receipts = alignedSeries(range, prev,
    (b) => paidIn(revenueEntries, b, range),
    (b) => paidIn(prevPaid, b, prevForBuckets));

  const waitIn = (bucket) => {
    const list = scoped.appointments.filter((a) => a.tipo !== 'teleconsulta' && a.checkInEm && a.inicioAtendimento
      && rangeBucketKey(localDay(a.inicio), range) === bucket.key);
    return list.length ? mean(list.map((a) => (new Date(a.inicioAtendimento) - new Date(a.checkInEm)) / 60000)) : null;
  };
  const waitSeries = workBuckets(range, (b) => waitIn(b) != null).map((b) => ({ key: b.key, label: b.label, current: waitIn(b) }));

  const doneOn = (b) => scoped.appointments.filter((a) => a.status === APPOINTMENT_STATUS.DONE && rangeBucketKey(localDay(a.inicio), range) === b.key);
  const newVsReturn = workBuckets(range, (b) => doneOn(b).length > 0).map((b) => {
    const done = doneOn(b);
    const first = done.filter((a) => a.tipo === 'primeira').length;
    return { key: b.key, label: b.label, current: first, previous: done.length - first };
  });

  const expenseEntries = scoped.entries.filter((e) => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PAID);
  const cashflow = workBuckets(range, (b) => paidIn(revenueEntries, b, range) + paidIn(expenseEntries, b, range) !== 0).map((b) => ({
    key: b.key, label: b.label,
    current: paidIn(revenueEntries, b, range),
    previous: paidIn(expenseEntries, b, range),
  }));

  /* ───────────────────── Dia da semana e horário ───────────────────── */

  const weekdayActivity = WEEK_ORDER.map((dow) => {
    const list = scoped.appointments.filter((a) => new Date(a.inicio).getDay() === dow);
    return {
      key: dow, label: WEEKDAYS_SHORT[dow], long: WEEKDAYS[dow],
      done: list.filter((a) => a.status === APPOINTMENT_STATUS.DONE).length,
      scheduled: list.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED && a.tipo !== 'evento').length,
    };
  }).filter((d) => d.key !== 0 || d.scheduled > 0);

  // Faltas por dia da semana: taxa sobre os encerrados daquele dia, não
  // contagem bruta — segunda tem mais agenda e teria mais faltas só por isso.
  const noShowByWeekday = [1, 2, 3, 4, 5].map((dow) => {
    const closed = scoped.appointments.filter((a) => new Date(a.inicio).getDay() === dow && [APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.NO_SHOW].includes(a.status));
    const noShow = closed.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW).length;
    return { key: dow, label: WEEKDAYS[dow], short: WEEKDAYS_SHORT[dow], closed: closed.length, noShow, rate: closed.length ? noShow / closed.length : 0 };
  });
  const comparableDays = noShowByWeekday.filter((d) => d.closed >= MIN_DAY_SAMPLE);
  const worstDay = (() => {
    const sorted = [...comparableDays].sort((a, b) => b.rate - a.rate);
    const [leader, second] = sorted;
    if (!leader?.rate || production.absenteeism == null || leader.rate <= production.absenteeism) return null;
    // Uma falta em cinco atendimentos não é padrão, é acaso.
    if (leader.noShow < MIN_NOSHOW_SAMPLE || leader.closed < MIN_DAY_SAMPLE) return null;
    // 6 de 38 contra 5 de 37 é uma falta de diferença, não "o dia que concentra as faltas".
    if (second && (leader.rate - second.rate < MIN_RATE_GAP || leader.noShow - second.noShow < MIN_NOSHOW_GAP)) return null;
    return leader;
  })();

  const occupancyList = scoped.appointments.filter((a) => a.status !== APPOINTMENT_STATUS.CANCELLED && a.tipo !== 'evento' && a.inicio);
  const hours = occupancyList.map((a) => new Date(a.inicio).getHours());
  const firstHour = Math.min(7, ...hours);
  const lastHour = Math.max(18, ...hours);
  const occupancyRows = WEEK_ORDER.filter((dow) => dow !== 0 || occupancyList.some((a) => new Date(a.inicio).getDay() === 0));
  const occupancyCols = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
  const occupancyValues = {};
  for (const a of occupancyList) {
    const d = new Date(a.inicio);
    const key = `${d.getDay()}:${d.getHours()}`;
    occupancyValues[key] = (occupancyValues[key] ?? 0) + 1;
  }
  // Pico com desempate estável (dia da semana, depois hora): o cabeçalho e o
  // destaque do mapa apontam o mesmo horário, e os empatados são contados.
  const occupancyRanked = Object.entries(occupancyValues).sort((a, b) => {
    const [da, ha] = a[0].split(':').map(Number);
    const [db, hb] = b[0].split(':').map(Number);
    return b[1] - a[1] || WEEK_ORDER.indexOf(da) - WEEK_ORDER.indexOf(db) || ha - hb;
  });
  const occupancyPeak = occupancyRanked[0] ?? null;
  const occupancy = {
    rows: occupancyRows.map((dow) => ({ key: dow, label: WEEKDAYS_SHORT[dow], long: WEEKDAYS[dow] })),
    cols: occupancyCols.map((h) => ({ key: h, label: `${String(h).padStart(2, '0')}h` })),
    values: occupancyValues,
    total: occupancyList.length,
    peak: occupancyPeak ? { dow: Number(occupancyPeak[0].split(':')[0]), hour: Number(occupancyPeak[0].split(':')[1]), value: occupancyPeak[1] } : null,
    tied: occupancyPeak ? occupancyRanked.filter(([, v]) => v === occupancyPeak[1]).length - 1 : 0,
  };

  /* ───────────────────────── Confirmações ───────────────────────── */

  const confirmations = confirmationWindow(appointmentsAll.filter((a) => a.tipo !== 'evento'), 7, nowMs);
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() + i + 1);
    const day = isoDay(d);
    const row = confirmations.byDay.find(([k]) => k === day)?.[1] ?? { total: 0, unconfirmed: 0 };
    return { day, label: WEEKDAYS_SHORT[d.getDay()], date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, ...row, confirmed: row.total - row.unconfirmed };
  });

  /* ─────────────────────── Calendário de 12 meses ─────────────────────── */

  // Primeiro registro da base: o que vem antes dele não é "zero atendimentos",
  // é ausência de dado. Desenhá-lo vazio fazia a produção parecer em queda.
  const firstRecordDay = appointmentsAll.map((a) => localDay(a.inicio)).filter(Boolean).sort()[0] ?? null;
  const calendarWindow = skylineWindow(today);
  const doneByDay = countBy(appointmentsAll.filter((a) => a.status === APPOINTMENT_STATUS.DONE), (a) => localDay(a.inicio));
  const missedByDay = countBy(appointmentsAll.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW), (a) => localDay(a.inicio));
  const calendarDays = [...doneByDay.keys()].filter((d) => d >= calendarWindow.from && d <= calendarWindow.to)
    .map((date) => ({ date, count: doneByDay.get(date), missed: missedByDay.get(date) ?? 0 }));
  const calendarTotal = sum(calendarDays, (d) => d.count);
  const busiest = calendarDays.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), null);
  // Médias só com dias FECHADOS: hoje ainda está em curso.
  const inPeriodDays = calendarDays.filter((d) => inRange(d.date, range));
  const closedDays = inPeriodDays.filter((d) => d.date !== today);
  const calendar = {
    window: calendarWindow,
    days: calendarDays,
    done: doneByDay,
    missed: missedByDay,
    firstRecordDay,
    total: calendarTotal,
    busiest,
    periodDays: inPeriodDays.length,
    closedDays: closedDays.length,
    closedMean: closedDays.length ? sum(closedDays, (d) => d.count) / closedDays.length : null,
  };

  /* ───────────────────────────── Clínico ───────────────────────────── */

  // Crianças distintas por CID, não evoluções: um paciente com 23 retornos
  // pesava como 23 casos e o "perfil da clínica" era o perfil da agenda.
  const cidMap = new Map();
  for (const note of scoped.notes) {
    if (!note.cidPrincipal || !note.pacienteId) continue;
    if (!cidMap.has(note.cidPrincipal)) cidMap.set(note.cidPrincipal, new Set());
    cidMap.get(note.cidPrincipal).add(note.pacienteId);
  }
  const epidemiology = [...cidMap.entries()]
    .map(([code, children]) => ({ key: code, code, label: findCID10(code)?.descricao ?? '', value: children.size }))
    .sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
  const cidChildren = new Set(scoped.notes.filter((n) => n.cidPrincipal).map((n) => n.pacienteId)).size;

  // Medicações: por princípio ativo (ou nome), contando crianças distintas.
  const medMap = new Map();
  const registerMed = (rawName, patientId) => {
    const clean = String(rawName ?? '').trim();
    if (!clean) return;
    const label = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    const entry = medMap.get(label) ?? { label, children: new Set(), total: 0 };
    if (patientId) entry.children.add(patientId);
    entry.total += 1;
    medMap.set(label, entry);
  };
  for (const med of scoped.medications) registerMed(med.principioAtivo || med.nome, med.pacienteId);
  for (const doc of scoped.documents) {
    if (doc.tipo !== DOCUMENT_TYPES.PRESCRIPTION && !doc.itens?.length) continue;
    for (const item of doc.itens ?? []) registerMed(item.principio || item.nome || item.medicamento, doc.pacienteId);
  }
  const medications = [...medMap.values()]
    .map((e) => ({ key: e.label, label: e.label, value: e.children.size || e.total }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const medChildren = new Set([
    ...scoped.medications.filter((m) => m.principioAtivo || m.nome).map((m) => m.pacienteId),
    ...scoped.documents.filter((d) => d.tipo === DOCUMENT_TYPES.PRESCRIPTION && d.itens?.length).map((d) => d.pacienteId),
  ].filter(Boolean)).size;

  // Documentos emitidos: rascunho não é documento emitido.
  const issued = scoped.documents.filter((d) => d.status !== DOCUMENT_STATUS.DRAFT && d.status !== DOCUMENT_STATUS.REPLACED);
  const docMap = countBy(issued, (d) => d.tipo);
  const documentsByType = [...docMap.entries()]
    .map(([type, value]) => ({ key: type, label: shortDocLabel(type), long: DOCUMENT_TYPE_LABELS[type] ?? type, value }))
    .sort((a, b) => b.value - a.value);

  /* ──────────────────────────── Pacientes ──────────────────────────── */

  const doneInRange = scoped.appointments.filter((a) => a.status === APPOINTMENT_STATUS.DONE && a.pacienteId);
  const lastDoneInRange = new Map();
  for (const a of doneInRange) {
    const cur = lastDoneInRange.get(a.pacienteId);
    if (!cur || a.inicio > cur.inicio) lastDoneInRange.set(a.pacienteId, a);
  }
  const attendedIds = [...lastDoneInRange.keys()];

  const bandOf = (patient, at) => {
    if (!patient?.dataNascimento) return null;
    const birth = atNoon(patient.dataNascimento);
    const ref = new Date(at);
    let years = ref.getFullYear() - birth.getFullYear();
    if (ref.getMonth() < birth.getMonth() || (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())) years -= 1;
    return AGE_BANDS.find((b) => years >= b.min && years <= b.max)?.key ?? null;
  };
  const bandCounts = (lastMap) => {
    const counts = new Map(AGE_BANDS.map((b) => [b.key, 0]));
    let unknown = 0;
    for (const [pid, a] of lastMap) {
      const key = bandOf(patientsById.get(pid), a.inicio);
      if (key) counts.set(key, counts.get(key) + 1); else unknown += 1;
    }
    return { counts, unknown };
  };
  const prevLast = new Map();
  for (const a of prevAppointments) {
    if (a.status !== APPOINTMENT_STATUS.DONE || !a.pacienteId) continue;
    const cur = prevLast.get(a.pacienteId);
    if (!cur || a.inicio > cur.inicio) prevLast.set(a.pacienteId, a);
  }
  const bandsNow = bandCounts(lastDoneInRange);
  const bandsPrev = bandCounts(prevLast);
  const ageBands = AGE_BANDS
    .map((b) => ({ key: b.key, label: b.label.replace(' anos', '').replace(' ou mais', '+'), long: b.label, value: bandsNow.counts.get(b.key), previous: bandsPrev.counts.get(b.key) }))
    .filter((b) => b.key !== '18+' || b.value > 0);

  const insuranceMap = new Map();
  for (const pid of attendedIds) {
    const p = patientsById.get(pid);
    const c = p?.convenio;
    const label = !c || c.particular || !c.operadora ? 'Particular' : c.operadora;
    insuranceMap.set(label, (insuranceMap.get(label) ?? 0) + 1);
  }
  const insurance = [...insuranceMap.entries()].map(([label, value]) => ({ key: label, label, value, share: attendedIds.length ? value / attendedIds.length : 0 }))
    .sort((a, b) => b.value - a.value);

  const unitPatients = data.patients;
  const statusMap = countBy(unitPatients, (p) => p.status || PATIENT_STATUS.ACTIVE);
  const patientStatus = [PATIENT_STATUS.ACTIVE, PATIENT_STATUS.INACTIVE, PATIENT_STATUS.DISCHARGED].map((s) => ({
    key: s, label: PATIENT_STATUS_LABELS[s], value: statusMap.get(s) ?? 0, share: unitPatients.length ? (statusMap.get(s) ?? 0) / unitPatients.length : 0,
  }));
  const newPatients = unitPatients.filter((p) => inRange(localDay(p.criadoEm), range)).length;
  const firstVisits = doneInRange.filter((a) => a.tipo === 'primeira').length;

  /* ─────────────────────── Continuidade do cuidado ─────────────────────── */

  // Com retorno: depois do último concluído do período há outro atendimento
  // (já feito ou marcado), que não seja falta nem cancelamento.
  const byPatient = new Map();
  for (const a of data.appointments) {
    if (!a.pacienteId || a.tipo === 'evento') continue;
    if (!byPatient.has(a.pacienteId)) byPatient.set(a.pacienteId, []);
    byPatient.get(a.pacienteId).push(a);
  }
  // Agendado/confirmado só conta se ainda vai acontecer: um marcado que já
  // passou sem desfecho pode ter sido falta, e inflava o número do topo.
  const hasReturnAfter = (pid, after) => (byPatient.get(pid) ?? []).some((a) => a.inicio > after
    && ([APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS].includes(a.status)
      || (PENDING.includes(a.status) && new Date(a.inicio).getTime() >= nowMs)));
  const withReturn = attendedIds.filter((pid) => hasReturnAfter(pid, lastDoneInRange.get(pid).inicio));
  const prevAttended = [...prevLast.keys()];
  const prevWithReturn = prevAttended.filter((pid) => hasReturnAfter(pid, prevLast.get(pid).inicio));

  const cutoffDay = (() => { const d = new Date(now); d.setDate(d.getDate() - continuityDays); return isoDay(d); })();
  const followUp = [];
  let activeWithVisit = 0;
  for (const p of unitPatients) {
    if ((p.status || PATIENT_STATUS.ACTIVE) !== PATIENT_STATUS.ACTIVE) continue;
    const list = byPatient.get(p.id) ?? [];
    const done = list.filter((a) => a.status === APPOINTMENT_STATUS.DONE).sort((a, b) => b.inicio.localeCompare(a.inicio));
    if (!done.length) continue;
    activeWithVisit += 1;
    const last = done[0];
    const scheduled = list.some((a) => PENDING.includes(a.status) && new Date(a.inicio).getTime() >= nowMs);
    if (!scheduled && localDay(last.inicio) < cutoffDay) {
      followUp.push({
        id: p.id,
        name: p.nomeSocial || p.nome,
        lastVisit: localDay(last.inicio),
        days: Math.round((atNoon(today) - atNoon(localDay(last.inicio))) / 86400000),
        lastType: APPOINTMENT_TYPE_LABELS[last.tipo] ?? last.tipo,
      });
    }
  }
  followUp.sort((a, b) => b.days - a.days);
  const continuity = {
    days: continuityDays,
    attended: attendedIds.length,
    withReturn: withReturn.length,
    without: attendedIds.length - withReturn.length,
    share: attendedIds.length ? withReturn.length / attendedIds.length : null,
    prevShare: prevAttended.length ? prevWithReturn.length / prevAttended.length : null,
    active: activeWithVisit,
    overdue: followUp.length,
    onTrack: activeWithVisit - followUp.length,
    list: followUp,
    withoutList: attendedIds.filter((pid) => !withReturn.includes(pid)).map((pid) => {
      const p = patientsById.get(pid);
      return { id: pid, name: p?.nomeSocial || p?.nome || 'Paciente', lastVisit: localDay(lastDoneInRange.get(pid).inicio) };
    }),
  };

  /* ──────────────────────────── Financeiro ──────────────────────────── */

  const methodMap = new Map();
  for (const e of revenueEntries) {
    const label = e.formaPagamento || 'Não informada';
    methodMap.set(label, (methodMap.get(label) ?? 0) + (Number(e.valor) || 0));
  }
  const paymentMethods = [...methodMap.entries()]
    .map(([label, value]) => ({ key: label, label, value, share: revenue ? value / revenue : 0 }))
    .sort((a, b) => b.value - a.value);

  const dueInRange = entriesAll.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && inRange(e.vencimento, range) && e.status !== ENTRY_STATUS.CANCELLED);
  const isOverdue = (e) => e.status === ENTRY_STATUS.OVERDUE || (e.status === ENTRY_STATUS.PENDING && e.vencimento < today);
  const overdueEntries = dueInRange.filter(isOverdue);
  const pendingEntries = dueInRange.filter((e) => e.status === ENTRY_STATUS.PENDING && !isOverdue(e));
  const paidDue = dueInRange.filter((e) => e.status === ENTRY_STATUS.PAID);
  const receivables = {
    open: sum(pendingEntries, (e) => e.valor) + sum(overdueEntries, (e) => e.valor),
    pending: sum(pendingEntries, (e) => e.valor),
    pendingCount: pendingEntries.length,
    overdue: sum(overdueEntries, (e) => e.valor),
    overdueCount: overdueEntries.length,
    paid: sum(paidDue, (e) => e.valor),
    paidCount: paidDue.length,
    total: sum(dueInRange, (e) => e.valor),
  };

  const expenseMap = new Map();
  for (const e of expenseEntries) {
    const label = e.categoria || 'Sem categoria';
    expenseMap.set(label, (expenseMap.get(label) ?? 0) + (Number(e.valor) || 0));
  }
  const expenses = sum(expenseEntries, (e) => e.valor);
  const expensesByCategory = [...expenseMap.entries()]
    .map(([label, value]) => ({ key: label, label, value, share: expenses ? value / expenses : 0 }))
    .sort((a, b) => b.value - a.value);

  const ticket = revenueEntries.length ? revenue / revenueEntries.length : null;
  const prevTicket = prevPaid.length ? prevRevenue / prevPaid.length : null;

  return {
    range, prev, grain, today, now,
    scoped,
    production, previous, comparable, prevHasRecords, smallSample, prevLabel, noBase,
    revenue, revenueCount: revenueEntries.length, prevRevenue, prevHasRevenue, liveWaits,
    byType, durationByType,
    comparison, noShowSeries, receipts, waitSeries, newVsReturn, cashflow,
    weekdayActivity, noShowByWeekday, comparableDays, worstDay, occupancy,
    confirmations, next7,
    calendar,
    epidemiology, cidChildren, medications, medChildren, documentsByType, documentsIssued: issued.length,
    ageBands, ageUnknown: bandsNow.unknown, attended: attendedIds.length, insurance, patientStatus, newPatients, firstVisits,
    continuity,
    paymentMethods, receivables, expenses, expensesByCategory, ticket, prevTicket,
    consents: data.consents ?? [],
    hasData: data.appointments.length > 0,
    plural,
  };
}

/** Rótulo curto de documento para eixo de gráfico. */
function shortDocLabel(type) {
  return ({
    prescricao: 'Prescrição',
    prescricao_especial_b: 'Receita B',
    prescricao_especial_a: 'Receita A',
    atestado_comparecimento: 'Comparec.',
    atestado_medico: 'Atestado',
    declaracao_acompanhante: 'Acompanh.',
    laudo: 'Laudo',
    relatorio_escolar: 'Escola',
    relatorio_convenio: 'Convênio',
    encaminhamento: 'Encaminh.',
    solicitacao_exames: 'Exames',
  })[type] ?? type;
}
