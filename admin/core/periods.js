import { isoDay } from './format.js';

/**
 * Períodos e agrupamento no tempo — um só lugar para todas as telas.
 *
 * A rodada 2 da crítica encontrou KPIs e gráficos da mesma tela contando
 * universos diferentes: o KPI somava o trimestre inteiro e o gráfico ao lado
 * mostrava só os últimos 30 dias; o caixa agrupava por mês e descartava os
 * meses sem saldo positivo. A causa era cada tela ter o seu recorte. Aqui o
 * recorte é um só, e o gráfico cobre exatamente o intervalo do KPI.
 */

export const PERIOD_GRAIN = {
  week: 'day',
  month: 'day',
  quarter: 'week',
  year: 'month',
};

/**
 * Período de CALENDÁRIO corrente, até hoje: esta semana (domingo a hoje, como
 * a Agenda), este mês, este trimestre, este ano.
 *
 * A primeira versão usava janelas móveis ("últimos 30 dias") enquanto a
 * Agenda usava o calendário. A mesma palavra "Mês" significava 17/08–16/09 numa
 * tela e setembro na outra, e "Concluídas" dava 38 aqui e 79 ali. Agora há um
 * só significado, e o intervalo é sempre escrito na tela (`periodCaption`).
 */
export function periodRange(period, reference = new Date()) {
  const to = new Date(reference);
  const from = new Date(reference);
  if (period === 'week') from.setDate(from.getDate() - from.getDay());
  else if (period === 'month') from.setDate(1);
  else if (period === 'quarter') from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1);
  else from.setMonth(0, 1);
  return { from: isoDay(from), to: isoDay(to) };
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "setembro de 2026 · 1 a 16/09, em curso" — o recorte dito por extenso. */
export function periodCaption(period, range) {
  const from = atNoon(range.from);
  const to = atNoon(range.to);
  const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const name = period === 'week' ? 'Esta semana'
    : period === 'month' ? from.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : period === 'quarter' ? `${Math.floor(from.getMonth() / 3) + 1}º trimestre de ${from.getFullYear()}`
    : String(from.getFullYear());
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return `${cap} · ${dm(from)} a ${dm(to)}, em curso`;
}

export { MONTHS_SHORT };

/**
 * Dia local ("AAAA-MM-DD") de um instante ISO.
 *
 * `instante.slice(0, 10)` lê a data em UTC. Brasília e Fortaleza estão três
 * horas a oeste: uma consulta às 21h30 vira "amanhã" e some da agenda de hoje.
 * Data pura (10 caracteres) passa direto — ela já é local por definição.
 */
export function localDay(instant) {
  if (!instant) return null;
  if (typeof instant === 'string' && instant.length === 10) return instant;
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * O mesmo trecho no período anterior: 01–16/09 compara com 01–16/08, a
 * semana até quarta com a semana anterior até quarta. Comparar um mês pela
 * metade com um mês inteiro faria toda variação parecer queda.
 */
export function previousRange(period, range, now = new Date()) {
  const shift = (day) => {
    const d = atNoon(day);
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === 'month') {
      const target = d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() - 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate();
      d.setDate(Math.min(target, last));
    } else if (period === 'quarter') {
      const target = d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() - 3);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate();
      d.setDate(Math.min(target, last));
    } else d.setFullYear(d.getFullYear() - 1);
    return isoDay(d);
  };
  // O período corrente vai até AGORA, não até o fim de hoje. À 01h42 de uma
  // quinta, comparar com a quinta anterior inteira fazia 8 atendimentos
  // parecerem queda de 43% (eram 10 contra 8 nos dias equivalentes). O corte
  // é o mesmo horário no último dia do trecho anterior.
  const to = shift(range.to);
  const cutoff = new Date(`${to}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);
  return { from: shift(range.from), to, cutoff: cutoff.toISOString() };
}

/**
 * O instante cai no trecho de comparação? Dia dentro do intervalo e, no último
 * dia, até o horário de corte. Data sem hora ("2026-09-10") conta como meio-dia.
 */
export function inWindow(instant, window) {
  const day = localDay(instant);
  if (!inRange(day, window)) return false;
  if (!window.cutoff || day < window.to) return true;
  const at = typeof instant === 'string' && instant.length === 10 ? new Date(`${instant}T12:00:00`) : new Date(instant);
  return at <= new Date(window.cutoff);
}

/**
 * "01–16/08" — rótulo curto do trecho de comparação. Leva o ano quando ele não
 * é o ano corrente: "01/01–16/09" sozinho parecia o mesmo intervalo do número
 * ao lado.
 */
export function rangeShort(range, reference = new Date()) {
  const a = atNoon(range.from);
  const b = atNoon(range.to);
  const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const year = b.getFullYear() !== reference.getFullYear() ? `/${b.getFullYear()}` : '';
  // Travessão cercado de "word joiner": "01–16/08" nunca quebra no meio.
  const dash = '\u2060–\u2060';
  // Com corte de horário, o rótulo diz até quando: "06–10/09 até 01h42".
  const until = range.cutoff
    ? `\u00a0até\u00a0${String(new Date(range.cutoff).getHours()).padStart(2, '0')}h${String(new Date(range.cutoff).getMinutes()).padStart(2, '0')}`
    : '';
  return (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${String(a.getDate()).padStart(2, '0')}${dash}${dm(b)}${year}`
    : `${dm(a)}${dash}${dm(b)}${year}`) + until;
}

