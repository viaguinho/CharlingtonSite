import { useId, useMemo, useState } from 'react';
import { EmptyState } from '../components/Card.jsx';

/**
 * Biblioteca de gráficos — SVG próprio, sem dependência externa.
 *
 * Três regras valem para todos:
 *
 *  1. Sem dados não se desenha nada. Um gráfico vazio exibe um estado vazio
 *     honesto, nunca uma curva decorativa. Com n < 3 desenham-se os pontos,
 *     não a tendência.
 *  2. Cor nunca é o único portador de informação. Toda série tem rótulo, e o
 *     dado completo está acessível em tabela pelo botão "ver dados".
 *  3. A única cor saturada é o azul do design system. Verde, âmbar e vermelho
 *     aparecem apenas quando o dado tem significado clínico ou financeiro.
 */

const MIN_POINTS_FOR_TREND = 3;

function hasData(series) {
  return Array.isArray(series) && series.some((d) => d?.value != null && !Number.isNaN(Number(d.value)));
}

function Empty({ message, height, action }) {
  // O título é a própria mensagem: "Sem dados no período" sobre uma semana
  // em que simplesmente não houve pagamento chamava de ausência o que é zero.
  return (
    <div className="chart-empty" style={{ minHeight: height }}>
      <EmptyState
        icon="chart-line"
        title={message}
        action={action}
        compact
      />
    </div>
  );
}

