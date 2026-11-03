import { isoDay } from '../../core/format.js';
import { periodRange, previousRange, bucketsFor, bucketKey } from '../../core/periods.js';

/**
 * Recorte de datas dos Relatórios (redesign de 16/10).
 *
 * O período deixou de ser só "Semana / Mês / Trimestre / Ano": o calendário
 * da barra de ferramentas oferece esses atalhos e também um intervalo livre.
 * Um recorte é sempre `{ from, to, preset }`, com datas locais "AAAA-MM-DD".
 * A comparação é com o trecho anterior de MESMO tamanho; nos atalhos de
 * calendário, a regra de `previousRange` (mesmo trecho do mês anterior, com
 * corte no horário de agora).
 */

export const PRESETS = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este ano' },
  { value: '30d', label: 'Últimos 30 dias' },
];

const CALENDAR = new Set(['week', 'month', 'quarter', 'year']);

export function presetRange(preset, now = new Date()) {
  if (CALENDAR.has(preset)) return { ...periodRange(preset, now), preset };
  if (preset === '30d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: isoDay(from), to: isoDay(now), preset };
  }
  return presetRange('month', now);
}

/** Intervalo escolhido à mão: ordena as pontas e marca como personalizado. */
export function customRange(a, b) {
  const [from, to] = a <= b ? [a, b] : [b, a];
  return { from, to, preset: 'custom' };
}

export const atNoon = (day) => new Date(`${day}T12:00:00`);

export function daysBetween(range) {
  return Math.round((atNoon(range.to) - atNoon(range.from)) / 86400000) + 1;
}

function shiftDay(day, delta) {
  const d = atNoon(day);
  d.setDate(d.getDate() + delta);
  return isoDay(d);
}

/**
 * Trecho de comparação. Atalho de calendário: o mesmo trecho no período
 * anterior, cortado no horário de agora (`previousRange`). Últimos 30 dias:
 * os 30 dias antes, também cortados no horário de agora. Intervalo livre: os
 * N dias imediatamente antes, inteiros — um intervalo no passado está fechado.
 */
export function comparisonRange(range, now = new Date()) {
  if (CALENDAR.has(range.preset)) return previousRange(range.preset, range, now);
  const length = daysBetween(range);
  const to = shiftDay(range.from, -1);
  const from = shiftDay(range.from, -length);
  const today = isoDay(now);
  if (range.to >= today) {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    // O trecho corrente vai até agora: o anterior para no mesmo horário.
    return { from, to, cutoff: new Date(`${to}T${hh}:${mm}:00`).toISOString() };
  }
  return { from, to };
}

/** Grão das séries no tempo pelo TAMANHO do recorte, não pelo nome do atalho. */
export function grainFor(range) {
  const length = daysBetween(range);
  if (length <= 35) return 'day';
  if (length <= 140) return 'week';
  return 'month';
}

// `bucketsFor` e `bucketKey` de core/periods.js recebem um "período" e tiram
// dele o grão: aqui o grão vem do tamanho, e cada grão tem um período-chave.
const GRAIN_PERIOD = { day: 'month', week: 'quarter', month: 'year' };

export function rangeBuckets(range) {
  return bucketsFor(range, GRAIN_PERIOD[grainFor(range)]);
}

export function rangeBucketKey(day, range) {
  return bucketKey(day, GRAIN_PERIOD[grainFor(range)]);
}

export const GRAIN_LABEL = { day: 'por dia', week: 'por semana', month: 'por mês' };

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "16 out 2026" — o texto da pílula de data, no ritmo do "22 6 2025" da referência. */
export function pillDate(day) {
  const d = atNoon(day);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Nome do recorte por extenso, para legenda e relatório. */
export function rangeCaption(range, now = new Date()) {
  const dm = (day) => { const d = atNoon(day); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const preset = PRESETS.find((p) => p.value === range.preset);
  const running = range.to >= isoDay(now) ? ', em curso' : '';
  return `${preset ? `${preset.label} · ` : ''}${dm(range.from)} a ${dm(range.to)}${running}`;
}