/**
 * Há base para comparar? Só se existir ALGUM registro no intervalo anterior
 * ou antes dele. Sem histórico, "0 em 01/01–16/09/2025" não é um zero: é a
 * ausência de dado, e a tela precisa dizer isso em vez de calcular variação.
 */
export function hasHistory(days, previous, range) {
  // O "previous.to" é apenas o corte comparável (ex: 5 de julho). 
  // O histórico existe se houver algo antes do início do período corrente (ex: antes de 1º de outubro).
  return days.some((day) => day && day < (range ? range.from : previous.to));
}

export function inRange(day, range) {
  return Boolean(day) && day >= range.from && day <= range.to;
}

function atNoon(day) {
  return new Date(`${day}T12:00:00`);
}

function sundayOf(day) {
  const d = atNoon(day);
  d.setDate(d.getDate() - d.getDay());
  return isoDay(d);
}

/** Chave do balde a que um dia pertence, na granularidade do período. */
export function bucketKey(day, period) {
  if (!day) return null;
  const grain = PERIOD_GRAIN[period] ?? 'day';
  if (grain === 'month') return day.slice(0, 7);
  if (grain === 'week') return sundayOf(day);
  return day;
}

/**
 * Todos os baldes do intervalo, inclusive os vazios. Dia sem atendimento é
 * zero, não ausência: omitir o balde encolhe o eixo e aproxima datas que não
 * são vizinhas.
 */
export function bucketsFor(range, period) {
  const grain = PERIOD_GRAIN[period] ?? 'day';
  const out = [];
  const seen = new Set();
  const cursor = atNoon(range.from);
  const end = atNoon(range.to);
  const todayKey = bucketKey(range.to, period);

  while (cursor <= end) {
    const day = isoDay(cursor);
    const key = bucketKey(day, period);
    // Último dia do balde dentro do período: um acumulado é "até" esse dia,
    // não "desde" o início da semana — 06/09 não pode carregar o que foi pago em 10/09.
    if (seen.has(key)) {
      const last = out[out.length - 1];
      last.end = day;
      last.endLabel = atNoon(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    if (!seen.has(key)) {
      seen.add(key);
      // O balde de hoje ainda não terminou: numa semana ou num mês pela
      // metade, a barra menor não é queda de produção. O gráfico o marca.
      out.push({
        key, label: bucketLabel(key, grain, range), current: key === todayKey, partial: key === todayKey && grain !== 'day',
        weekend: grain === 'day' && [0, 6].includes(atNoon(day).getDay()),
        end: day, endLabel: atNoon(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  // Semana é rotulada pelo ÚLTIMO dia dentro do período, em toda tela. O
  // Financeiro (acumulado "até") usava o fim e os Relatórios o início: o mesmo
  // pagamento aparecia em 10/09 numa tela e na semana "06/09" na outra.
  if (grain === 'week') {
    for (const bucket of out) {
      const start = bucket.key < range.from ? range.from : bucket.key;
      bucket.startLabel = atNoon(start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      bucket.label = bucket.endLabel;
    }
  }
  return out;
}

function bucketLabel(key, grain, range) {
  if (grain === 'month') {
    const d = atNoon(`${key}-15`);
    const crossesYear = range.from.slice(0, 4) !== range.to.slice(0, 4);
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return crossesYear ? `${month}/${key.slice(2, 4)}` : month;
  }
  // Semana que começa antes do período leva o rótulo do primeiro dia DENTRO
  // do período: "28/06" sob um trimestre que começa em 01/07 contradizia a
  // legenda de datas logo acima.
  const shown = grain === 'week' && key < range.from ? range.from : key;
  return atNoon(shown).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Descrição do grão para legenda: "por dia", "por semana", "por mês". */
export function grainLabel(period) {
  const grain = PERIOD_GRAIN[period] ?? 'day';
  return grain === 'month' ? 'por mês' : grain === 'week' ? 'por semana' : 'por dia';
}