/** Tabela equivalente, aberta pelo botão "ver dados" — acessibilidade real. */
function DataTableFallback({ id, data, valueLabel = 'Valor', open }) {
  if (!open) return null;
  return (
    <table className="chart-data-table" id={`${id}-data`}>
      <caption className="sr-only">Dados do gráfico</caption>
      <thead><tr><th scope="col">Período</th><th scope="col" className="num">{valueLabel}</th></tr></thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={d.label ?? i}>
            <th scope="row">{d.label}</th>
            <td className="num">{d.display ?? d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartFrame({ id, title, data, valueLabel, children }) {
  const [showData, setShowData] = useState(false);
  return (
    <figure className="chart" role="group" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="sr-only">{title}</figcaption>
      {children}
      {data?.length ? (
        <>
          <button
            type="button"
            className="chart__data-toggle"
            aria-expanded={showData}
            aria-controls={`${id}-data`}
            onClick={() => setShowData((v) => !v)}
          >
            {showData ? 'Ocultar dados' : 'Ver dados'}
          </button>
          <DataTableFallback id={id} data={data} valueLabel={valueLabel} open={showData} />
        </>
      ) : null}
    </figure>
  );
}

/* ═══════════════════════════════ Escala ═══════════════════════════════ */

/** Topo "redondo" do eixo: 34.780 vira 40.000, 7 vira 8 — um número que se lê
    de relance e que deixa a marca do meio também redonda. */
const SINGULAR = { dias: 'dia', semanas: 'semana', meses: 'mês' };

export function niceMax(value, { integer = false } = {}) {
  if (!Number.isFinite(value) || value <= 0) return integer ? 2 : 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  // Degraus cuja metade também é redonda (0,6 · 0,75 · 1 · 1,5 · 2 · 2,5 · 3 · 4 · 5).
  // Só 1-2-5-10 punha R$ 110 mil sob um topo de R$ 200 mil: quase metade do
  // gráfico vazio. Sem 2,5: a marca do meio viraria 1,25.
  const step = [1, 1.2, 1.5, 2, 3, 4, 5, 6, 8, 10].find((c) => f <= c);
  let top = step * exp;
  if (integer) {
    top = Math.max(2, Math.ceil(top));
    if (top % 2) top += 1;
  }
  return top;
}

/** Quantos rótulos pular para nenhum encostar no vizinho. Rótulo de eixo
    nunca é cortado com reticências: "0…" não é uma data. */
function labelStride(count, maxLabels = 12) {
  return count <= maxLabels ? 1 : Math.ceil(count / maxLabels);
}

function XAxis({ data, gap, stride, axisWidth }) {
  // A largura do eixo Y vem por prop: o rótulo de data precisa começar
  // exatamente onde começa a área de plotagem, senão "17/08" cai sob a barra
  // de 19/08 e o pagamento parece ter sido em outra semana.
  return (
    <div className="plot__x" aria-hidden="true" style={{ gap, '--axis-w': `${axisWidth}px` }}>
      {data.map((d, i) => (
        <span key={d.label ?? i} className="plot__x-label">
          {i % stride === 0 ? <span>{d.label}</span> : null}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ Barras ═══════════════════════════════
   O eixo Y existe: três marcas (zero, meio, topo) dizem a grandeza sem
   obrigar a passar o cursor. A série de fundo é neutra e legível (3,58:1); a
   barra sob o cursor ou a destacada ganha o azul e o valor em pílula (REF 1). */

export function BarChart({
  data = [],
  height = 180,
  highlightIndex,
  title = 'Gráfico de barras',
  valueLabel = 'Valor',
  emptyMessage = 'Ainda não há registros suficientes para montar este gráfico.',
  emptyAction,
  onSelect,
  formatValue = (v) => v,
  formatAxis,
  integer = true,
  axisWidth = 32,
  bucketNoun,
  zeroLabel = 'sem registro',
  summary,
  // false só quando NÃO há nenhum registro antes do período: aí os baldes
  // iniciais vazios são "antes de haver dado", não zeros. Com histórico, um
  // domingo vazio no começo da semana é só um domingo.
  historyBefore = true,
  firstRecordLabel,
}) {
  const id = useId();
  const [hovered, setHovered] = useState(null);

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  if (!hasData(data) || total === 0) {
    return <Empty message={emptyMessage} height={height} action={emptyAction} />;
  }

  const top = niceMax(Math.max(...data.map((d) => Number(d.value) || 0)), { integer });
  const ticks = [0, top / 2, top];
  // Ponto focal: o período corrente vem em azul sem precisar de cursor.
  const currentIndex = data.findIndex((d) => d.current);
  const active = hovered ?? highlightIndex;
  // Baldes antes do primeiro registro não são "zero": são antes de haver
  // dado. Contam à parte, e a nota diz desde quando há registro.
  const firstIndex = historyBefore ? 0 : Math.max(data.findIndex((d) => Number(d.value) > 0), 0);
  const leading = firstIndex;
  const zeroItems = data.filter((d, i) => i >= firstIndex && !(Number(d.value) > 0) && !d.current);
  const zeros = zeroItems.length;
  // Dia vazio em sábado ou domingo é agenda fechada, não queda: a nota diz.
  const weekendZeros = zeroItems.filter((d) => d.weekend).length;
  // Valor escrito em toda barra até um mês de dias (31): o mesmo gráfico com
  // 14 barras rotuladas na Visão geral e 17 mudas em Relatórios eram dois
  // componentes. Acima disso, só o pico.
  const annotateAll = data.length <= 31;
  const current = currentIndex >= 0 && Number(data[currentIndex].value) > 0 ? data[currentIndex] : null;
  // Hoje sem registro ainda (01h42 de uma quinta) não é um dia vazio: a barra
  // não existe porque o dia não aconteceu. A nota diz isso, e ele fica fora da
  // contagem de dias sem atendimento.
  const currentEmpty = currentIndex >= 0 && !(Number(data[currentIndex].value) > 0) ? data[currentIndex] : null;
  // Balde inicial incompleto (a base começa no meio dele): barra clara e dito.
  const partialFirst = data.find((d) => d.partialStart) ?? null;
  const partialFirstFrom = firstRecordLabel;
  // Anotação: o pico (quando único) e o período corrente levam o valor escrito
  // acima da barra — o leitor não precisa passar o cursor para saber quanto.
  const values = data.map((d) => Number(d.value) || 0);
  const peak = Math.max(...values);
  const peakIndex = values.filter((v) => v === peak).length === 1 ? values.indexOf(peak) : -1;
  const gap = data.length > 20 ? 2 : data.length > 12 ? 4 : 8;
  const stride = labelStride(data.length);
  const axis = formatAxis ?? formatValue;

  return (
    <ChartFrame
      id={id}
      title={title}
      // Na tabela, o que vem antes do primeiro registro não é "0": não havia dado.
      data={leading ? data.map((d, i) => (i < leading ? { ...d, display: 'sem registro' } : d)) : data}
      valueLabel={valueLabel}
    >
      {summary ? (
        <p className="chart__summary">
          <strong className="num">{summary.value}</strong>
          <span>{summary.label}</span>
        </p>
      ) : null}
      <div className="plot" style={{ '--plot-h': `${height}px`, '--axis-w': `${axisWidth}px` }}>
        <div className="plot__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>{axis(t)}</span>
          ))}
        </div>
        <div className="plot__area">
          {ticks.map((t) => (
            <span key={t} className="plot__grid" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
          <div className="bars" style={{ gap }}>
            {data.map((d, index) => {
              const value = Number(d.value) || 0;
              const isActive = index === active;
              return (
                <button
                  key={d.label ?? index}
                  type="button"
                  className={`bars__col ${isActive ? 'is-active' : ''} ${d.current ? 'is-current' : ''} ${d.partialStart ? 'is-partial-start' : ''}`}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelect?.(d, index)}
                  aria-label={`${d.label}: ${formatValue(value)} ${valueLabel.toLowerCase()}${d.current ? ' (em curso)' : ''}`}
                >
                  <span className={`bars__fill ${value ? '' : 'is-zero'}`} style={{ height: `${(value / top) * 100}%` }}>
                    {index === hovered ? (
                      <span className="bars__tip num">
                        <span>{d.label}</span>
                        {d.display ?? formatValue(value)}
                      </span>
                    ) : value && (annotateAll || index === peakIndex || d.current) ? (
                      // Um destaque, um sentido: o pico. O período corrente já é dito pela listra.
                      <span className={`bars__annotation num ${index === peakIndex ? 'is-focus' : ''}`}>{axis === formatValue ? formatValue(value) : axis(value)}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <XAxis data={data} gap={gap} stride={stride} axisWidth={axisWidth} />
      {current || currentEmpty || partialFirst || (bucketNoun && (zeros || leading)) ? (
        <p className="chart__note">
          {current ? <><span className="chart__note-swatch" aria-hidden="true" />Barra listrada: {current.label}, ainda em curso. </> : null}
          {currentEmpty ? `${currentEmpty.label} está em curso, ainda ${zeroLabel}. ` : null}
          {partialFirst ? <><span className="chart__note-swatch chart__note-swatch--partial" aria-hidden="true" />Barra clara: {partialFirst.label}, com registros só a partir de {partialFirstFrom}. </> : null}
          {/* Semana rotulada pelo fim: a nota diz a semana inteira, senão "antes
              de 25/07" negava a barra de 25/07, que soma 20 a 25/07. */}
          {bucketNoun && leading
            ? `Sem registros antes ${data[firstIndex].startLabel ? `da semana de ${data[firstIndex].startLabel} a ${data[firstIndex].label}` : `de ${data[firstIndex].label}`}. `
            : null}
          {bucketNoun && zeros ? `${zeros} ${zeros === 1 ? SINGULAR[bucketNoun] ?? bucketNoun : bucketNoun} ${zeroLabel} entre ${data[firstIndex].label} e ${data[data.length - 1].label}` : null}
          {bucketNoun && zeros ? (weekendZeros === zeros ? `, ${zeros === 1 ? 'em fim de semana' : 'todos em fim de semana'}.`
            : weekendZeros ? `, ${weekendZeros} em fim de semana.` : '.') : null}
        </p>
      ) : null}
    </ChartFrame>
  );
}

/* ═══════════════════ Comparação acumulada — mesma escala ═══════════════════
   Duas séries somadas dia a dia no MESMO eixo. Barras diárias em escalas
   separadas faziam R$ 2 mil parecer R$ 36 mil; barras na mesma escala
   reduziam a receita a tocos. O acumulado responde a pergunta do caixa —
   "até hoje entrou mais ou saiu mais?" — e o valor final de cada série fica
   escrito na ponta da linha. Cor não é o único código: a despesa é tracejada. */

export function ComparisonChart({
  series = [], height = 220, title = 'Comparação', formatValue = (v) => v, formatAxis,
  axisWidth = 64, emptyMessage = 'Nenhum registro neste período.', leadingNoun = 'registro',
  // Rótulo da ponta cabe na margem de 80 px: valor compacto ("R$ 110,3 mil");
  // o exato fica no cursor, na tabela "Ver dados" e no KPI acima.
  formatEnd,
  // Texto sobre o último ponto quando ele é um período em curso.
  lastNote,
  // true quando o último balde é o período corrente: o trecho final ganha a
  // MESMA marca listrada das barras, em vez de só uma frase no rodapé.
  currentLast = false,
}) {
  const id = useId();
  const [hovered, setHovered] = useState(null);
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const all = series.flatMap((s) => s.points.map((p) => Number(p.value) || 0));
  if (!labels.length || Math.max(...all, 0) <= 0) return <Empty message={emptyMessage} height={height} />;

  const top = niceMax(Math.max(...all), { integer: false });
  const ticks = [0, top / 2, top];
  const W = 600;
  const H = 200;
  const x = (i) => (labels.length === 1 ? W / 2 : (i / (labels.length - 1)) * W);
  const y = (v) => H - (v / top) * H;
  const axis = formatAxis ?? formatValue;
  // Linha tem área útil menor que a de barras (a margem dos valores finais):
  // no máximo 6 datas, sempre incluindo a última.
  const stride = labelStride(labels.length, 6);
  const table = labels.map((label, i) => ({
    label,
    display: series.map((s) => `${s.label} ${formatValue(s.points[i].value)}`).join(' · '),
  }));
  // Antes do primeiro lançamento não há caixa a desenhar. Sete meses de linha
  // reta em R$ 0 afirmavam um acumulado que não existia: a linha começa no
  // último ponto zero antes do primeiro registro, e o trecho vazio é dito.
  const firstIndex = labels.findIndex((_, i) => series.some((s) => (Number(s.points[i].value) || 0) > 0));
  const startIndex = Math.max(firstIndex - 1, 0);

  return (
    <ChartFrame id={id} title={title} data={table} valueLabel="Acumulado">
      <div className="chart__legend">
        {series.map((s) => (
          <span key={s.label} className="legend-item">
            {/* A legenda é o mesmo traço da linha: SVG com o mesmo tracejado. */}
            <svg className="legend-stroke" width="20" height="4" viewBox="0 0 20 4" aria-hidden="true">
              <line x1="1" y1="2" x2="19" y2="2" className={`compare__line compare__line--${s.tone} ${s.dashed ? 'is-dashed' : ''}`} />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <div className="plot plot--ends" style={{ '--plot-h': `${height}px`, '--axis-w': `${axisWidth}px` }}>
        <div className="plot__axis" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>{axis(t)}</span>)}
        </div>
        <div className="plot__area">
          {/* Sem grade no zero: uma série parada em R$ 0 (nada pago ainda) corria
              sobre a linha de grade e as duas viravam uma só. */}
          {ticks.filter((t) => t > 0).map((t) => <span key={t} className="plot__grid" style={{ bottom: `${(t / top) * 100}%` }} />)}
          {startIndex > 0 ? (
            <span className="compare__void" style={{ width: `${(x(startIndex) / W) * 100}%` }} aria-hidden="true">
              sem {leadingNoun === 'registro' ? 'registros' : 'lançamentos'}
            </span>
          ) : null}
          <svg className="compare__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            {hovered != null ? (
              <line x1={x(hovered)} x2={x(hovered)} y1="0" y2={H} className="compare__cursor" vectorEffect="non-scaling-stroke" />
            ) : null}
            {series.map((s) => (
              // Degrau, não diagonal: o acumulado muda num dia só, e uma rampa
              // entre 08/09 e 10/09 sugeria um gasto contínuo que não houve.
              <polyline
                key={s.label}
                points={s.points.flatMap((p, i) => {
                  if (i < startIndex) return [];
                  const v = y(Number(p.value) || 0);
                  if (i === startIndex) return [`${x(i)},${v}`];
                  return [`${x(i)},${y(Number(s.points[i - 1].value) || 0)}`, `${x(i)},${v}`];
                }).join(' ')}
                className={`compare__line compare__line--${s.tone} ${s.dashed ? 'is-dashed' : ''}`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* Trecho em curso: o mesmo tracejado curto que a barra listrada usa
                para dizer "ainda não fechou". */}
            {currentLast && labels.length > 1 ? series.map((s) => {
              const i = s.points.length - 1;
              const prev = Number(s.points[i - 1].value) || 0;
              const curr = Number(s.points[i].value) || 0;
              return (
                <polyline
                  key={`curr-${s.label}`}
                  points={`${x(i - 1)},${y(prev)} ${x(i)},${y(prev)} ${x(i)},${y(curr)}`}
                  className={`compare__line compare__line--${s.tone} is-current`}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }) : null}
          </svg>
          {series.map((s) => {
            const last = s.points[s.points.length - 1];
            // A série que termina mais alta tem o rótulo acima da ponta; a
            // outra, abaixo — os dois valores finais nunca se sobrepõem.
            const highest = Math.max(...series.map((o) => Number(o.points[o.points.length - 1].value) || 0));
            const below = (Number(last.value) || 0) < highest;
            return (
              <span
                key={s.label}
                className={`compare__end compare__end--${s.tone} ${below ? 'is-below' : ''}`}
                style={{ bottom: `${((Number(last.value) || 0) / top) * 100}%` }}
              >
                <strong className="num">{(formatEnd ?? formatValue)(last.value)}</strong> {s.label.toLowerCase()}
              </span>
            );
          })}
          <div className="compare__hit">
            {labels.map((label, i) => (
              <button
                key={label}
                type="button"
                className="compare__zone"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                aria-label={`${label}: ${series.map((s) => `${s.label} ${formatValue(s.points[i].value)}`).join(', ')}`}
              />
            ))}
          </div>
          {hovered != null ? (
            <span className="compare__tip" style={{ left: `${(x(hovered) / W) * 100}%` }}>
              <strong>Até {labels[hovered]}</strong>
              {series.map((s) => (
                <span key={s.label} className="num">{s.label}: {formatValue(s.points[hovered].value)}</span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <div className="plot__x plot__x--line" aria-hidden="true" style={{ '--axis-w': `${axisWidth}px` }}>
        {/* Rótulo intermediário só quando há ao menos um passo inteiro até o
            último: "15/09" e "16/09" lado a lado se sobrepunham. */}
        {labels.map((label, i) => ((i % stride === 0 && labels.length - 1 - i >= stride) || i === labels.length - 1 ? (
          <span key={label} className="plot__x-point" style={{ left: `${(i / Math.max(labels.length - 1, 1)) * 100}%` }}>{label}</span>
        ) : null))}
      </div>
      {lastNote ? <p className="chart__note"><span className="chart__note-swatch chart__note-swatch--line" aria-hidden="true" />Trecho mais claro: {lastNote}</p> : null}
      {startIndex > 0 ? (
        <p className="chart__note">
          Nenhum {leadingNoun} neste período até {labels[startIndex]}: sem linha nesse trecho, porque não há o que acumular.
        </p>
      ) : null}
    </ChartFrame>
  );
}

/* ═══════════════════════ Caixa — barras divergentes ═══════════════════════
   Receita sobe, despesa desce, na MESMA escala. Uma barra única com o saldo
   escondia o lado das despesas — e um dia com R$ 36 mil pagos virava zero.
   Aqui nenhum valor é truncado: o que saiu aparece do tamanho que saiu. */

export function CashFlowChart({
  data = [],
  height = 220,
  title = 'Receitas e despesas no período',
  emptyMessage = 'Nenhum pagamento registrado neste período.',
  formatValue = (v) => v,
  formatAxis,
  axisWidth = 64,
}) {
  const id = useId();
  const [hovered, setHovered] = useState(null);

  const maxUp = Math.max(0, ...data.map((d) => Number(d.receitas) || 0));
  const maxDown = Math.max(0, ...data.map((d) => Number(d.despesas) || 0));
  if (!data.length || (maxUp === 0 && maxDown === 0)) {
    return <Empty message={emptyMessage} height={height} />;
  }

  // Mesma unidade por pixel acima e abaixo do zero: só assim a altura de uma
  // despesa pode ser comparada com a de uma receita.
  const step = niceMax(Math.max(maxUp, maxDown) / 2);
  const up = maxUp ? Math.ceil(maxUp / step) * step : 0;
  const down = maxDown ? Math.ceil(maxDown / step) * step : 0;
  const span = up + down;
  const zero = (down / span) * 100;
  const ticks = [up, 0, -down].filter((t, i, all) => all.indexOf(t) === i);

  const gap = data.length > 20 ? 2 : data.length > 12 ? 4 : 8;
  const stride = labelStride(data.length);
  const axis = formatAxis ?? formatValue;
  const table = data.map((d) => ({
    label: d.label,
    display: `${formatValue(d.receitas)} recebidos · ${formatValue(d.despesas)} pagos · saldo ${formatValue((d.receitas || 0) - (d.despesas || 0))}`,
  }));

  return (
    <ChartFrame id={id} title={title} data={table} valueLabel="Receitas, despesas e saldo">
      <div className="chart__legend">
        <span className="legend-item"><span className="legend-swatch legend-swatch--strong" />Receitas, acima do zero</span>
        <span className="legend-item"><span className="legend-swatch legend-swatch--soft" />Despesas, abaixo</span>
      </div>
      <div className="plot" style={{ '--plot-h': `${height}px`, '--axis-w': `${axisWidth}px` }}>
        <div className="plot__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${((t + down) / span) * 100}%` }}>{axis(t)}</span>
          ))}
        </div>
        <div className="plot__area">
          {ticks.map((t) => (
            <span key={t} className={`plot__grid ${t === 0 ? 'plot__grid--zero' : ''}`}
              style={{ bottom: `${((t + down) / span) * 100}%` }} />
          ))}
          <div className="bars" style={{ gap }}>
            {data.map((d, index) => {
              const rec = Number(d.receitas) || 0;
              const desp = Number(d.despesas) || 0;
              const isActive = index === hovered;
              return (
                <button
                  key={d.label ?? index}
                  type="button"
                  className={`flow__col ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  aria-label={`${d.label}: ${formatValue(rec)} recebidos, ${formatValue(desp)} pagos`}
                >
                  <span className="flow__up" style={{ bottom: `${zero}%`, height: `${(rec / span) * 100}%` }} />
                  <span className="flow__down" style={{ top: `${100 - zero}%`, height: `${(desp / span) * 100}%` }} />
                  {isActive ? (
                    <span className="flow__tip" style={{ bottom: `${zero + (rec / span) * 100}%` }}>
                      <strong>{d.label}</strong>
                      <span className="num">+ {formatValue(rec)}</span>
                      <span className="num">− {formatValue(desp)}</span>
                      <span className="num flow__tip-total">= {formatValue(rec - desp)}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <XAxis data={data} gap={gap} stride={stride} axisWidth={axisWidth} />
    </ChartFrame>
  );
}

/* ═══════════════════════════ Linha e área ═══════════════════════════
   Série real sólida em azul; série prevista tracejada em cinza. Ao passar o
   cursor, uma faixa vertical marca a coluna e o tooltip traz data e valor
   (REF 3).                                                              */

function buildPath(points, smooth = true) {
  if (points.length < 2) return '';
  if (!smooth) return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

export function LineChart({
  data = [],
  forecast = null,
  height = 200,
  title = 'Gráfico de linha',
  valueLabel = 'Valor',
  emptyMessage = 'Ainda não há registros suficientes para montar este gráfico.',
  area = false,
  formatValue = (v) => v,
  seriesLabel = 'Realizado',
  forecastLabel = 'Previsto',
}) {
  const id = useId();
  const [hovered, setHovered] = useState(null);

  const W = 600;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 22, left: 8 };

  const geometry = useMemo(() => {
    if (!hasData(data)) return null;
    const all = [...data.map((d) => Number(d.value) || 0), ...(forecast?.map((d) => Number(d.value) || 0) ?? [])];
    const max = Math.max(...all, 1);
    const min = Math.min(...all, 0);
    const range = max - min || 1;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const toPoints = (series) => series.map((d, i) => ({
      x: PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW),
      y: PAD.top + innerH - ((Number(d.value) - min) / range) * innerH,
      ...d,
    }));

    return { points: toPoints(data), forecastPoints: forecast ? toPoints(forecast) : null, innerH };
  }, [data, forecast]);

  if (!geometry) return <Empty message={emptyMessage} height={height} />;

  const { points, forecastPoints, innerH } = geometry;
  const sparse = points.length < MIN_POINTS_FOR_TREND;
  const linePath = sparse ? '' : buildPath(points);
  const areaPath = area && !sparse
    ? `${linePath} L ${points[points.length - 1].x},${PAD.top + innerH} L ${points[0].x},${PAD.top + innerH} Z`
    : '';

  const cursor = hovered != null ? points[hovered] : null;

  return (
    <ChartFrame id={id} title={title} data={data} valueLabel={valueLabel}>
      {forecast ? (
        <div className="chart__legend">
          <span className="legend-item"><span className="legend-line legend-line--solid" />{seriesLabel}</span>
          <span className="legend-item"><span className="legend-line legend-line--dashed" />{forecastLabel}</span>
        </div>
      ) : null}

      <div className="line-wrap" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="line-svg" role="presentation">
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--blue-500)" stopOpacity=".16" />
              <stop offset="100%" stopColor="var(--blue-500)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((r) => (
            <line key={r} x1={PAD.left} x2={W - PAD.right}
              y1={PAD.top + innerH * r} y2={PAD.top + innerH * r}
              className="grid-line" vectorEffect="non-scaling-stroke" />
          ))}

          {cursor ? (
            <rect x={cursor.x - 14} y={PAD.top} width="28" height={innerH} className="line-cursor-band" rx="4" />
          ) : null}

          {areaPath ? <path d={areaPath} fill={`url(#${id}-fill)`} /> : null}

          {forecastPoints && !sparse ? (
            <path d={buildPath(forecastPoints)} className="line-path line-path--forecast" vectorEffect="non-scaling-stroke" />
          ) : null}

          {linePath ? (
            <path d={linePath} className="line-path" vectorEffect="non-scaling-stroke" />
          ) : null}

          {points.map((p, i) => (
            <circle
              key={p.label ?? i}
              cx={p.x} cy={p.y}
              r={sparse || hovered === i ? 4 : 0}
              className="line-dot"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="line-hit">
          {points.map((p, i) => (
            <button
              key={p.label ?? i}
              type="button"
              className="line-hit__zone"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              aria-label={`${p.label}: ${formatValue(p.value)}`}
            />
          ))}
        </div>

        {cursor ? (
          <span
            className="line-tip"
            style={{ left: `${(cursor.x / W) * 100}%`, top: `${(cursor.y / H) * 100}%` }}
          >
            <strong className="num">{formatValue(cursor.value)}</strong>
            <span>{cursor.label}</span>
            {cursor.note ? <em>{cursor.note}</em> : null}
          </span>
        ) : null}
      </div>

      <div className="line-axis">
        {points.map((p, i) => (
          (points.length <= 8 || i % Math.ceil(points.length / 7) === 0)
            ? <span key={p.label ?? i} style={{ left: `${(p.x / W) * 100}%` }}>{p.label}</span>
            : null
        ))}
      </div>

      {sparse ? (
        <p className="chart__note">Poucos registros para traçar tendência — os pontos são exibidos isoladamente.</p>
      ) : null}
    </ChartFrame>
  );
}

/* ═══════════════════════════════ Sparkline ═══════════════════════════════ */

export function Sparkline({ data = [], width = 64, height = 20, tone = 'accent' }) {
  const id = useId();
  if (!hasData(data) || data.length < 2) {
    return <span className="sparkline sparkline--empty" style={{ width, height }} aria-hidden="true" />;
  }

  const values = data.map((d) => Number(d.value) || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 2) - 1,
  }));

  return (
    <svg className={`sparkline sparkline--${tone}`} width={width} height={height}
      viewBox={`0 0 ${width} ${height}`} role="presentation" aria-hidden="true" id={id}>
      <path d={buildPath(points)} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ═══════════════════════ Barras-tick de distribuição ═══════════════════════
   Série de barras verticais finas em que uma fração está preenchida. Lê-se
   como medidor e como distribuição ao mesmo tempo (REF 1 e 5).             */

export function TickBars({ ratio = 0, ticks = 28, height = 22, startLabel, endLabel, tone = 'accent' }) {
  const filled = Math.round(Math.min(Math.max(ratio, 0), 1) * ticks);
  return (
    <div className="tickbars-wrap">
      <div className={`tickbars tickbars--${tone}`} style={{ height }} aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => (
          <span key={i} className={`tickbars__tick ${i < filled ? 'is-on' : ''}`} />
        ))}
      </div>
      {(startLabel || endLabel) ? (
        <div className="tickbars__labels">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════ Medidor semicircular ═══════════════════════════
   Arco de 180° com trilho neutro e progresso em gradiente azul (REF 6).     */

export function Gauge({ value = 0, max = 100, size = 140, label, suffix = '', formatValue }) {
  const id = useId();
  const ratio = Math.min(Math.max(max ? value / max : 0, 0), 1);
  const radius = 54;
  const circumference = Math.PI * radius;
  const W = 140;
  const H = 82;

  return (
    <div className="gauge" style={{ width: size }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size * (H / W)} role="img"
        aria-label={`${label ?? 'Medidor'}: ${value} de ${max}`}>
        <path d={`M 16 70 A ${radius} ${radius} 0 0 1 124 70`} className="gauge__track" />
        <path
          d={`M 16 70 A ${radius} ${radius} 0 0 1 124 70`}
          className="gauge__arc"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="gauge__center">
        <span className="gauge__value num">
          {formatValue ? formatValue(value) : value}
          {suffix ? <span className="gauge__suffix">{suffix}</span> : null}
        </span>
        {label ? <span className="gauge__label">{label}</span> : null}
      </div>
    </div>
  );
}

/* ═════════════════════ Transferidor — amplitude / escore ═════════════════════
   Quarto de círculo com hachura, para grandezas angulares e escalas com
   faixa de meta (REF 3).                                                   */

export function ProtractorGauge({ value = 0, max = 180, size = 72, goal }) {
  const id = useId();
  const ratio = Math.min(Math.max(max ? value / max : 0, 0), 1);
  const angle = ratio * 90;
  const r = 56;
  const rad = (deg) => (deg * Math.PI) / 180;
  const x = 4 + r * Math.cos(rad(90 - angle));
  const y = 60 - r * Math.sin(rad(90 - angle));

  return (
    <svg className="protractor" width={size} height={size * 0.85} viewBox="0 0 68 64"
      role="img" aria-label={`Amplitude: ${value}° de ${max}°`}>
      <defs>
        <pattern id={`${id}-hatch`} width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4" className="protractor__hatch-line" />
        </pattern>
      </defs>
      <path d={`M 4 60 L 4 ${60 - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`} fill={`url(#${id}-hatch)`} />
      <path d={`M 4 60 L 4 ${60 - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`} className="protractor__wedge" />
      <line x1="4" y1="60" x2="64" y2="60" className="protractor__base" />
      {goal != null ? (
        <line
          x1="4" y1="60"
          x2={4 + r * Math.cos(rad(90 - (goal / max) * 90))}
          y2={60 - r * Math.sin(rad(90 - (goal / max) * 90))}
          className="protractor__goal"
        />
      ) : null}
    </svg>
  );
}

/* ═══════════════════════ Régua com marcador (REF 5) ═══════════════════════
   Escala de ticks finos, faixas rotuladas e um marcador com tooltip.
   É a visualização certa para escore de escala clínica: mostra a posição
   dentro da faixa, não só o número.                                       */

export function RulerScale({ value, min = 0, max = 100, bands = [], ticks = 60, label, tone = 'accent' }) {
  if (value == null) {
    return <div className="ruler ruler--empty">Escala não aplicada</div>;
  }
  const ratio = Math.min(Math.max((value - min) / (max - min || 1), 0), 1);
  const markerTick = Math.round(ratio * ticks);

  return (
    <div className={`ruler ruler--${tone}`}>
      {label ? (
        <span className="ruler__tip" style={{ left: `${ratio * 100}%` }}>{label}</span>
      ) : null}
      <div className="ruler__ticks" aria-hidden="true">
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <span key={i} className={`ruler__tick ${Math.abs(i - markerTick) <= 1 ? 'is-marker' : ''}`} />
        ))}
      </div>
      {bands.length ? (
        <div className="ruler__bands">
          {bands.map((band) => (
            <span key={band.label} style={{ left: `${((band.at - min) / (max - min || 1)) * 100}%` }}>
              {band.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ═══════════════════ Barra de proporção segmentada (REF 6) ═══════════════════
   Cada segmento tem 3:1 contra o card e um vão de 2px o separa do vizinho:
   dois tons de luminância parecida já não se fundem numa faixa só. A legenda
   traz a contagem além do percentual, e o percentual sai do MESMO total. */

/** Percentuais inteiros que somam 100 (método do maior resto). */
export function largestRemainder(values, decimals = 0) {
  const scale = 100 * 10 ** decimals;
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * scale);
  const floors = raw.map(Math.floor);
  let rest = scale - floors.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - floors[i], i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest > 0) { floors[i] += 1; rest -= 1; } });
  return floors.map((f) => f / 10 ** decimals);
}

// Uma altura só (12 px, no CSS) em toda tela e no estado vazio: a mesma barra
// com 10, 12 e 14 px eram três componentes aos olhos.
export function StackedRatioBar({ segments = [], showLabels = true, formatValue, decimals = 0, showPercent = true }) {
  const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  if (!total) {
    return <div className="ratio-bar ratio-bar--empty" aria-hidden="true" />;
  }
  const pct = (s) => (Number(s.value) || 0) / total;
  // Maior resto: os percentuais inteiros somam exatamente 100. Arredondar cada
  // um isoladamente dava 79% + 11% + 11% = 101%.
  const rounded = largestRemainder(segments.map((s) => Number(s.value) || 0), decimals);
  const shownAt = (i) => (pct(segments[i]) > 0 && rounded[i] === 0 ? '<1%'
    : `${rounded[i].toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`);

  return (
    <div className="ratio-bar-wrap">
      <div className="ratio-bar" role="img"
        aria-label={segments.map((s, i) => `${s.label} ${shownAt(i)}`).join(', ')}>
        {segments.map((s, i) => (pct(s) ? (
          <span
            key={s.label ?? i}
            className={`ratio-bar__seg ratio-bar__seg--${s.tone ?? (i === 0 ? 'accent' : 'soft')}`}
            style={{ flexGrow: Number(s.value) || 0 }}
            title={`${s.label}: ${shownAt(i)}`}
          />
        ) : null))}
      </div>
      {showLabels ? (
        <ul className="ratio-bar__legend">
          {segments.map((s, i) => (
            <li key={s.label ?? i}>
              <span className={`legend-dot legend-dot--${s.tone ?? (i === 0 ? 'accent' : 'soft')}`} />
              {s.label}
              {showPercent ? <strong className="num">{shownAt(i)}</strong> : null}
              {formatValue ? <span className="num ratio-bar__count">{formatValue(Number(s.value) || 0)}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════ Ranking em barras ═══════════════════════════
   Um ranking responde "quem é maior". O primeiro lugar só ganha a tinta
   forte quando é ÚNICO: com Dinheiro e Cartão empatados em R$ 11.650, destacar
   um deles inventava uma diferença. `emphasis` permite um destaque semântico
   explícito (ex.: o dia com mais faltas em vermelho) no lugar do automático. */

export function CategoryBars({
  items = [], formatValue = (v) => v, emphasis, emptyMessage,
  scaleMax, layout = 'inline', valueWidth,
}) {
  const values = items.map((d) => Number(d.value) || 0);
  // `scaleMax` fixa a escala (ex.: 1 = 100% para taxas): medir 25% contra o
  // maior valor fazia 17% ocupar dois terços da trilha e parecer taxa alta.
  const max = Math.max(...values, 0);
  const scale = scaleMax ?? max;
  if (!items.length || max <= 0) {
    return emptyMessage ? <p className="chart__note">{emptyMessage}</p> : null;
  }
  // Empate pelo que o leitor VÊ: 44,4 e 43,8 min são "44 min" e "44 min".
  const shownMax = formatValue(max);
  const leaders = values.filter((v) => formatValue(v) === shownMax).length;

  return (
    <ul className={`category-bars category-bars--${layout}`} style={valueWidth ? { '--value-w': `${valueWidth}px` } : undefined}>
      {items.map((item, i) => {
        const value = values[i];
        const tone = emphasis
          ? (emphasis(item, i) ?? 'plain')
          : (value === max && leaders === 1 ? 'top' : 'plain');
        return (
          <li key={item.label ?? i}>
            <span className="category-bars__label" title={item.hint}>
              {item.code ? <strong>{item.code}</strong> : null} {item.label}
            </span>
            <span className="category-bars__track">
              <span className={`category-bars__fill category-bars__fill--${tone}`} style={{ '--fill': Math.min(value / scale, 1) }} />
            </span>
            <span className="category-bars__value num">
              {item.display ?? formatValue(value)}
              {item.detail ? <span className="category-bars__detail"> {item.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════════════════════════ Rosca ═══════════════════════════════════
   Sem legenda uma rosca não diz nada — era o caso. Agora: fatias em ordem
   decrescente, a maior em azul e as demais numa rampa neutra (todas ≥ 3:1),
   no máximo quatro (o resto vira "Outros"), vão entre fatias, e ao lado a
   legenda com rótulo, contagem e percentual. O número do centro é a soma das
   próprias fatias — não um total calculado em outro lugar. */

const DONUT_MAX_SLICES = 4;

export function DonutChart({
  data = [], size = 140, thickness = 12, centerLabel, formatValue = (v) => v,
  emptyMessage = 'Sem distribuição para exibir.',
}) {
  const id = useId();
  const slices = useMemo(() => {
    const sorted = data
      .map((d) => ({ ...d, value: Number(d.value) || 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    if (sorted.length <= DONUT_MAX_SLICES) return sorted;
    const head = sorted.slice(0, DONUT_MAX_SLICES - 1);
    const rest = sorted.slice(DONUT_MAX_SLICES - 1).reduce((t, d) => t + d.value, 0);
    return [...head, { label: 'Outros', value: rest }];
  }, [data]);

  if (!slices.length) return <Empty message={emptyMessage} height={size} />;

  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <div className="donut-chart">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" id={id}
          aria-label={slices.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {slices.map((d, i) => {
              const dash = Math.max((d.value / total) * circumference - gap, 0.5);
              const element = (
                <circle
                  key={d.label ?? i}
                  cx={size / 2} cy={size / 2} r={radius}
                  className={`donut__seg donut__seg--${i + 1}`}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${d.label}: ${formatValue(d.value)}`}</title>
                </circle>
              );
              offset += (d.value / total) * circumference;
              return element;
            })}
          </g>
        </svg>
        <div className="donut__center">
          <strong className="num">{formatValue(total)}</strong>
          {centerLabel ? <span>{centerLabel}</span> : null}
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((d, i) => (
          <li key={d.label ?? i}>
            <span className={`legend-dot legend-dot--slice-${i + 1}`} />
            <span className="donut-legend__label">{d.label}</span>
            <span className="num donut-legend__value">{formatValue(d.value)}</span>
            <span className="num donut-legend__pct">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════ Grade de calor — ocupação hora × dia ═══════════════════
   Tamanho, não matiz. Uma rampa de azul claro reprovava duas vezes: quatro
   dos cinco tons ficavam abaixo de 3:1, e uma grade inteira azul gastava o
   acento da tela. Cada célula ocupada traz um ponto neutro (≥ 3:1) cuja área
   cresce com o valor, e o número escrito ao lado. A legenda usa exatamente
   os mesmos pontos. Célula sem agendamento fica vazia — não "0". */

const HEAT_STEPS = 5;

// Até 5, cada quantidade tem o seu tamanho — "4–5" com o mesmo círculo
// juntava duas ocupações diferentes. Acima disso, faixas.
function heatStep(value, peak) {
  if (!value) return 0;
  if (peak <= HEAT_STEPS) return value;
  return Math.min(HEAT_STEPS, Math.max(1, Math.ceil((value / peak) * HEAT_STEPS)));
}

export function HeatGrid({ rows = [], columns = [], values = {}, max, title = 'Ocupação', unit = 'atendimentos' }) {
  if (!rows.length || !columns.length) {
    return <Empty message="Configure os horários de atendimento para ver a ocupação." height={160} />;
  }
  const peak = max ?? Math.max(...Object.values(values).map(Number).filter(Number.isFinite), 1);
  const legend = peak <= HEAT_STEPS
    ? Array.from({ length: peak }, (_, k) => ({ step: k + 1, from: k + 1, to: k + 1 }))
    : Array.from({ length: HEAT_STEPS }, (_, k) => k + 1).map((step) => ({
      step,
      from: Math.floor(((step - 1) / HEAT_STEPS) * peak) + 1,
      to: Math.floor((step / HEAT_STEPS) * peak),
    })).filter((l) => l.to >= l.from);

  return (
    <div className="heatgrid-wrap">
      <div className="heatgrid" role="table" aria-label={title} style={{ '--cols': columns.length }}>
        <div className="heatgrid__corner" role="presentation" />
        {columns.map((col) => <div key={col} className="heatgrid__col-label" role="columnheader">{col}</div>)}
        {rows.map((row) => (
          <div key={row} className="heatgrid__row" role="row">
            <div className="heatgrid__row-label" role="rowheader">{row}</div>
            {columns.map((col) => {
              const value = Number(values[`${row}|${col}`]) || 0;
              const step = heatStep(value, peak);
              return (
                <div key={col} role="cell" className={`heatgrid__cell ${value ? '' : 'is-empty'}`}
                  title={`${col}, ${row}: ${value} ${unit}`}>
                  {value ? (
                    <>
                      <span className={`heat-dot heat-dot--${step}`} aria-hidden="true" />
                      <span className="num">{value}</span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatgrid__legend" aria-hidden="true">
        <span>{unit} por horário</span>
        {legend.map((l) => (
          <span key={l.step} className="heatgrid__legend-item">
            <span className={`heat-dot heat-dot--${l.step}`} />
            <span className="num">{l.from === l.to ? l.from : `${l.from}–${l.to}`}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Barra de progresso sólido + hachura (REF 3) ═══════════════ */

export function HatchedProgress({ value = 0, max = 100, height = 8, goal, label }) {
  const id = useId();
  const ratio = Math.min(Math.max(max ? value / max : 0, 0), 1);
  return (
    <div className="hatch-progress" style={{ height }} role="progressbar"
      aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <svg width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id={`${id}-h`} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="5" className="hatch-progress__line" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height={height} rx={height / 2} fill={`url(#${id}-h)`} />
        <rect
          x="0" y="0" width="100%" height={height} rx={height / 2}
          className="hatch-progress__fill"
          style={{ transform: `scaleX(${ratio})` }}
        />
        {goal != null ? (
          <rect x={`${Math.min((goal / max) * 100, 99.4)}%`} y="0" width="2" height={height} className="hatch-progress__goal" />
        ) : null}
      </svg>
    </div>
  );
}

/** Faixa de N pontos preenchidos — escores curtos, de 1 a 10 (REF 3). */
export function DotScale({ value = 0, max = 5, size = 8, tone = 'accent' }) {
  return (
    <span className={`dot-scale dot-scale--${tone}`} role="img" aria-label={`${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`dot-scale__dot ${i < value ? 'is-on' : ''}`} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}
