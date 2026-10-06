/**
 * Formatação pt-BR. Todas as funções aceitam entrada inválida/ausente e
 * devolvem um marcador legível ("—") em vez de "NaN" ou "Invalid Date".
 * Um painel clínico nunca deve exibir lixo técnico ao usuário.
 */

const EMPTY = '—';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat('pt-BR');

/** Moeda: 1234.5 → "R$ 1.234,50" */
export function money(value) {
  if (value == null || Number.isNaN(Number(value))) return EMPTY;
  // Sinal de menos tipográfico (−), o mesmo do KPI: "-R$" com hífen e "−R$"
  // no mesmo card eram dois negativos diferentes.
  // Mesma ordem do KPI: "R$ −21.170,00" (moeda, sinal colado aos dígitos).
  const n = Number(value);
  return n < 0 ? `R$\u00a0−${brl.format(-n).replace(/^R\$\s?/, '')}` : brl.format(n);
}

/** Número com separador de milhar: 10832 → "10.832" */
export function number(value, digits) {
  if (value == null || Number.isNaN(Number(value))) return EMPTY;
  if (digits != null) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(Number(value));
  }
  return decimal.format(Number(value));
}

/** Percentual: 0.732 → "73,2%" (entrada em fração) */
export function percent(fraction, digits = 1) {
  if (fraction == null || Number.isNaN(Number(fraction))) return EMPTY;
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(Number(fraction));
}

/**
 * Métricas grandes ganham sufixo de unidade, renderizado em corpo menor pela UI.
 * Devolve as partes separadas para que o componente controle a tipografia.
 * 10832 → { value: "10,8", suffix: "k" }
 */
export function compact(value) {
  if (value == null || Number.isNaN(Number(value))) return { value: EMPTY, suffix: '' };
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return { value: number(n / 1_000_000, 1), suffix: 'M' };
  if (abs >= 1_000) return { value: number(n / 1_000, 1), suffix: 'k' };
  return { value: number(n), suffix: '' };
}

