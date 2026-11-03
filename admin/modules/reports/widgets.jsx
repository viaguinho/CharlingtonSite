import { RoundBars, HatchBand, SmoothCurve, PercentPills, TileHeatmap, TileCalendar } from '../../charts/ref.jsx';
import { money, number, percent, duration, compactMoney } from '../../core/format.js';
import { rangeShort } from '../../core/periods.js';
import { GRAIN_LABEL } from './period.js';
import { MIN_TYPE_SAMPLE, MIN_DAY_SAMPLE, MIN_COMPARE, durationSpread, variation } from './metrics.js';
import { messagingOptIn } from '../../core/appointments.js';

/**
 * Registro dos cards dos Relatórios.
 *
 * Cada card declara, num lugar só: o número do cabeçalho (`head`), o gráfico
 * (`body`), as ressalvas do balão "Como ler" (`notes`), a tabela do card
 * ampliado, do CSV e do PDF (`table`) e as visões do botão de ajustes
 * (`views`). A tela, o card ampliado e o "Criar relatório" leem daqui — o
 * mesmo número nunca é escrito de dois jeitos.
 *
 * `span`/`rows` posicionam o card no bento de 12 colunas da seção.
 * `extra: true` = começa oculto e entra pelo "Adicionar widget".
 */

export const SECTIONS = [
  { key: 'resumo', label: 'Resumo', caption: 'O período em cinco cards' },
  { key: 'atendimentos', label: 'Atendimentos', caption: 'Produção, tipos, duração, espera e ocupação' },
  { key: 'comparecimento', label: 'Comparecimento', caption: 'Faltas, dias da semana e confirmações' },
  { key: 'clinico', label: 'Clínico', caption: 'CID-10, medicações e documentos emitidos' },
  { key: 'pacientes', label: 'Pacientes', caption: 'Faixa etária, novos, convênio e situação' },
  { key: 'financeiro', label: 'Financeiro', caption: 'Recebido, a receber, despesas e saldo' },
];

/* ─────────────────────────────── Auxiliares ─────────────────────────────── */

const plural = (n, one, many) => (n === 1 ? one : many);

/** "R$ 5.740,00" em partes: prefixo e centavos menores, como "29,48m" na referência. */
export function moneyFigure(value) {
  const v = Number(value) || 0;
  const negative = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  return { prefix: 'R$', value: `${negative ? '−' : ''}${number(whole)}`, unit: `,${String(cents).padStart(2, '0')}` };
}

const deltaText = (pct, { inverse = false, suffix = '%', digits } = {}) => {
  if (pct == null || !Number.isFinite(pct)) return null;
  const places = digits ?? (Math.abs(pct) < 10 ? 1 : 0);
  // A variação é a do número ARREDONDADO que a tela mostra: "+0,0%" vira "sem variação".
  const rounded = Math.round(pct * 10 ** places) / 10 ** places;
  if (rounded === 0) return { text: 'sem variação', tone: 'neutral' };
  const good = inverse ? rounded < 0 : rounded > 0;
  return { text: `${rounded > 0 ? '+' : '−'}${number(Math.abs(rounded), places)}${suffix}`, tone: good ? 'up' : 'down' };
};

const cumulative = (series, key = 'current') => {
  let acc = 0;
  let accPrev = 0;
  return series.map((s) => {
    acc += s[key] ?? 0;
    accPrev += s.previous ?? 0;
    // Ponto só do anterior (cauda sem par): o atual não continua ali.
    return { ...s, current: s.current == null ? null : acc, previous: s.previous == null ? null : accPrev };
  });
};

/** Visão acumulada: a etiqueta abre no fim, o mesmo ponto que o cabeçalho resume. */
const lastFocus = (series, view) => (view === 'acumulado' ? Math.max(0, series.filter((s) => s.current != null).length - 1) : undefined);
const cell = (v, format = (x) => x) => (v == null ? '—' : format(v));
const unresolvedNote = (m) => (m.production.unresolved
  ? `${m.production.unresolved} ${plural(m.production.unresolved, 'atendimento passado está', 'atendimentos passados estão')} sem desfecho registrado e ${plural(m.production.unresolved, 'fica', 'ficam')} fora dos concluídos: parte da diferença pode ser só registro pendente.`
  : null);

const pctOf = (share) => `${number((share ?? 0) * 100, share > 0 && share < 0.1 ? 1 : 0)}%`;

/** Comparação com o período anterior, dita uma vez e do mesmo jeito em todo card. */
function prevLine(m, value, format) {
  if (!m.prevHasRecords) return m.noBase;
  return `${format(value)} em ${m.prevLabel}${m.smallSample ? ' · amostra pequena' : ''}`;
}

/** Grão diário: sábado e domingo sem movimento saem do eixo das séries no tempo. */
const WORKDAY_NOTE = 'Sábado e domingo sem movimento ficam fora do eixo. Os dois trechos se alinham pelo dia útil: primeiro com primeiro, segundo com segundo.';

const grainView = (m) => ({ key: 'periodo', label: GRAIN_LABEL[m.grain].replace('por ', 'Por ') });

/* ─────────────────────────────── Os cards ─────────────────────────────── */