/** Moeda abreviada para eixo de gráfico: 19600 → "R$ 20 mil"; 1250000 → "R$ 1,3 mi". */
export function compactMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return EMPTY;
  const n = Number(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}R$ ${number(abs / 1_000_000, abs >= 10_000_000 ? 0 : 1)} mi`;
  if (abs >= 1_000) return `${sign}R$ ${number(Math.round(abs / 100) / 10)} mil`;
  return `${sign}R$ ${number(Math.round(abs))}`;
}

/**
 * Converte a entrada em Date.
 *
 * Uma string "AAAA-MM-DD" é interpretada pelo JavaScript como meia-noite UTC.
 * Em qualquer fuso a oeste de Greenwich — inclusive o de Campinas e o de
 * Fortaleza — isso cai no dia ANTERIOR quando formatado em hora local, e uma
 * data de nascimento passa a aparecer um dia mais cedo do que foi digitada.
 * Ancorar no meio-dia local resolve, e é imune a horário de verão.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const value = typeof input === 'string' && DATE_ONLY.test(input) ? `${input}T12:00:00` : input;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 2026-09-15 → "15/09/2026" */
export function date(input) {
  const d = toDate(input);
  return d ? d.toLocaleDateString('pt-BR') : EMPTY;
}

/** 2026-09-15T14:30 → "15/09/2026 14:30" */
export function dateTime(input) {
  const d = toDate(input);
  if (!d) return EMPTY;
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** 2026-09-15T14:30 → "14:30" */
export function time(input) {
  const d = toDate(input);
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : EMPTY;
}

/** 2026-09-15 → "terça-feira, 15 de setembro de 2026" */
export function dateLong(input) {
  const d = toDate(input);
  if (!d) return EMPTY;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Chave ISO local (sem deslocamento de fuso): 2026-09-15 */
export function isoDay(input) {
  const d = toDate(input) ?? new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Idade pediátrica. Abaixo de 2 anos a idade em meses é clinicamente
 * relevante — é assim que se lê um marco de desenvolvimento.
 * Devolve { years, months, label }.
 */
export function age(birthDate, reference = new Date()) {
  const b = toDate(birthDate);
  const r = toDate(reference);
  if (!b || !r || b > r) return { years: null, months: null, label: EMPTY };

  let years = r.getFullYear() - b.getFullYear();
  let months = r.getMonth() - b.getMonth();
  if (r.getDate() < b.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }

  const totalMonths = years * 12 + months;
  let label;
  if (totalMonths < 1) {
    const days = Math.floor((r - b) / 86_400_000);
    label = `${days} ${days === 1 ? 'dia' : 'dias'}`;
  } else if (years < 2) {
    label = `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`;
  } else if (months === 0) {
    label = `${years} anos`;
  } else {
    label = `${years}a ${months}m`;
  }
  return { years, months, totalMonths, label };
}

/**
 * "há 3 dias", "em 2 semanas", "há 4 meses".
 *
 * Conta em dias de CALENDÁRIO local, não em milissegundos: uma consulta de
 * anteontem às 16h vista hoje às 10h tem 1,75 dia de diferença, que
 * arredondado ou truncado virava "ontem". A escala nunca arredonda para cima
 * e cada degrau só começa quando o anterior perde precisão útil: dias até 20,
 * semanas inteiras até 12 semanas, meses de calendário até 23, depois anos.
 * Duas datas iguais sempre recebem o mesmo texto.
 */
export function relative(input, reference = new Date()) {
  const d = toDate(input);
  const ref = toDate(reference);
  if (!d || !ref) return EMPTY;

  const dayOf = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((dayOf(d) - dayOf(ref)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });
  const rtfAuto = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const abs = Math.abs(days);
  const sign = Math.sign(days);

  if (abs === 0) {
    // Mesmo dia: instantes ganham horas/minutos; datas puras são "hoje".
    if (typeof input === 'string' && DATE_ONLY.test(input)) return 'hoje';
    const minutes = Math.trunc((d.getTime() - ref.getTime()) / 60_000);
    if (Math.abs(minutes) < 1) return 'agora';
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    return rtf.format(Math.trunc(minutes / 60), 'hour');
  }
  if (abs === 1) return rtfAuto.format(days, 'day');
  if (abs <= 20) return rtf.format(days, 'day');
  if (abs < 91) return rtf.format(sign * Math.floor(abs / 7), 'week');

  const [early, late] = days < 0 ? [d, ref] : [ref, d];
  let months = (late.getFullYear() - early.getFullYear()) * 12 + (late.getMonth() - early.getMonth());
  if (late.getDate() < early.getDate()) months -= 1;
  if (months < 24) return rtf.format(sign * Math.max(months, 3), 'month');
  return rtf.format(sign * Math.floor(months / 12), 'year');
}

/** Duração em minutos → "1h 30min" */
export function duration(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return EMPTY;
  const m = Math.round(Number(minutes));
  if (m < 60) return `${m}\u00a0min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  // Espaço inseparável: "5h 37min" não pode quebrar no meio do valor.
  return rest ? `${h}h\u00a0${rest}\u00a0min` : `${h}h`;
}

/** 12345678901 → "123.456.789-01" */
export function cpf(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length !== 11) return value || EMPTY;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** 11987654321 → "(11) 98765-4321" */
export function phone(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value || EMPTY;
}

/** 123456789012345 → "123 4567 8901 2345" */
export function cns(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length !== 15) return value || EMPTY;
  return d.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
}

/** Iniciais para avatar de fallback: "Ana Silva Santos" → "AS" */
export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Tamanho de arquivo: 1536000 → "1,5 MB" */
export function fileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return EMPTY;
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1_048_576) return `${number(b / 1024, 1)} KB`;
  return `${number(b / 1_048_576, 1)} MB`;
}

export const PLACEHOLDER = EMPTY;

/**
 * Valor compacto em milhares INTEIROS ("R$ 110 mil", "R$ 65 mil"): rótulos
 * lado a lado com o mesmo arredondamento. "R$ 110 mil" ao lado de "R$ 65,1 mil"
 * eram duas precisões para a mesma grandeza.
 */
export function compactMoneyInt(value) {
  if (value == null || Number.isNaN(Number(value))) return EMPTY;
  const n = Number(value);
  // Rótulo de ponta de linha: o MESMO valor do KPI, sem centavos. "R$ 37 mil"
  // para 36.760 era um número que não existia em nenhum lugar da tela.
  return `${n < 0 ? '−' : ''}R$ ${number(Math.round(Math.abs(n)))}`;
}