export const WIDGETS = [
  /* ═════════════════════════════ Resumo ═════════════════════════════ */
  {
    id: 'continuidade',
    section: 'resumo',
    title: 'Continuidade do cuidado',
    keywords: 'retorno acompanhamento sem consulta crianças agendar carteira',
    span: 4, rows: 2,
    custom: 'continuity',
    views: [{ key: '60', label: '60 dias' }, { key: '90', label: '90 dias' }, { key: '180', label: '180 dias' }],
    defaultView: '90',
    head: (m) => ({
      kicker: 'Crianças atendidas com retorno marcado',
      ...(m.continuity.share == null ? { value: '—' } : { value: number(Math.round(m.continuity.share * 100)), unit: '%' }),
      sub: `${m.continuity.withReturn} de ${m.continuity.attended} ${plural(m.continuity.attended, 'criança', 'crianças')}`,
    }),
    notes: (m) => [
      `Com retorno: a criança teve atendimento concluído em ${rangeShort(m.range)} e depois dele já existe outro atendimento feito ou marcado para o futuro. Falta e cancelamento não contam como retorno.`,
      `Sem consulta há mais de ${m.continuity.days} dias: pacientes "em acompanhamento" cujo último atendimento concluído foi antes disso e que não têm nada agendado. Quem nunca foi atendido fica fora.`,
      'Agendamento que já passou sem desfecho registrado não conta como retorno: pode ter sido falta.',
      // A taxa do período anterior não é comparável: aquelas crianças tiveram mais tempo para voltar.
      'Sem comparação com o período anterior: as crianças atendidas lá tiveram mais tempo para voltar, então a porcentagem não mede a mesma coisa.',
      'Os botões 60 · 90 · 180 trocam o limite.',
    ],
    table: (m) => ({
      columns: ['Criança', 'Último atendimento', 'Dias sem consulta', 'Tipo'],
      rows: m.continuity.list.map((c) => [c.name, c.lastVisit.split('-').reverse().join('/'), c.days, c.lastType]),
      caption: `${m.continuity.overdue} ${plural(m.continuity.overdue, 'criança', 'crianças')} sem consulta há mais de ${m.continuity.days} dias e sem nada agendado`,
    }),
  },
  {
    id: 'atividade',
    section: 'resumo',
    title: 'Atendimentos',
    keywords: 'atividade semana dia da semana concluídos agendados produção',
    span: 3,
    views: [{ key: 'concluidos', label: 'Concluídos' }, { key: 'agendados', label: 'Agendados' }],
    defaultView: 'concluidos',
    head: (m, view) => (view === 'agendados'
      ? { kicker: 'Agendados no período', value: number(m.weekdayActivity.reduce((t, d) => t + d.scheduled, 0)), sub: 'sem cancelados e reuniões internas' }
      : {
        kicker: 'Concluídos no período',
        value: number(m.production.done),
        // A variação é do card Comparação ao lado; aqui só a base anterior.
        sub: `${prevLine(m, m.previous.done, (v) => number(v))}${m.production.unresolved ? ` · ${m.production.unresolved} sem desfecho` : ''}`,
      }),
    body: (m, { view, size }) => (
      <RoundBars
        height={size === 'lg' ? 300 : 186}
        label="Atendimentos por dia da semana"
        items={m.weekdayActivity.map((d) => ({ key: d.key, label: d.label, long: d.long, value: view === 'agendados' ? d.scheduled : d.done }))}
        format={(v) => number(v)}
        describe={(d) => `${d.long}: ${d.value} ${plural(d.value, 'atendimento', 'atendimentos')}`}
      />
    ),
    empty: (m) => (m.weekdayActivity.some((d) => d.scheduled) ? null : 'Nenhum atendimento no período.'),
    notes: (m) => [
      'Cada barra soma os atendimentos daquele dia da semana dentro do período. A hachurada é o dia com mais atendimentos — clique em outra para comparar.',
      m.production.waiting ? `${m.production.waiting} ${plural(m.production.waiting, 'criança está', 'crianças estão')} na recepção ou em atendimento agora.` : null,
      m.production.late ? `${m.production.late} ${plural(m.production.late, 'atendimento atrasado', 'atendimentos atrasados')} sem chegada registrada.` : null,
      m.production.unresolved ? `${m.production.unresolved} ${plural(m.production.unresolved, 'atendimento passado está', 'atendimentos passados estão')} sem desfecho registrado.` : null,
      m.production.open ? `${m.production.open} ainda por acontecer no período.` : null,
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Dia da semana', 'Concluídos', 'Agendados'],
      rows: m.weekdayActivity.map((d) => [d.long, d.done, d.scheduled]),
    }),
  },
  {
    id: 'comparacao',
    section: 'resumo',
    title: 'Comparação com o período anterior',
    keywords: 'comparação anterior variação tendência concluídos',
    span: 5,
    views: [{ key: 'periodo', label: 'No período' }, { key: 'acumulado', label: 'Acumulado' }],
    defaultView: 'periodo',
    // O número grande é a VARIAÇÃO: o "13" já está no card Atendimentos ao lado.
    head: (m) => {
      const pct = m.comparable ? variation(m.production.done, m.previous.done) : null;
      if (pct == null) {
        return {
          kicker: `Concluídos em ${rangeShort(m.range)}`,
          value: number(m.production.done),
          unit: plural(m.production.done, 'atendimento', 'atendimentos'),
          sub: prevLine(m, m.previous.done, (v) => number(v)),
        };
      }
      const places = Math.abs(pct) < 10 ? 1 : 0;
      const rounded = Math.round(pct * 10 ** places) / 10 ** places;
      return {
        kicker: 'Concluídos contra o período anterior',
        value: `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${number(Math.abs(rounded), places)}`,
        unit: '%',
        sub: `${number(m.production.done)} × ${number(m.previous.done)} ${plural(m.previous.done, 'atendimento', 'atendimentos')}${m.production.unresolved ? ` · ${m.production.unresolved} sem desfecho` : ''}`,
      };
    },
    body: (m, { view, size }) => (
      <HatchBand
        height={size === 'lg' ? 320 : 186}
        label="Concluídos no período contra o período anterior"
        series={view === 'acumulado' ? cumulative(m.comparison) : m.comparison}
        focus={lastFocus(m.comparison, view)}
        labels={{ current: 'Atual', previous: 'Anterior' }}
        describe={(s) => (s.current == null
          ? `${s.previousLabel}: ${s.previous ?? 0} no período anterior, sem dia correspondente no atual`
          : `${s.label}: ${s.current} ${plural(s.current, 'concluído', 'concluídos')}; em ${s.previousLabel ?? 'período anterior'}: ${s.previous ?? 0}`)}
      />
    ),
    empty: (m) => (m.production.total || m.previous.total ? null : 'Sem atendimentos neste período nem no anterior.'),
    notes: (m) => [
      `Linha escura: concluídos ${GRAIN_LABEL[m.grain]} em ${rangeShort(m.range)}. Linha clara: o mesmo trecho do período anterior (${m.prevLabel}). O hachurado é a diferença entre os dois.`,
      m.grain === 'day' ? WORKDAY_NOTE : null,
      unresolvedNote(m),
      'A etiqueta mostra a variação no ponto escolhido. Passe o mouse ou use as setas para andar pela série.',
      m.smallSample ? 'Amostra pequena para comparar com o período anterior: menos de 3 atendimentos em um dos lados.' : null,
      m.prevHasRecords ? null : m.noBase,
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Data', 'Concluídos', 'Data anterior', 'Concluídos (anterior)'],
      rows: m.comparison.map((s) => [s.label || '—', cell(s.current), s.previousLabel ?? '—', cell(s.previous)]),
    }),
  },
  {
    id: 'recebido',
    section: 'resumo',
    title: 'Recebido',
    keywords: 'receita recebido pagamentos dinheiro faturamento financeiro',
    span: 4,
    views: [{ key: 'periodo', label: 'No período' }, { key: 'acumulado', label: 'Acumulado' }],
    defaultView: 'periodo',
    head: (m) => ({
      kicker: 'Pago no período',
      ...moneyFigure(m.revenue),
      sub: m.prevHasRevenue ? `${money(m.prevRevenue)} em ${m.prevLabel}` : m.noBase,
      delta: m.prevHasRevenue && m.comparable ? deltaText(variation(m.revenue, m.prevRevenue)) : null,
    }),
    side: (m) => [
      { value: number(m.revenueCount), label: plural(m.revenueCount, 'pagamento', 'pagamentos') },
      { value: number(m.receivables.pendingCount + m.receivables.overdueCount), label: 'em aberto' },
    ],
    body: (m, { view, size }) => (
      <SmoothCurve
        height={size === 'lg' ? 320 : 186}
        label="Recebido no tempo"
        series={view === 'acumulado' ? cumulative(m.receipts) : m.receipts}
        format={(v) => compactMoney(v)}
        describe={(s) => (s.current == null
          ? `${s.previousLabel}: ${money(s.previous ?? 0)} no período anterior, sem dia correspondente no atual`
          : `${s.label}: ${money(s.current)} recebidos; em ${s.previousLabel ?? 'período anterior'}: ${money(s.previous ?? 0)}`)}
      />
    ),
    empty: (m) => (m.revenueCount || m.prevHasRevenue ? null : 'Nenhum pagamento registrado no período.'),
    notes: (m) => [
      `Pontos: o que foi pago ${GRAIN_LABEL[m.grain]}, pela data do pagamento. Sombra cinza: o mesmo trecho de ${m.prevLabel}.`,
      m.grain === 'day' ? WORKDAY_NOTE : null,
      'Só entram receitas com status "pago". Pendentes e vencidas estão no card "A receber", em Financeiro.',
      m.smallSample ? 'Amostra pequena de atendimentos para comparar a variação.' : null,
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Data', 'Recebido', 'Data anterior', 'Recebido (anterior)'],
      rows: m.receipts.map((s) => [s.label || '—', cell(s.current, money), s.previousLabel ?? '—', cell(s.previous, money)]),
    }),
  },
  {
    id: 'formas',
    section: 'resumo',
    title: 'Formas de pagamento',
    keywords: 'pix cartão dinheiro transferência forma pagamento',
    span: 4,
    // A fatia da forma mais usada: o total já é o número do card Recebido ao lado.
    head: (m) => {
      const top = m.paymentMethods[0];
      // Empate: as formas com o mesmo valor aparecem juntas, não uma escolhida ao acaso.
      const tied = m.paymentMethods.filter((p) => p.value === top?.value).map((p) => p.label.toLowerCase());
      const names = tied.length > 2 ? `${tied.length} formas` : tied.join(' e ');
      return top
        ? { kicker: tied.length > 1 ? 'Maior fatia do recebido (empate)' : 'Maior fatia do recebido', value: number(Math.round(top.share * 100)), unit: `% · ${names}`, sub: `${m.revenueCount} ${plural(m.revenueCount, 'pagamento', 'pagamentos')} no período` }
        : { kicker: 'Maior fatia do recebido', value: '—' };
    },
    body: (m) => (
      <PercentPills
        label="Recebido por forma de pagamento"
        items={m.paymentMethods.map((p) => ({ ...p, title: `${p.label}: ${money(p.value)}` }))}
      />
    ),
    empty: (m) => (m.paymentMethods.length ? null : 'Nenhum pagamento no período.'),
    notes: () => [
      'Fatia de cada forma no valor recebido do período (não na quantidade de pagamentos).',
      'Pagamento sem forma informada aparece como "Não informada".',
    ],
    table: (m) => ({
      columns: ['Forma', 'Recebido', 'Fatia'],
      rows: m.paymentMethods.map((p) => [p.label, money(p.value), percent(p.share, 1)]),
    }),
  },

  /* ═══════════════════════════ Atendimentos ═══════════════════════════ */
  {
    id: 'calendario',
    section: 'atendimentos',
    title: 'Produção em 12 meses',
    keywords: 'calendário produção ano dias mapa de calor histórico',
    span: 12,
    head: (m) => ({
      kicker: `Concluídos em ${rangeShort(m.range)}`,
      value: number(m.production.done),
      unit: plural(m.production.done, 'atendimento', 'atendimentos'),
      sub: 'o período escolhido fica em destaque; o resto esmaece',
    }),
    stats: (m) => [
      { label: 'Últimos 12 meses', value: number(m.calendar.total), unit: plural(m.calendar.total, 'atendimento', 'atendimentos') },
      m.calendar.busiest
        ? { label: 'Dia mais movimentado', value: number(m.calendar.busiest.count), unit: m.calendar.busiest.date.split('-').reverse().join('/') }
        : { label: 'Dia mais movimentado', value: '—', unit: '' },
      { label: 'Dias com atendimento', value: number(m.calendar.periodDays), unit: 'no período' },
      { label: 'Média por dia', value: m.calendar.closedMean == null ? '—' : number(m.calendar.closedMean, 1), unit: 'dias fechados' },
    ],
    body: (m) => (
      <>
        <TileCalendar
          window={m.calendar.window}
          counts={m.calendar.done}
          missed={m.calendar.missed}
          focus={m.range}
          dataFrom={m.calendar.firstRecordDay}
          today={m.today}
          describe={(day, count, missed, state) => {
            const d = new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
            if (state === 'none') return `${d}: sem registro`;
            return `${d}: ${count} ${plural(count, 'concluído', 'concluídos')}${missed ? `, ${missed} ${plural(missed, 'falta', 'faltas')}` : ''}`;
          }}
        />
        <div className="rp-legend" aria-hidden="true">
          <span><i className="rp-legend__tile is-none" /> sem registro</span>
          <span className="rp-legend__scale">menos <i className="rp-legend__tile lv-0" /><i className="rp-legend__tile lv-1" /><i className="rp-legend__tile lv-3" /><i className="rp-legend__tile lv-5" /> mais</span>
        </div>
      </>
    ),
    empty: (m) => (m.calendar.total ? null : 'Nenhum atendimento concluído nos últimos 12 meses.'),
    notes: (m) => [
      'Cada quadrado é um dia; quanto mais azul, mais atendimentos concluídos. A coluna é a semana, de domingo a sábado.',
      `Fora de ${rangeShort(m.range)}, os dias aparecem esmaecidos.`,
      m.calendar.firstRecordDay && m.calendar.firstRecordDay > m.calendar.window.from
        ? `Sem registros antes de ${m.calendar.firstRecordDay.split('-').reverse().join('/')}: esses dias aparecem hachurados e não contam como zero.`
        : null,
      'A média por dia usa só dias fechados com atendimento (hoje fica fora, porque ainda está em curso).',
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Dia', 'Concluídos', 'Faltas'],
      rows: [...m.calendar.days].sort((a, b) => b.date.localeCompare(a.date)).map((d) => [d.date.split('-').reverse().join('/'), d.count, d.missed]),
    }),
  },
  {
    id: 'tipos',
    section: 'atendimentos',
    title: 'Tipos de atendimento',
    keywords: 'tipo primeira consulta retorno teleconsulta laudo procedimento',
    span: 6,
    views: [{ key: 'percentual', label: 'Percentual' }, { key: 'quantidade', label: 'Quantidade' }],
    defaultView: 'percentual',
    head: (m) => ({ kicker: 'Concluídos por tipo', value: number(m.production.done), unit: plural(m.production.done, 'atendimento', 'atendimentos') }),
    body: (m, { view }) => (
      <PercentPills
        label="Atendimentos concluídos por tipo"
        items={m.byType}
        shareFormat={view === 'quantidade' ? (_, item) => number(item.value) : undefined}
        valueFormat={view === 'quantidade' ? (_, item) => pctOf(item.share) : (v) => number(v)}
      />
    ),
    empty: (m) => (m.byType.length ? null : 'Sem atendimentos concluídos no período.'),
    notes: (m) => [
      `Entre os ${number(m.production.done)} concluídos do período. A pílula cheia seria 100% deles.`,
      Math.round(m.byType.reduce((t, r) => t + r.share * 100, 0)) !== m.byType.reduce((t, r) => t + Math.round(r.share * 100), 0)
        ? 'Percentuais arredondados: a soma pode dar 99% ou 101%.' : null,
    ].filter(Boolean),
    table: (m) => ({ columns: ['Tipo', 'Concluídos', 'Fatia'], rows: m.byType.map((t) => [t.label, t.value, percent(t.share, 1)]) }),
  },
  {
    id: 'duracao',
    section: 'atendimentos',
    title: 'Duração média',
    keywords: 'duração tempo consulta minutos por tipo',
    span: 6,
    head: (m) => ({
      kicker: 'Do início à conclusão',
      value: m.production.avgDuration == null ? '—' : number(Math.round(m.production.avgDuration)),
      unit: m.production.avgDuration == null ? '' : 'min',
      sub: m.prevHasRecords && m.previous.avgDuration != null ? `${Math.round(m.previous.avgDuration)} min em ${m.prevLabel}` : m.noBase,
      delta: m.comparable && m.production.avgDuration != null && m.previous.avgDuration != null
        ? deltaText(Math.round(m.production.avgDuration) - Math.round(m.previous.avgDuration), { suffix: ' min', digits: 0 })
        : null,
      neutralDelta: true,
    }),
    body: (m, { size }) => (
      <RoundBars
        height={size === 'lg' ? 300 : 186}
        label="Duração média por tipo de atendimento"
        items={m.durationByType.map((d) => ({ key: d.key, label: shortType(d.label), long: d.label, value: Math.round(d.value), n: d.n }))}
        format={(v, d) => `${v} min${d.n < MIN_TYPE_SAMPLE ? ` (${d.n} atend.)` : ''}`}
        describe={(d) => `${d.long}: ${d.value} minutos, média de ${d.n} ${plural(d.n, 'atendimento', 'atendimentos')} com hora de início`}
      />
    ),
    empty: (m) => (m.durationByType.length ? null : m.production.done ? 'Nenhum atendimento com hora de início registrada no período.' : 'Sem atendimentos concluídos no período.'),
    notes: (m) => [
      `Média do início à conclusão, só entre concluídos com hora de início: ${m.production.done - m.production.missingStartCount} de ${m.production.done}.`,
      m.production.teleconsultasCount ? `Inclui ${m.production.teleconsultasCount} ${plural(m.production.teleconsultasCount, 'teleconsulta', 'teleconsultas')}.` : null,
      m.durationByType.some((d) => d.n < MIN_TYPE_SAMPLE)
        ? `Menos de ${MIN_TYPE_SAMPLE} atendimentos em ${m.durationByType.filter((d) => d.n < MIN_TYPE_SAMPLE).map((d) => d.label.toLowerCase()).join(', ')}: a etiqueta mostra quantos — pouco para comparar os tipos.`
        : null,
      durationSpread(m.durationByType) <= 0.15 && m.durationByType.length > 1 ? 'A diferença entre os tipos está dentro da variação normal (menos de 15%).' : null,
      'Consulta mais longa não é melhor nem pior: a variação não tem cor de bom ou ruim.',
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Tipo', 'Duração média (min)', 'Com hora de início', 'Concluídos do tipo'],
      rows: m.durationByType.map((d) => [d.label, Math.round(d.value), d.n, d.total]),
    }),
  },
  {
    id: 'ocupacao',
    section: 'atendimentos',
    title: 'Ocupação por dia e horário',
    keywords: 'ocupação horário pico agenda hora dia da semana mapa de calor',
    span: 7,
    head: (m) => (m.occupancy.peak
      ? {
        kicker: m.occupancy.tied ? 'Horário de pico (empate)' : 'Horário de pico',
        value: `${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][m.occupancy.peak.dow]} ${String(m.occupancy.peak.hour).padStart(2, '0')}h`,
        sub: `${m.occupancy.peak.value} ${plural(m.occupancy.peak.value, 'atendimento', 'atendimentos')} nesse horário${m.occupancy.tied ? ` e em mais ${m.occupancy.tied} ${plural(m.occupancy.tied, 'horário', 'horários')}` : ''} · ${m.occupancy.total} no período`,
      }
      : { kicker: 'Horário de pico', value: '—' }),
    body: (m, { size }) => (
      <TileHeatmap
        label="Atendimentos por dia da semana e hora de início"
        rows={m.occupancy.rows}
        cols={m.occupancy.cols}
        values={m.occupancy.values}
        focus={m.occupancy.peak ? m.occupancy.rows.findIndex((r) => r.key === m.occupancy.peak.dow) * m.occupancy.cols.length + m.occupancy.cols.findIndex((c) => c.key === m.occupancy.peak.hour) : undefined}
        maxTile={size === 'lg' ? 56 : 44}
        describe={(c) => `${c.row.long}, ${c.col.label}: ${c.value} ${plural(c.value, 'atendimento', 'atendimentos')}`}
      />
    ),
    empty: (m) => (m.occupancy.total ? null : 'Nenhum atendimento no período.'),
    notes: () => [
      'Conta os atendimentos não cancelados pela hora de início, no período. Reuniões internas ficam fora.',
      'Quadrado hachurado: nenhum atendimento naquele dia e horário.',
    ],
    table: (m) => ({
      columns: ['Dia', ...m.occupancy.cols.map((c) => c.label)],
      rows: m.occupancy.rows.map((r) => [r.long, ...m.occupancy.cols.map((c) => m.occupancy.values[`${r.key}:${c.key}`] ?? 0)]),
    }),
  },
  {
    id: 'espera',
    section: 'atendimentos',
    title: 'Espera média',
    keywords: 'espera recepção chegada atraso minutos',
    span: 5,
    head: (m) => ({
      kicker: 'Da chegada ao início',
      value: m.production.avgWait == null ? '—' : number(Math.round(m.production.avgWait)),
      unit: m.production.avgWait == null ? '' : 'min',
      sub: (() => {
        const live = m.liveWaits.filter((w) => !w.stale);
        if (live.length) return `Agora: ${live.length === 1 ? '1 criança espera' : `${live.length} crianças esperam`} há até ${duration(live[0].minutes)}`;
        return m.prevHasRecords && m.previous.avgWait != null ? `${Math.round(m.previous.avgWait)} min em ${m.prevLabel}` : m.noBase;
      })(),
      delta: m.comparable && m.production.avgWait != null && m.previous.avgWait != null && m.production.waitCount >= MIN_COMPARE
        ? deltaText(Math.round(m.production.avgWait) - Math.round(m.previous.avgWait), { suffix: ' min', digits: 0, inverse: true })
        : null,
    }),
    side: (m) => [
      { value: number(m.production.waitCount), label: 'com chegada' },
      { value: number(m.production.missingWaitStartCount), label: 'sem início' },
    ],
    body: (m, { size }) => (
      <SmoothCurve
        height={size === 'lg' ? 300 : 186}
        area={false}
        label="Espera média no tempo"
        series={m.waitSeries}
        format={(v) => `${Math.round(v)} min`}
        describe={(s) => `${s.label}: ${s.current == null ? 'sem chegada registrada' : `${Math.round(s.current)} minutos de espera média`}`}
      />
    ),
    empty: (m) => (m.production.waitCount ? null : m.production.waitBase ? 'Sem registro de início de atendimento no período.' : 'Nenhuma chegada presencial registrada no período.'),
    notes: (m) => {
      const live = m.liveWaits.filter((w) => !w.stale);
      const stale = m.liveWaits.length - live.length;
      return [
        `Da chegada à recepção ao INÍCIO do atendimento (não ao horário marcado), entre ${m.production.waitCount} ${plural(m.production.waitCount, 'presencial', 'presenciais')} com chegada; ${m.production.missingWaitStartCount} sem hora de início ficam fora.`,
        'Teleconsulta não tem chegada à clínica e fica fora da média.',
        live.length ? 'Quem está esperando agora fica fora da média até o atendimento começar.' : null,
        stale ? `${stale} ${plural(stale, 'chegada de hoje sem início', 'chegadas de hoje sem início')} de atendimento, fora da média.` : null,
        'Quebra na linha: dia sem chegada registrada (não é espera zero).',
      ].filter(Boolean);
    },
    table: (m) => ({
      columns: ['Data', 'Espera média (min)'],
      rows: m.waitSeries.map((s) => [s.label, s.current == null ? '—' : Math.round(s.current)]),
    }),
  },

  /* ═══════════════════════════ Comparecimento ═══════════════════════════ */
  {
    id: 'presenca',
    section: 'comparecimento',
    title: 'Comparecimento',
    keywords: 'faltas taxa de faltas compareceram presença absenteísmo cancelamento',
    span: 4,
    head: (m) => ({
      kicker: 'Taxa de faltas',
      value: m.production.absenteeism == null ? '—' : number(m.production.absenteeism * 100, 1),
      unit: m.production.absenteeism == null ? '' : '%',
      sub: m.production.absenteeism == null ? 'nenhum atendimento encerrado' : `${m.production.noShow} de ${m.production.expected} esperados${m.prevHasRecords && m.previous.absenteeism != null ? ` · ${percent(m.previous.absenteeism, 1)} em ${m.prevLabel}` : ''}`,
      delta: m.comparable && m.production.absenteeism != null && m.previous.absenteeism != null && m.production.expected >= MIN_COMPARE && m.previous.expected >= MIN_COMPARE
        ? deltaText((m.production.absenteeism - m.previous.absenteeism) * 100, { suffix: ' p.p.', inverse: true })
        : null,
    }),
    side: (m) => [
      m.production.cancelled ? { value: number(m.production.cancelled), label: plural(m.production.cancelled, 'cancelado', 'cancelados') } : null,
      m.production.unresolved ? { value: number(m.production.unresolved), label: 'sem desfecho', tone: 'attention' } : null,
    ].filter(Boolean),
    body: (m) => (
      <PercentPills
        label="Compareceram e faltaram"
        items={m.production.expected ? [
          { key: 'done', label: 'Compareceram', value: m.production.done, share: m.production.done / m.production.expected },
          { key: 'noshow', label: 'Faltaram', value: m.production.noShow, share: m.production.noShow / m.production.expected },
        ] : []}
        valueFormat={(v) => number(v)}
      />
    ),
    empty: (m) => {
      if (m.production.expected) return null;
      return m.production.unresolved
        ? `Nenhum atendimento com desfecho registrado: ${m.production.unresolved} sem desfecho no período.`
        : 'Sem atendimentos esperados no período.';
    },
    notes: (m) => [
      'Taxa de faltas = faltas ÷ atendimentos esperados (concluídos + faltas).',
      m.production.cancelled ? `${m.production.cancelled} ${plural(m.production.cancelled, 'agendamento foi cancelado', 'agendamentos foram cancelados')} com aviso e não ${plural(m.production.cancelled, 'conta', 'contam')} como falta.` : null,
      m.production.unresolved ? `${m.production.unresolved} ${plural(m.production.unresolved, 'consulta passada está sem desfecho registrado e fica', 'consultas passadas estão sem desfecho registrado e ficam')} fora da taxa até ${plural(m.production.unresolved, 'ser registrada', 'serem registradas')}.` : null,
    ].filter(Boolean),
    table: (m) => ({
      columns: ['Situação', 'Atendimentos'],
      rows: [['Compareceram', m.production.done], ['Faltaram', m.production.noShow], ['Cancelados com aviso', m.production.cancelled], ['Sem desfecho registrado', m.production.unresolved]],
    }),
  },
  {
    id: 'faltas-dia',
    section: 'comparecimento',
    title: 'Faltas por dia da semana',
    keywords: 'faltas dia da semana segunda terça quarta quinta sexta taxa',
    span: 4,
    head: (m) => {
      const ranked = m.noShowByWeekday.filter((d) => d.closed).sort((a, b) => b.rate - a.rate);
      const top = m.worstDay ?? ranked[0];
      // Sem amostra por dia, "50% na segunda" (1 de 2) não é número para destacar.
      if (top && !m.worstDay && top.closed < MIN_DAY_SAMPLE) {
        return { kicker: 'Maior taxa no período', value: '—', sub: `poucos encerrados por dia para comparar (menos de ${MIN_DAY_SAMPLE})` };
      }
      return top
        ? { kicker: m.worstDay ? 'Dia que concentra as faltas' : 'Maior taxa no período', value: number(top.rate * 100, 1), unit: `% · ${top.label.toLowerCase()}`, sub: `${top.noShow} de ${top.closed} encerrados` }
        : { kicker: 'Maior taxa no período', value: '—' };
    },
    body: (m, { size }) => {
      const days = m.noShowByWeekday.filter((d) => d.closed);
      const worst = m.worstDay ? days.findIndex((d) => d.key === m.worstDay.key) : undefined;
      return (
        <RoundBars
          height={size === 'lg' ? 300 : 186}
          label="Taxa de faltas por dia da semana"
          items={days.map((d) => ({ key: d.key, label: d.short, long: d.label, value: Math.round(d.rate * 1000) / 10, d }))}
          // Sem dia que se destaque de verdade, nenhuma barra fica hachurada.
          focus={worst >= 0 ? worst : -1}
          format={(v) => `${number(v, 1)}%`}
          describe={(x) => `${x.long}: ${number(x.value, 1)}% de faltas, ${x.d.noShow} de ${x.d.closed}`}
        />
      );
    },
    empty: (m) => (m.noShowByWeekday.some((d) => d.closed) ? null : 'Nenhum atendimento encerrado no período.'),
    notes: (m) => {
      const days = m.noShowByWeekday.filter((d) => d.closed);
      const ranked = [...days].sort((a, b) => b.rate - a.rate);
      const out = ['Taxa sobre os atendimentos encerrados daquele dia (concluídos + faltas), não contagem bruta: segunda tem mais agenda e teria mais faltas só por isso.'];
      if (m.worstDay) {
        const second = ranked.find((d) => d.key !== m.worstDay.key);
        out.push(`${m.worstDay.label} concentra as faltas${second ? `: ${m.worstDay.noShow - second.noShow} a mais que ${second.label.toLowerCase()}` : ''}. Confirmar na véspera desse dia rende mais.`);
      } else if (ranked.length < 2) out.push('Um só dia com atendimentos encerrados: nada a comparar.');
      else if (!ranked.some((d) => d.noShow > 0)) out.push('Nenhuma falta no período: não há dia a comparar.');
      else if (ranked[0].closed < MIN_DAY_SAMPLE) out.push(`Poucos encerrados por dia da semana neste período (menos de ${MIN_DAY_SAMPLE}) para apontar um dia: nenhuma barra fica em destaque.`);
      else out.push('Nenhum dia se destaca de verdade: a diferença entre o primeiro e o segundo é pequena.');
      return out;
    },
    table: (m) => ({
      columns: ['Dia', 'Faltas', 'Encerrados', 'Taxa'],
      rows: m.noShowByWeekday.map((d) => [d.label, d.noShow, d.closed, d.closed ? percent(d.rate, 1) : '—']),
    }),
  },
  {
    id: 'confirmacoes',
    section: 'comparecimento',
    title: 'Confirmações',
    keywords: 'confirmação confirmar próximos 7 dias whatsapp consentimento lembrete',
    span: 4,
    head: (m) => ({
      kicker: 'Sem confirmação nos próximos 7 dias',
      value: number(m.confirmations.unconfirmed),
      unit: plural(m.confirmations.unconfirmed, 'consulta', 'consultas'),
      sub: `${m.confirmations.confirmed} de ${m.confirmations.total} já ${plural(m.confirmations.confirmed, 'confirmada', 'confirmadas')}`,
    }),
    body: (m, { size }) => (
      <RoundBars
        height={size === 'lg' ? 260 : 150}
        label="Consultas sem confirmação por dia"
        items={m.next7.map((d) => ({ key: d.day, label: d.label, long: `${d.label} ${d.date}`, value: d.unconfirmed, d }))}
        format={(v, x) => `${v} de ${x.d.total}`}
        describe={(x) => `${x.long}: ${x.d.unconfirmed} sem confirmação de ${x.d.total}`}
      />
    ),
    action: (m) => ({
      label: messagingOptIn(m.consents) ? 'Pedir confirmação' : 'Registrar consentimento',
      to: '/comunicacao',
    }),
    empty: (m) => (m.confirmations.total ? null : 'Nenhuma consulta marcada para os próximos 7 dias.'),
    notes: (m) => [
      `Consultas marcadas de amanhã até ${m.next7[6]?.date}, que ainda não foram confirmadas. É o mesmo número da Visão geral.`,
      'Confirmar na véspera é a ação que mais reduz faltas.',
      m.worstDay ? `${m.worstDay.label} concentra as faltas do período: comece por ela.` : null,
    ].filter(Boolean),
    table: (m) => ({ columns: ['Dia', 'Marcadas', 'Confirmadas', 'Sem confirmação'], rows: m.next7.map((d) => [`${d.label} ${d.date}`, d.total, d.confirmed, d.unconfirmed]) }),
  },
  {
    id: 'faltas-tempo',
    section: 'comparecimento',
    title: 'Faltas no período × anterior',
    keywords: 'faltas tendência anterior comparação tempo',
    span: 12,
    views: [{ key: 'periodo', label: 'No período' }, { key: 'acumulado', label: 'Acumulado' }],
    defaultView: 'periodo',
    head: (m) => ({
      kicker: `Faltas em ${rangeShort(m.range)}`,
      value: number(m.production.noShow),
      unit: plural(m.production.noShow, 'falta', 'faltas'),
      sub: prevLine(m, m.previous.noShow, (v) => number(v)),
    }),
    body: (m, { view, size }) => (
      <HatchBand
        height={size === 'lg' ? 320 : 176}
        label="Faltas no período contra o período anterior"
        series={view === 'acumulado' ? cumulative(m.noShowSeries) : m.noShowSeries}
        focus={lastFocus(m.noShowSeries, view)}
        tagFor={(s) => (s.current == null ? `${s.previous ?? 0} antes` : `${s.current} × ${s.previous ?? 0}`)}
        describe={(s) => (s.current == null
          ? `${s.previousLabel}: ${s.previous ?? 0} no período anterior, sem dia correspondente no atual`
          : `${s.label}: ${s.current} ${plural(s.current, 'falta', 'faltas')}; em ${s.previousLabel ?? 'período anterior'}: ${s.previous ?? 0}`)}
      />
    ),
    empty: (m) => (m.production.noShow || m.previous.noShow ? null : 'Nenhuma falta neste período nem no anterior.'),
    notes: (m) => [
      `Faltas ${GRAIN_LABEL[m.grain]} no período (linha escura) e no mesmo trecho de ${m.prevLabel} (linha clara).`,
      m.grain === 'day' ? WORKDAY_NOTE : null,
      'A etiqueta mostra "atual × anterior" no ponto escolhido.',
    ].filter(Boolean),
    table: (m) => ({ columns: ['Data', 'Faltas', 'Data anterior', 'Faltas (anterior)'], rows: m.noShowSeries.map((s) => [s.label || '—', cell(s.current), s.previousLabel ?? '—', cell(s.previous)]) }),
  },

  /* ═══════════════════════════════ Clínico ═══════════════════════════════ */
  {
    id: 'cid',
    section: 'clinico',
    title: 'Perfil epidemiológico',
    keywords: 'cid cid-10 diagnóstico autismo tdah epilepsia perfil epidemiológico',
    span: 6, rows: 2,
    head: (m) => ({ kicker: 'Crianças por CID-10 principal', value: number(m.cidChildren), unit: plural(m.cidChildren, 'criança', 'crianças') }),
    body: (m) => {
      const top = Math.max(1, ...m.epidemiology.map((e) => e.value));
      return (
        <PercentPills
          label="Crianças por CID-10 principal"
          labelWidth="56%"
          items={m.epidemiology.map((e) => ({ key: e.code, label: `${e.code} ${e.label}`, title: `${e.code} — ${e.label}`, value: e.value, share: e.value / top }))}
          shareFormat={(_, e) => `${e.value} ${plural(e.value, 'criança', 'crianças')}`}
        />
      );
    },
    empty: (m) => (m.epidemiology.length ? null : 'Nenhum CID registrado nas evoluções assinadas do período.'),
    notes: (m) => {
      const counted = m.epidemiology.reduce((t, e) => t + e.value, 0);
      const top = Math.max(0, ...m.epidemiology.map((e) => e.value));
      return [
        'Crianças distintas por CID-10 principal das evoluções assinadas no período — não o número de evoluções.',
        counted > m.cidChildren ? `${counted - m.cidChildren} ${plural(counted - m.cidChildren, 'criança tem', 'crianças têm')} mais de um CID e ${plural(counted - m.cidChildren, 'é contada', 'são contadas')} em cada.` : null,
        top ? `Pílula cheia = ${top} ${plural(top, 'criança', 'crianças')}, o CID mais frequente.` : null,
      ].filter(Boolean);
    },
    table: (m) => ({ columns: ['CID-10', 'Descrição', 'Crianças'], rows: m.epidemiology.map((e) => [e.code, e.label, e.value]) }),
  },
  {
    id: 'medicacoes',
    section: 'clinico',
    title: 'Medicações mais prescritas',
    keywords: 'medicação remédio prescrição princípio ativo receita',
    span: 6,
    head: (m) => ({ kicker: 'Crianças com prescrição', value: number(m.medChildren), unit: plural(m.medChildren, 'criança', 'crianças') }),
    body: (m) => {
      const top = Math.max(1, ...m.medications.map((e) => e.value));
      return (
        <PercentPills
          label="Crianças por medicação"
          labelWidth="46%"
          items={m.medications.slice(0, 8).map((e) => ({ ...e, share: e.value / top }))}
          shareFormat={(_, e) => `${e.value} ${plural(e.value, 'criança', 'crianças')}`}
        />
      );
    },
    empty: (m) => (m.medications.length ? null : 'Nenhuma medicação prescrita ou registrada no prontuário no período.'),
    notes: (m) => [
      'Agrupado por princípio ativo (ou nome, quando não há princípio), contando crianças distintas: medicações registradas no prontuário e prescrições emitidas no período.',
      m.medications.length > 8 ? `O card mostra as 8 mais frequentes; a tabela do card ampliado traz as ${m.medications.length}.` : null,
    ].filter(Boolean),
    table: (m) => ({ columns: ['Medicação', 'Crianças'], rows: m.medications.map((e) => [e.label, e.value]) }),
  },
  {
    id: 'documentos',
    section: 'clinico',
    title: 'Documentos emitidos',
    keywords: 'documentos laudo receita atestado relatório escola encaminhamento',
    span: 6,
    head: (m) => ({ kicker: 'Assinados ou entregues no período', value: number(m.documentsIssued), unit: plural(m.documentsIssued, 'documento', 'documentos') }),
    body: (m, { size }) => (
      <RoundBars
        height={size === 'lg' ? 300 : 186}
        label="Documentos emitidos por tipo"
        items={m.documentsByType}
        describe={(d) => `${d.long}: ${d.value}`}
      />
    ),
    empty: (m) => (m.documentsByType.length ? null : 'Nenhum documento emitido no período.'),
    notes: () => ['Rascunhos e documentos substituídos ficam fora. A data é a da assinatura (ou da criação, quando não há assinatura).'],
    table: (m) => ({ columns: ['Tipo', 'Emitidos'], rows: m.documentsByType.map((d) => [d.long, d.value]) }),
  },

  /* ═══════════════════════════════ Pacientes ═══════════════════════════════ */
  {
    id: 'faixa',
    section: 'pacientes',
    title: 'Faixa etária',
    keywords: 'idade faixa etária crianças adolescentes bebês',
    span: 4,
    head: (m) => ({ kicker: 'Crianças atendidas', value: number(m.attended), unit: plural(m.attended, 'criança', 'crianças'), sub: 'pela idade no último atendimento do período' }),
    body: (m, { size }) => (
      <RoundBars
        height={size === 'lg' ? 300 : 186}
        label="Crianças atendidas por faixa etária"
        items={m.ageBands}
        format={(v) => `${v}`}
        describe={(b) => `${b.long}: ${b.value} ${plural(b.value, 'criança', 'crianças')}${b.previous != null ? `; ${b.previous} no período anterior` : ''}`}
      />
    ),
    empty: (m) => (m.attended ? null : 'Nenhuma criança atendida no período.'),
    notes: (m) => [
      'Cada criança conta uma vez, na idade que tinha no último atendimento concluído do período.',
      m.ageUnknown ? `${m.ageUnknown} ${plural(m.ageUnknown, 'criança sem', 'crianças sem')} data de nascimento no cadastro ${plural(m.ageUnknown, 'fica', 'ficam')} fora.` : null,
    ].filter(Boolean),
    table: (m) => ({ columns: ['Faixa', 'Crianças', 'Período anterior'], rows: m.ageBands.map((b) => [b.long, b.value, b.previous]) }),
  },
  {
    id: 'novos',
    section: 'pacientes',
    title: 'Primeiras consultas × retornos',
    keywords: 'novos pacientes primeira consulta retorno captação',
    span: 8,
    head: (m) => ({
      kicker: 'Primeiras consultas concluídas',
      value: number(m.firstVisits),
      unit: plural(m.firstVisits, 'criança nova', 'crianças novas'),
      sub: `${m.production.done - m.firstVisits} retornos e outros · ${m.newPatients} ${plural(m.newPatients, 'cadastro novo', 'cadastros novos')}`,
    }),
    body: (m, { size }) => (
      <HatchBand
        height={size === 'lg' ? 320 : 186}
        label="Primeiras consultas contra os demais atendimentos"
        series={m.newVsReturn}
        labels={{ current: 'Primeiras', previous: 'Demais' }}
        tagFor={(s) => `${s.current} · ${s.previous}`}
        describe={(s) => `${s.label}: ${s.current} ${plural(s.current, 'primeira consulta', 'primeiras consultas')} e ${s.previous} ${plural(s.previous, 'outro atendimento', 'outros atendimentos')}`}
      />
    ),
    empty: (m) => (m.production.done ? null : 'Sem atendimentos concluídos no período.'),
    notes: (m) => [
      `Linha escura: primeiras consultas concluídas ${GRAIN_LABEL[m.grain]}. Linha clara: os demais concluídos (retorno, teleconsulta, laudo, procedimento).`,
      'Cadastros novos contam pacientes criados no período, mesmo os que ainda não foram atendidos.',
    ],
    table: (m) => ({ columns: ['Data', 'Primeiras consultas', 'Demais'], rows: m.newVsReturn.map((s) => [s.label, s.current, s.previous]) }),
  },
  {
    id: 'convenio',
    section: 'pacientes',
    title: 'Convênio × particular',
    keywords: 'convênio particular operadora plano de saúde',
    span: 6,
    head: (m) => ({ kicker: 'Crianças atendidas', value: number(m.attended), unit: plural(m.attended, 'criança', 'crianças') }),
    body: (m) => <PercentPills label="Crianças atendidas por convênio" items={m.insurance} valueFormat={(v) => number(v)} />,
    empty: (m) => (m.insurance.length ? null : 'Nenhuma criança atendida no período.'),
    notes: () => ['Pelo cadastro atual da criança: sem operadora informada conta como particular.'],
    table: (m) => ({ columns: ['Convênio', 'Crianças', 'Fatia'], rows: m.insurance.map((i) => [i.label, i.value, percent(i.share, 1)]) }),
  },
  {
    id: 'situacao',
    section: 'pacientes',
    title: 'Situação dos pacientes',
    keywords: 'situação ativos inativos alta cadastro carteira',
    span: 6,
    head: (m) => {
      const total = m.patientStatus.reduce((t, s) => t + s.value, 0);
      return { kicker: 'Cadastrados na unidade', value: number(total), unit: plural(total, 'paciente', 'pacientes'), sub: `${m.newPatients} ${plural(m.newPatients, 'novo', 'novos')} no período` };
    },
    body: (m) => <PercentPills label="Pacientes por situação" items={m.patientStatus} valueFormat={(v) => number(v)} />,
    empty: (m) => (m.patientStatus.some((s) => s.value) ? null : 'Nenhum paciente cadastrado.'),
    notes: () => ['Situação atual de todos os pacientes da unidade, independente do período.'],
    table: (m) => ({ columns: ['Situação', 'Pacientes', 'Fatia'], rows: m.patientStatus.map((s) => [s.label, s.value, percent(s.share, 1)]) }),
  },

  /* ═══════════════════════════════ Financeiro ═══════════════════════════════ */
  {
    id: 'receita-anterior',
    section: 'financeiro',
    title: 'Recebido × período anterior',
    keywords: 'receita recebido comparação anterior faturamento',
    span: 8,
    views: [{ key: 'periodo', label: 'No período' }, { key: 'acumulado', label: 'Acumulado' }],
    defaultView: 'acumulado',
    head: (m) => ({
      kicker: 'Pago no período',
      ...moneyFigure(m.revenue),
      sub: m.prevHasRevenue ? `${money(m.prevRevenue)} em ${m.prevLabel}` : m.noBase,
      delta: m.prevHasRevenue && m.comparable ? deltaText(variation(m.revenue, m.prevRevenue)) : null,
    }),
    body: (m, { view, size }) => (
      <HatchBand
        height={size === 'lg' ? 320 : 186}
        label="Recebido contra o período anterior"
        series={view === 'acumulado' ? cumulative(m.receipts) : m.receipts}
        focus={lastFocus(m.receipts, view)}
        format={(v) => compactMoney(v)}
        describe={(s) => (s.current == null
          ? `${s.previousLabel}: ${money(s.previous ?? 0)} no período anterior, sem dia correspondente no atual`
          : `${s.label}: ${money(s.current)}${view === 'acumulado' ? ' acumulados' : ''}; em ${s.previousLabel ?? 'período anterior'}: ${money(s.previous ?? 0)}`)}
      />
    ),
    empty: (m) => (m.revenueCount || m.prevHasRevenue ? null : 'Nenhum pagamento neste período nem no anterior.'),
    notes: (m) => [
      `Acumulado: quanto já entrou até cada ${m.grain === 'day' ? 'dia' : m.grain === 'week' ? 'semana' : 'mês'}, contra o mesmo ponto de ${m.prevLabel}.`,
      m.grain === 'day' ? WORKDAY_NOTE : null,
      'Só receitas pagas, pela data do pagamento.',
    ].filter(Boolean),
    table: (m) => ({ columns: ['Data', 'Recebido', 'Data anterior', 'Recebido (anterior)'], rows: m.receipts.map((s) => [s.label || '—', cell(s.current, money), s.previousLabel ?? '—', cell(s.previous, money)]) }),
  },
  {
    id: 'a-receber',
    section: 'financeiro',
    title: 'A receber',
    keywords: 'a receber pendente vencido inadimplência cobrança',
    span: 4,
    head: (m) => ({
      kicker: 'Em aberto, com vencimento no período',
      ...moneyFigure(m.receivables.open),
      sub: m.receivables.overdueCount ? `${m.receivables.overdueCount} ${plural(m.receivables.overdueCount, 'lançamento vencido', 'lançamentos vencidos')}` : 'nada vencido',
    }),
    body: (m) => {
      const total = Math.max(1, m.receivables.total);
      return (
        <PercentPills
          label="Situação das receitas do período"
          items={[
            { key: 'paid', label: 'Recebido', value: m.receivables.paid, share: m.receivables.paid / total },
            { key: 'pending', label: 'Pendente', value: m.receivables.pending, share: m.receivables.pending / total },
            { key: 'overdue', label: 'Vencido', value: m.receivables.overdue, share: m.receivables.overdue / total },
          ]}
          valueFormat={(v) => compactMoney(v)}
        />
      );
    },
    action: (m) => (m.receivables.overdueCount ? { label: 'Ver vencidos', to: '/financeiro' } : null),
    empty: (m) => (m.receivables.total ? null : 'Nenhuma receita com vencimento no período.'),
    notes: () => [
      'Receitas com vencimento dentro do período, pela situação de hoje. Vencido = status "vencido" ou pendente com vencimento antes de hoje.',
      'Cancelados ficam fora.',
    ],
    table: (m) => ({
      columns: ['Situação', 'Valor', 'Lançamentos'],
      rows: [['Recebido', money(m.receivables.paid), m.receivables.paidCount], ['Pendente', money(m.receivables.pending), m.receivables.pendingCount], ['Vencido', money(m.receivables.overdue), m.receivables.overdueCount]],
    }),
  },
  {
    id: 'despesas',
    section: 'financeiro',
    title: 'Despesas por categoria',
    keywords: 'despesas custos gastos categoria aluguel',
    span: 4,
    head: (m) => ({ kicker: 'Pago no período', ...moneyFigure(m.expenses), sub: `${m.expensesByCategory.length} ${plural(m.expensesByCategory.length, 'categoria', 'categorias')}` }),
    body: (m, { size }) => (
      <RoundBars
        height={size === 'lg' ? 300 : 186}
        label="Despesas pagas por categoria"
        items={m.expensesByCategory.slice(0, 7).map((e) => ({ ...e, label: e.label.length > 9 ? `${e.label.slice(0, 8)}…` : e.label, long: e.label }))}
        format={(v) => compactMoney(v)}
        describe={(e) => `${e.long}: ${money(e.value)}`}
      />
    ),
    empty: (m) => (m.expensesByCategory.length ? null : 'Nenhuma despesa paga no período.'),
    notes: (m) => [
      'Despesas com status "pago", pela data do pagamento.',
      m.expensesByCategory.length > 7 ? 'O gráfico mostra as 7 maiores categorias; a tabela traz todas.' : null,
    ].filter(Boolean),
    table: (m) => ({ columns: ['Categoria', 'Pago', 'Fatia'], rows: m.expensesByCategory.map((e) => [e.label, money(e.value), percent(e.share, 1)]) }),
  },
  {
    id: 'fluxo',
    section: 'financeiro',
    title: 'Receita × despesa',
    keywords: 'saldo fluxo de caixa receita despesa resultado',
    span: 8,
    head: (m) => ({
      kicker: 'Saldo do período',
      ...moneyFigure(m.revenue - m.expenses),
      sub: `${money(m.revenue)} recebidos · ${money(m.expenses)} pagos`,
    }),
    side: (m) => [
      { value: compactMoney(m.revenue), label: 'receita' },
      { value: compactMoney(m.expenses), label: 'despesa' },
    ],
    body: (m, { size }) => (
      <SmoothCurve
        height={size === 'lg' ? 320 : 186}
        label="Receita e despesa no tempo"
        series={m.cashflow}
        format={(v) => compactMoney(v)}
        describe={(s) => `${s.label}: ${money(s.current)} de receita e ${money(s.previous ?? 0)} de despesa`}
      />
    ),
    empty: (m) => (m.revenueCount || m.expenses ? null : 'Nenhuma receita ou despesa paga no período.'),
    notes: (m) => [`Pontos e linha: receita paga ${GRAIN_LABEL[m.grain]}. Sombra cinza: despesas pagas no mesmo grão.`, 'Saldo = receita paga − despesa paga no período (regime de caixa).'],
    table: (m) => ({ columns: ['Data', 'Receita', 'Despesa', 'Saldo'], rows: m.cashflow.map((s) => [s.label, money(s.current), money(s.previous ?? 0), money(s.current - (s.previous ?? 0))]) }),
  },
  {
    id: 'ticket',
    section: 'financeiro',
    title: 'Ticket médio',
    keywords: 'ticket médio valor médio por pagamento',
    span: 4,
    extra: true,
    head: (m) => ({
      kicker: 'Por pagamento recebido',
      ...(m.ticket == null ? { value: '—' } : moneyFigure(m.ticket)),
      sub: m.prevTicket == null ? m.noBase : `${money(m.prevTicket)} em ${m.prevLabel}`,
      delta: m.ticket != null && m.prevTicket != null && m.comparable ? deltaText(variation(m.ticket, m.prevTicket)) : null,
    }),
    body: (m) => {
      const top = Math.max(1, m.ticket ?? 0, m.prevTicket ?? 0);
      return (
        <PercentPills
          label="Ticket médio contra o período anterior"
          items={[
            { key: 'now', label: 'Este período', value: m.ticket ?? 0, share: (m.ticket ?? 0) / top },
            { key: 'prev', label: 'Anterior', value: m.prevTicket ?? 0, share: (m.prevTicket ?? 0) / top },
          ]}
          shareFormat={(_, i) => compactMoney(i.value)}
        />
      );
    },
    empty: (m) => (m.ticket == null ? 'Nenhum pagamento no período.' : null),
    notes: () => ['Recebido no período ÷ número de lançamentos de receita pagos.'],
    table: (m) => ({ columns: ['Período', 'Ticket médio'], rows: [['Este período', m.ticket == null ? '—' : money(m.ticket)], ['Anterior', m.prevTicket == null ? '—' : money(m.prevTicket)]] }),
  },
];

export const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

/** Rótulo curto de tipo de atendimento para o eixo. */
function shortType(label) {
  return ({ 'Primeira consulta': '1ª consulta', 'Emissão de laudo': 'Laudo', 'Evento / Reunião interna': 'Evento' })[label] ?? label;
}

/** Texto plano para busca: sem acento, minúsculo. */
export const fold = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesSearch(widget, query) {
  if (!query) return true;
  const q = fold(query).trim();
  if (!q) return true;
  const section = SECTIONS.find((s) => s.key === widget.section);
  return fold(`${widget.title} ${widget.keywords ?? ''} ${section?.label ?? ''}`).includes(q);
}
