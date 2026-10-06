import { useEffect, useMemo, useState, useCallback } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, ENTRY_TYPES, ENTRY_STATUS, newEntry } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { PLAZA_LABELS } from '../../core/rbac.js';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip, MoneyValue } from '../../components/Card.jsx';
import { DataTable, TableToolbar } from '../../components/DataTable.jsx';
import { Button, Chip, StatusDot, DeltaChip } from '../../components/primitives.jsx';
import { Tabs, PeriodTabs } from '../../components/Tabs.jsx';
import { Sheet, ConfirmDialog, useToast } from '../../components/Overlay.jsx';
import { TextField, TextArea, Select, FieldRow } from '../../components/Field.jsx';
import { ComparisonChart, StackedRatioBar, CategoryBars } from '../../charts/index.jsx';
import Icon from '../../components/Icon.jsx';
import { money, compactMoney, compactMoneyInt, date, isoDay, relative } from '../../core/format.js';
import { periodRange, periodCaption, previousRange, rangeShort, hasHistory, bucketsFor, bucketKey, grainLabel, localDay, inWindow, inRange as dayInRange } from '../../core/periods.js';

/**
 * Financeiro e administrativo.
 *
 * Fluxo de caixa, contas a pagar e receber, repasse de terapeutas e
 * consolidação por unidade. Tudo por competência e com centro de custo —
 * uma rede de duas praças não sobrevive a um caixa único indiferenciado.
 */

const CATEGORIES = {
  [ENTRY_TYPES.REVENUE]: [
    'Consulta particular', 'Consulta convênio', 'Procedimento',
    'Laudo e relatório', 'Teleconsulta', 'Outras receitas',
  ],
  [ENTRY_TYPES.EXPENSE]: [
    'Aluguel', 'Folha de pagamento', 'Repasse a terapeutas', 'Impostos',
    'Software e sistemas', 'Material de consumo', 'Marketing',
    'Contabilidade', 'Manutenção', 'Outras despesas',
  ],
};

export default function FinanceScreen() {
  const { plaza, can, user } = useSession();
  const toast = useToast();

  const [tab, setTab] = useState('fluxo');
  const [ledgerStatus, setLedgerStatus] = useState('all');
  const [period, setPeriod] = useState('month');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await repo.list(STORES.ENTRIES, { where: plaza ? { praca: plaza } : {} }).catch(() => []);
    setEntries(list);
    setLoading(false);
  }, [plaza]);

  useEffect(() => { load(); }, [load]);

  const range = useMemo(() => periodRange(period), [period]);

  // Fluxo (recebido, pago) é recortado pelo período. Posição (em aberto, em
  // atraso) é uma fotografia de hoje e não tem período — misturar os dois
  // numa mesma faixa sem dizer isso fazia "A receber R$ 3.320" conviver com
  // 14 títulos vencidos que somavam R$ 6.810.
  const inRange = useMemo(
    () => entries.filter((e) => dayInRange(localDay(e.pagamentoEm) ?? e.vencimento, range)),
    [entries, range],
  );

  const prevRange = useMemo(() => previousRange(period, range), [period, range]);
  const previous = useMemo(() => {
    const paidIn = (type) => entries
      .filter((e) => e.tipo === type && e.status === ENTRY_STATUS.PAID
        && inWindow(e.pagamentoEm ?? e.vencimento, prevRange))
      .reduce((t, e) => t + (Number(e.valor) || 0), 0);
    // Sem nenhum lançamento até o fim do trecho anterior não há o que comparar.
    const history = hasHistory(entries.map((e) => localDay(e.pagamentoEm) ?? e.vencimento), prevRange, range);
    return { history, revenue: paidIn(ENTRY_TYPES.REVENUE), expense: paidIn(ENTRY_TYPES.EXPENSE) };
  }, [entries, prevRange]);
  const noBase = entries.length ? `sem registro em ${rangeShort(prevRange)} para comparar` : 'sem histórico anterior para comparar';

  const summary = useMemo(() => {
    const sum = (list, type, status) => list
      .filter((e) => e.tipo === type && (!status || e.status === status))
      .reduce((total, e) => total + (Number(e.valor) || 0), 0);

    const revenue = sum(inRange, ENTRY_TYPES.REVENUE, ENTRY_STATUS.PAID);
    const expense = sum(inRange, ENTRY_TYPES.EXPENSE, ENTRY_STATUS.PAID);
    const today = isoDay();

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const in7Days = isoDay(nextWeek);
    const payableSoonEntries = entries.filter((e) => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PENDING && e.vencimento >= today && e.vencimento <= in7Days)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    return {
      revenue, expense,
      result: revenue - expense,
      receivable: sum(entries, ENTRY_TYPES.REVENUE, ENTRY_STATUS.PENDING),
      payable: sum(entries, ENTRY_TYPES.EXPENSE, ENTRY_STATUS.PENDING),
      payableSoon: payableSoonEntries,
      paidCount: inRange.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PAID).length,
      expenseCount: inRange.filter((e) => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PAID).length,
      // A despesa paga mais próxima FORA do recorte: sem ela, uma semana que
      // não contém o dia 10 mostrava "Pago R$ 0 · −100%" como se a clínica
      // tivesse cortado os custos.
      lastExpenseOut: (() => {
        const out = entries.filter((e) => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PAID
          && e.pagamentoEm && !inRange.includes(e));
        if (!out.length) return null;
        // O dia inteiro, não uma das linhas dele: em 10/09 saíram seis títulos
        // somando R$ 36.760, e a tela dizia "a última foi R$ 1.450,00".
        const day = out.map((e) => localDay(e.pagamentoEm)).sort().pop();
        const sameDay = out.filter((e) => localDay(e.pagamentoEm) === day);
        return { day, count: sameDay.length, valor: sameDay.reduce((t, e) => t + (Number(e.valor) || 0), 0) };
      })(),
      // Do mais antigo para o mais novo: quem cobra começa pelo que venceu antes.
      overdue: entries.filter((e) => e.tipo === ENTRY_TYPES.REVENUE
        && e.status === ENTRY_STATUS.PENDING && e.vencimento && e.vencimento < today)
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    };
  }, [inRange, entries]);

  const hasData = entries.length > 0;
  const shortDay = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');
  // "do mês" aparecia dentro da visão de trimestre: a palavra segue o seletor.
  const periodNoun = { week: 'da semana', month: 'do mês', quarter: 'do trimestre', year: 'do ano' }[period] ?? 'do período';

  // O rótulo diz o período: nas abas A receber e A pagar o seletor some, e
  // "no período" deixava de dizer de qual período eram os números.
  const periodWords = (() => {
    const from = new Date(`${range.from}T12:00:00`);
    if (isoDay() <= range.to) return `em ${rangeShort(range)}`;
    if (period === 'week') return `na semana (${rangeShort(range)})`;
    if (period === 'month') return `em ${from.toLocaleDateString('pt-BR', { month: 'long' })}`;
    if (period === 'quarter') return `no ${Math.floor(from.getMonth() / 3) + 1}º trimestre`;
    return `em ${from.getFullYear()}`;
  })();

  return (
    <>
      <PageHeader
        eyebrow="Contabilidade"
        title="Financeiro"
        stacked
        description={`Fluxo de caixa, títulos a pagar e receber e repasse de terapeutas${(user?.plazas?.length ?? 1) > 1 ? ', separados por unidade' : plaza ? ` — ${PLAZA_LABELS[plaza]}` : ''}.`}
        toolbar={
          <>
            {/* Período só recorta o Fluxo. A receber e A pagar são a posição de
                todos os títulos: um seletor "Mês" sobre eles descrevia outra coisa. */}
            {tab === 'fluxo' ? (
              <PeriodTabs value={period} onChange={setPeriod} caption={`${plaza ? PLAZA_LABELS[plaza] : 'Todas as unidades'} · ${periodCaption(period, range)}`} />
            ) : (
              <span className="period-tabs__caption">
                {plaza ? PLAZA_LABELS[plaza] : 'Todas as unidades'} · {tab === 'repasses' ? 'repasses' : 'todos os títulos, posição de hoje'}
              </span>
            )}
            <Tabs
              variant="segment"
              value={tab}
              onChange={setTab}
              ariaLabel="Seções do financeiro"
              items={[
                { value: 'fluxo', label: 'Fluxo' },
                { value: 'receber', label: 'A receber' },
                { value: 'pagar', label: 'A pagar' },
                { value: 'repasses', label: 'Repasses' },
              ]}
            />
          </>
        }
        actions={
          can.write('finance') ? (
            <Button variant="primary" icon="plus" onClick={() => setEditing({})}>Novo lançamento</Button>
          ) : null
        }
      />

      {/* A faixa de fluxo é do período e só aparece na aba Fluxo. Nas abas de
          títulos (posição de todos os títulos) ela misturava dois recortes na
          mesma tela, sem o seletor que explicava um deles. */}
      {tab === 'fluxo' ? (
      <MetricStrip>
        {/* Cada valor de fluxo se compara com o MESMO trecho do período anterior
            (01–16/08 para 01–16/09): sem comparação, o número não diz se é
            bom ou ruim. */}
        {/* O número dominante responde à aba Fluxo: sobrou ou faltou. "Recebido
            +18,4%" em 48 px dava a mensagem oposta a um resultado negativo. */}
        <Metric
          featured
          label={`Resultado ${periodWords}`}
          value={hasData ? <MoneyValue value={summary.result} cents={false} /> : '—'}
          tone={hasData && summary.result < 0 ? 'danger' : undefined}
          target={hasData
            ? [
              summary.expenseCount ? null : 'nenhuma despesa vence neste trecho',
              previous.history ? `${money(previous.revenue - previous.expense)} em ${rangeShort(prevRange)}` : noBase,
            ].filter(Boolean).join(' · ')
            : undefined}
        />
        <Metric
          label={`Recebido ${periodWords}`}
          value={hasData ? <MoneyValue value={summary.revenue} cents={false} /> : '—'}
          delta={hasData && previous.history ? <DeltaChip value={variation(summary.revenue, previous.revenue)} /> : null}
          target={hasData
            ? `${summary.paidCount} ${summary.paidCount === 1 ? 'recebimento' : 'recebimentos'} · ${previous.history ? `${money(previous.revenue)} em ${rangeShort(prevRange)}` : noBase}`
            : undefined}
        />
        <Metric
          label={`Pago ${periodWords}`}
          value={hasData ? <MoneyValue value={summary.expense} cents={false} /> : '—'}
          // Zero por não haver vencimento no recorte não é queda de custo:
          // sem despesa no período o selo sai e a nota diz onde ela caiu.
          delta={hasData && previous.history && summary.expenseCount ? <DeltaChip value={variation(summary.expense, previous.expense)} inverse /> : null}
          target={hasData
            ? (summary.expenseCount
              ? (previous.history ? `${money(previous.expense)} em ${rangeShort(prevRange)}` : noBase)
              : `Nenhuma despesa vence neste trecho${summary.lastExpenseOut ? ` · o último pagamento foi ${money(summary.lastExpenseOut.valor)} em ${shortDay(summary.lastExpenseOut.day)}${summary.lastExpenseOut.count > 1 ? ` (${summary.lastExpenseOut.count} títulos)` : ''}` : ''}`)
            : undefined}
        />
        <Metric
          label="A receber em aberto"
          value={hasData ? <MoneyValue value={summary.receivable} cents={false} /> : '—'}
          target="posição de hoje"
        />
        <Metric
          label="A pagar em aberto"
          value={hasData ? <MoneyValue value={summary.payable} cents={false} /> : '—'}
          target={summary.payableSoon.length ? `${money(summary.payableSoon.reduce((t, e) => t + Number(e.valor), 0))} vencem em ${summary.payableSoon[0].vencimento.slice(8,10)}/${summary.payableSoon[0].vencimento.slice(5,7)}` : 'posição de hoje'}
        />
      </MetricStrip>
      ) : null}

      {/* Vencidos A RECEBER: só onde se trata de receber (Fluxo e A receber). */}
      {summary.overdue.length && (tab === 'fluxo' || tab === 'receber') ? (
        <>
          {tab === 'fluxo' ? <div style={{ height: 'var(--gutter)' }} /> : null}
          <div className="ops-alert ops-alert--danger" role="status">
            <Icon name="alert-triangle" size={15} />
            <p>
              <strong>
                {summary.overdue.length} {summary.overdue.length === 1 ? 'título a receber vencido' : 'títulos a receber vencidos'} somando {money(summary.overdue.reduce((t, e) => t + (Number(e.valor) || 0), 0))}.
              </strong>{' '}
              O mais antigo venceu em {date(summary.overdue[0].vencimento)}.
            </p>
            <Button size="sm" onClick={() => { setLedgerStatus('overdue'); setTab('receber'); }}>Ver títulos</Button>
          </div>
        </>
      ) : null}

      {/* A pagar nos próximos 7 dias: aviso na aba Fluxo, pois o KPI esconde que o dinheiro já está comprometido */}
      {summary.payableSoon.length && tab === 'fluxo' ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          <div className="ops-alert ops-alert--warning" role="status">
            <Icon name="alert-triangle" size={15} />
            <p>
              <strong>
                {money(summary.payableSoon.reduce((t, e) => t + Number(e.valor), 0))} vencem em {summary.payableSoon[0].vencimento.slice(8,10)}/{summary.payableSoon[0].vencimento.slice(5,7)} ({summary.payableSoon.length} {summary.payableSoon.length === 1 ? 'título' : 'títulos'}).
              </strong>{' '}
              O resultado {periodNoun} ainda não considera esse pagamento.
            </p>
            <Button size="sm" onClick={() => { setLedgerStatus(ENTRY_STATUS.PENDING); setTab('pagar'); }}>Ver títulos</Button>
          </div>
        </>
      ) : null}

      <div style={{ height: 'var(--gutter)' }} />

      {tab === 'fluxo' ? (
        <CashFlowTab entries={inRange} summary={summary} period={period} range={range} hasData={hasData} onNew={() => setEditing({})}
          onSeeOverdue={() => { setLedgerStatus('overdue'); setTab('receber'); }}
          onSeePayable={() => { setLedgerStatus(ENTRY_STATUS.PENDING); setTab('pagar'); }} />
      ) : null}

      {tab === 'receber' ? (
        <LedgerTab
          type={ENTRY_TYPES.REVENUE}
          status={ledgerStatus}
          onStatus={setLedgerStatus}
          entries={entries}
          loading={loading}
          onEdit={setEditing}
          onChanged={load}
        />
      ) : null}

      {tab === 'pagar' ? (
        <LedgerTab
          type={ENTRY_TYPES.EXPENSE}
          status={ledgerStatus}
          onStatus={setLedgerStatus}
          entries={entries}
          loading={loading}
          onEdit={setEditing}
          onChanged={load}
        />
      ) : null}

      {tab === 'repasses' ? <TransfersTab plaza={plaza} /> : null}

      <EntryForm
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </>
  );
}

/* ═══════════════════════════ Fluxo ═══════════════════════════ */

function CashFlowTab({ entries, summary, period, range, hasData, onNew, onSeeOverdue, onSeePayable }) {
  const flow = useMemo(() => buildFlowSeries(entries, period, range), [entries, period, range]);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      if (entry.tipo !== ENTRY_TYPES.EXPENSE || entry.status !== ENTRY_STATUS.PAID) continue;
      map.set(entry.categoria, (map.get(entry.categoria) ?? 0) + (Number(entry.valor) || 0));
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({ label: label || 'Sem categoria', value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [entries]);

  // Como o dinheiro entrou — responde a conciliação ("quanto tem de aparecer
  // no extrato do Pix?") no mesmo recorte do período.
  const byMethod = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      if (entry.tipo !== ENTRY_TYPES.REVENUE || entry.status !== ENTRY_STATUS.PAID) continue;
      const method = entry.formaPagamento || 'Não informada';
      const row = map.get(method) ?? { value: 0, n: 0 };
      row.value += Number(entry.valor) || 0; row.n += 1;
      map.set(method, row);
    }
    // A quantidade ao lado do valor distingue três formas de soma parecida.
    return Array.from(map.entries())
      .map(([label, r]) => ({ label, value: r.value, n: r.n, detail: `· ${r.n} ${r.n === 1 ? 'recebimento' : 'recebimentos'}` }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const pendingExpenses = useMemo(() => entries.filter(e => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PENDING).sort((a, b) => a.vencimento.localeCompare(b.vencimento)), [entries]);
  // As duas colunas lado a lado são reais: uma escala só. R$ 5.910 com barra
  // mais curta que R$ 19.600 em escalas próprias induzia a comparação errada.
  const sharedScale = Math.max(0, ...byMethod.map((m) => m.value), ...byCategory.map((c) => c.value)) || undefined;
  const receipts = {
    count: byMethod.reduce((t, m) => t + m.n, 0),
    total: byMethod.reduce((t, m) => t + m.value, 0),
  };

  if (!hasData) {
    return (
      <Card>
        <EmptyState
          icon="wallet"
          title="Nenhum lançamento registrado"
          description="O financeiro começa vazio. Cadastre receitas e despesas — as consultas concluídas podem gerar o lançamento automaticamente."
          action={<Button icon="plus" onClick={onNew}>Primeiro lançamento</Button>}
        />
      </Card>
    );
  }

  const overdueShown = summary.overdue.slice(0, 6);
  const overdueRest = summary.overdue.slice(6);

  return (
    <div className="bento">
      <Card span={7}>
        {/* "Caixa" prometia o saldo, e o gráfico mostra duas somas. O título diz
            o que as linhas são; a distância entre elas é o resultado do KPI. */}
        <CardHeader
          title="Recebido e pago acumulados"
          subtitle={period === 'quarter'
            ? 'Somados semana a semana, até o último dia de cada semana · a distância entre as linhas é o resultado'
            : period === 'year'
              ? 'Somados mês a mês, até o último dia de cada mês · a distância entre as linhas é o resultado'
              : 'Somados dia a dia · a distância entre as linhas é o resultado'}
        />
        <CardBody>
          {/* O saldo já é o KPI "Resultado" logo acima; repeti-lo aqui e na frase
              do card vizinho dava o mesmo número três vezes na dobra. */}
          {/* Com dois ou três pontos, a linha vira um traço num campo vazio:
              a leitura honesta é a frase com os valores. O gráfico volta quando
              houver pontos para desenhar. */}
          {flow.filter((b) => (Number(b.receitas) || 0) + (Number(b.despesas) || 0) > 0).length < 3 ? (
            <p className="report-note report-note--plain">
              {(() => {
                const withData = flow.filter((b) => (Number(b.receitas) || 0) + (Number(b.despesas) || 0) > 0);
                const received = flow.reduce((t, b) => t + (Number(b.receitas) || 0), 0);
                const paid = flow.reduce((t, b) => t + (Number(b.despesas) || 0), 0);
                const noun = period === 'quarter' ? 'semanas' : period === 'year' ? 'meses' : 'dias';
                return `Recebido ${money(received)} · pago ${money(paid)}, em ${withData.length} ${withData.length === 1 ? noun.slice(0, -1) : noun} com lançamento. Poucos pontos para desenhar a curva: o acumulado aparece quando houver três ou mais.`;
              })()}
            </p>
          ) : (
          <ComparisonChart
            leadingNoun="recebimento ou pagamento"
            title="Recebido e pago acumulados no período"
            height={264}
            formatValue={money}
            formatAxis={compactMoney}
            formatEnd={compactMoneyInt}
            currentLast={!!flow[flow.length - 1]?.current}
            lastNote={period === 'quarter' ? `${flow[flow.length - 1]?.endLabel ?? 'a última semana'} é a semana em curso, somada até hoje.`
              : period === 'year' ? `${flow[flow.length - 1]?.endLabel ?? 'o último mês'} é o mês em curso, somado até hoje.`
              : `${flow[flow.length - 1]?.label ?? 'hoje'} ainda está em curso.`}
            emptyMessage="Nenhum pagamento ou recebimento neste período."
            series={[
              { label: 'Recebido', tone: 'strong', points: cumulative(flow, 'receitas') },
              { label: 'Pago', tone: 'soft', dashed: true, points: cumulative(flow, 'despesas') },
            ]}
          />
          )}
        </CardBody>
      </Card>

      <Card span={5}>
        <CardHeader
          title="Em atraso"
          subtitle={summary.overdue.length
            ? 'Do mais antigo ao mais novo · o total está no aviso acima'
            : 'Posição de hoje'}
        />
        <CardBody>
          {summary.overdue.length ? (
            <>
              <ul className="overdue">
                {overdueShown.map((entry) => (
                  <li key={entry.id}>
                    <span className="overdue__text">
                      <strong>{entry.descricao}</strong>
                      <span>Venceu em {date(entry.vencimento)} · {relative(entry.vencimento)}</span>
                    </span>
                    <span className="num">{money(entry.valor)}</span>
                  </li>
                ))}
              </ul>
              {overdueRest.length ? (
                <p className="overdue__more">
                  <button type="button" className="link-button" onClick={onSeeOverdue}>
                    Ver os outros {overdueRest.length} {overdueRest.length === 1 ? 'título' : 'títulos'} ({money(overdueRest.reduce((t, e) => t + (Number(e.valor) || 0), 0))})
                  </button>
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState icon="check" title="Nada em atraso" compact />
          )}
        </CardBody>
      </Card>
      {/* De onde veio e para onde foi, num card só em duas colunas. Separados,
          três formas de pagamento ao lado de seis categorias deixavam um card
          com metade da altura vazia. */}
      <Card span={12} className="bento-full">
        <CardHeader
          title="Recebido e pago por tipo"
          subtitle={sharedScale ? `No período · as duas colunas na mesma escala: barra cheia = ${money(sharedScale)}` : 'No período'}
        />
        <CardBody>
          <div className="split-columns">
            <section>
              <p className="flow-pair__label">
                Recebido por forma de pagamento
                {receipts.count ? <span className="muted"> · {receipts.count} {receipts.count === 1 ? 'recebimento' : 'recebimentos'}, média de {money(receipts.total / receipts.count)}</span> : null}
              </p>
              {/* Três barras do mesmo comprimento não codificam nada: quando os
                  valores empatam, a frase diz mais que o gráfico. */}
              {byMethod.length > 1 && byMethod.every((m) => m.value === byMethod[0].value) ? (
                <p className="report-note report-note--plain">
                  {byMethod.map((m) => m.label.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' e $1')}: {money(byMethod[0].value)} cada, {receipts.count} {receipts.count === 1 ? 'recebimento' : 'recebimentos'}.
                </p>
              ) : (
                <CategoryBars items={byMethod} formatValue={money} valueWidth={216} scaleMax={sharedScale} emptyMessage="Nenhum recebimento no período." />
              )}
            </section>
            <section>
              <p className="flow-pair__label">Pago por categoria</p>
              {byCategory.length ? (
                <CategoryBars items={byCategory} formatValue={money} valueWidth={216} scaleMax={sharedScale} />
              ) : (
                <EmptyState
                  icon="chart-bar"
                  title={pendingExpenses.length
                    ? `Nenhuma despesa paga ainda neste período · ${pendingExpenses.length} ${pendingExpenses.length === 1 ? 'título somando' : 'títulos somando'} ${money(pendingExpenses.reduce((t, e) => t + Number(e.valor), 0))} ${pendingExpenses.length === 1 ? 'vence' : 'vencem'} em ${pendingExpenses[0].vencimento.slice(8,10)}/${pendingExpenses[0].vencimento.slice(5,7)}`
                    : "Nenhuma despesa paga no período"}
                  action={pendingExpenses.length
                    ? <Button size="sm" onClick={onSeePayable}>Ver títulos a pagar</Button>
                    : <Button size="sm" icon="plus" onClick={onNew}>Lançar despesa</Button>}
                  compact
                />
              )}
            </section>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════ Razão ═══════════════════════════ */

function LedgerTab({ type, status, onStatus: setStatus, entries, loading, onEdit, onChanged }) {
  const toast = useToast();
  const today = isoDay();
  const [settling, setSettling] = useState(null);

  const rows = useMemo(
    () => entries
      .filter((e) => e.tipo === type)
      .filter((e) => status === 'all'
        || (status === 'overdue' ? e.status === ENTRY_STATUS.PENDING && e.vencimento && e.vencimento < today : e.status === status))
      // Vencidos do mais antigo ao mais novo, como no cartão que leva até aqui;
      // o restante, do mais recente ao mais antigo.
      .sort((a, b) => (status === 'overdue'
        ? (a.vencimento ?? '').localeCompare(b.vencimento ?? '')
        : (b.vencimento ?? '').localeCompare(a.vencimento ?? ''))),
    [entries, type, status, today],
  );

  const counts = useMemo(() => {
    const mine = entries.filter((e) => e.tipo === type);
    return {
      all: mine.length,
      pending: mine.filter((e) => e.status === ENTRY_STATUS.PENDING).length,
      overdue: mine.filter((e) => e.status === ENTRY_STATUS.PENDING && e.vencimento && e.vencimento < today).length,
      paid: mine.filter((e) => e.status === ENTRY_STATUS.PAID).length,
    };
  }, [entries, type, today]);

  const columns = [
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (row) => (
        <span className="table__primary-text">
          <strong>{row.descricao}</strong>
          <span>{row.categoria || 'Sem categoria'}{row.centroCusto ? ` · ${row.centroCusto}` : ''}</span>
        </span>
      ),
    },
    { key: 'vencimento', label: 'Vencimento', width: 140, sortable: true, hideBelow: 900,
      render: (row) => <span>{date(row.vencimento)}</span> },
    { key: 'valor', label: 'Valor', width: 140, align: 'right', sortable: true,
      render: (row) => <strong className="num">{money(row.valor)}</strong> },
    {
      key: 'status', label: 'Situação', width: 150,
      render: (row) => {
        const overdue = row.status === ENTRY_STATUS.PENDING && row.vencimento && row.vencimento < isoDay();
        return (
          <StatusDot
            tone={row.status === ENTRY_STATUS.PAID ? 'success' : overdue ? 'danger' : 'warning'}
            label={row.status === ENTRY_STATUS.PAID ? 'Pago' : overdue ? 'Vencido' : 'Pendente'}
          />
        );
      },
    },
    {
      key: 'actions', label: '', width: 120, align: 'right',
      render: (row) => row.status === ENTRY_STATUS.PENDING ? (
        <Button size="sm" onClick={(e) => { e.stopPropagation(); setSettling(row); }}>
          {type === ENTRY_TYPES.REVENUE ? 'Receber' : 'Pagar'}
        </Button>
      ) : null,
    },
  ];

  async function settle() {
    try {
      await repo.update(STORES.ENTRIES, settling.id, {
        status: ENTRY_STATUS.PAID,
        pagamentoEm: new Date().toISOString(),
      });
      toast.success('Baixa registrada.');
      setSettling(null);
      onChanged();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <Card variant="flush">
        <TableToolbar>
          <Tabs
            variant="underline"
            value={status}
            onChange={setStatus}
            ariaLabel="Filtrar por situação"
            // Contagem em toda aba de recorte, como na Agenda e em Pacientes.
            items={[
              { value: 'all', label: 'Todos', count: loading ? undefined : counts.all },
              { value: ENTRY_STATUS.PENDING, label: 'Pendentes', count: loading ? undefined : counts.pending },
              { value: 'overdue', label: 'Vencidos', count: loading ? undefined : counts.overdue },
              { value: ENTRY_STATUS.PAID, label: type === ENTRY_TYPES.REVENUE ? 'Recebidos' : 'Pagos', count: loading ? undefined : counts.paid },
            ]}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          density="compact"
          caption={type === ENTRY_TYPES.REVENUE ? 'Contas a receber' : 'Contas a pagar'}
          onRowClick={onEdit}
          emptyState={
            <EmptyState
              icon="wallet"
              // Aba filtrada vazia não é "nenhuma despesa registrada".
              title={entries.some((e) => e.tipo === type)
                ? `Nenhum título ${status === 'overdue' ? 'vencido' : status === ENTRY_STATUS.PENDING ? 'pendente' : status === ENTRY_STATUS.PAID ? (type === ENTRY_TYPES.REVENUE ? 'recebido' : 'pago') : ''} ${type === ENTRY_TYPES.REVENUE ? 'a receber' : 'a pagar'}`.replace('  ', ' ')
                : type === ENTRY_TYPES.REVENUE ? 'Nenhuma receita registrada' : 'Nenhuma despesa registrada'}
              description={entries.some((e) => e.tipo === type)
                ? 'Há lançamentos em outras abas; nenhum se encaixa neste filtro.'
                : 'Lançamentos aparecem aqui assim que forem criados.'}
            />
          }
        />
      </Card>

      <ConfirmDialog
        open={!!settling}
        onCancel={() => setSettling(null)}
        onConfirm={settle}
        tone="primary"
        title={type === ENTRY_TYPES.REVENUE ? 'Registrar recebimento?' : 'Registrar pagamento?'}
        message={settling ? `${settling.descricao} — ${money(settling.valor)}. A baixa é registrada com a data de hoje.` : ''}
        confirmLabel="Confirmar baixa"
      />
    </>
  );
}

/* ═══════════════════════════ Repasses ═══════════════════════════ */

function TransfersTab({ plaza }) {
  const [transfers, setTransfers] = useState([]);
  const [professionals, setProfessionals] = useState([]);

  useEffect(() => {
    (async () => {
      const where = plaza ? { praca: plaza } : {};
      const [t, p] = await Promise.all([
        repo.list(STORES.TRANSFERS, { where }).catch(() => []),
        repo.list(STORES.PROFESSIONALS, { where }).catch(() => []),
      ]);
      setTransfers(t);
      setProfessionals(p);
    })();
  }, [plaza]);

  return (
    <Card variant="flush">
      <CardHeader
        title="Repasse a terapeutas"
        eyebrow="Fechamento mensal"
        subtitle={transfers.length ? `${transfers.length} repasses` : undefined}
      />
      <CardBody>
        {!professionals.length ? (
          <EmptyState
            icon="users"
            title="Nenhum profissional cadastrado"
            description="Cadastre os terapeutas em Operações › Equipe, com o regime de repasse de cada um — percentual sobre o atendimento ou valor fixo por sessão."
          />
        ) : !transfers.length ? (
          <EmptyState
            icon="wallet"
            title="Nenhum repasse calculado"
            description="Ao fechar o mês, o sistema calcula o repasse de cada profissional a partir dos atendimentos concluídos."
          />
        ) : (
          <ul className="transfers">
            {transfers.map((transfer) => {
              const professional = professionals.find((p) => p.id === transfer.profissionalId);
              return (
                <li key={transfer.id}>
                  <span className="transfers__name">{professional?.nome ?? '—'}</span>
                  <span className="transfers__base num">{money(transfer.base)}</span>
                  <Chip tone="neutral">{transfer.percentual}%</Chip>
                  <strong className="num">{money(transfer.valor)}</strong>
                  <StatusDot tone={transfer.status === 'pago' ? 'success' : 'warning'}
                    label={transfer.status === 'pago' ? 'Pago' : 'Em aberto'} />
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════ Lançamento ═══════════════════════════ */

function EntryForm({ entry, onClose, onSaved }) {
  const { plaza, user } = useSession();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  // Não zeramos o form quando `entry` vira null: a gaveta precisa do conteúdo
  // para animar a saída. Por isso nada aqui dentro pode ler `entry` fora deste
  // efeito — a identidade do registro viaja dentro do próprio form.
  useEffect(() => {
    if (!entry) return;
    setForm({
      id: entry.id ?? null,
      tipo: entry.tipo ?? ENTRY_TYPES.REVENUE,
      descricao: entry.descricao ?? '',
      categoria: entry.categoria ?? '',
      centroCusto: entry.centroCusto ?? (plaza ? PLAZA_LABELS[plaza] : ''),
      valor: entry.valor ?? '',
      vencimento: entry.vencimento ?? isoDay(),
      status: entry.status ?? ENTRY_STATUS.PENDING,
      formaPagamento: entry.formaPagamento ?? '',
      observacoes: entry.observacoes ?? '',
    });
  }, [entry, plaza]);

  if (!form) return null;

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function save() {
    if (!form.descricao.trim()) { toast.error('Descreva o lançamento.'); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.error('Informe um valor válido.'); return; }

    setBusy(true);
    try {
      const { id, ...values } = form;
      const payload = { ...values, valor: Number(values.valor) };
      if (id) await repo.update(STORES.ENTRIES, id, payload);
      else await repo.create(STORES.ENTRIES, { ...newEntry({ praca: plaza, userId: user?.id }), ...payload });
      toast.success('Lançamento salvo.');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!entry}
      onClose={onClose}
      width={440}
      title={form.id ? 'Editar lançamento' : 'Novo lançamento'}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Salvar</Button>
        </>
      }
    >
      <div className="entry-form">
        <Select
          label="Tipo" value={form.tipo} onChange={set('tipo')}
          options={[
            { value: ENTRY_TYPES.REVENUE, label: 'Receita' },
            { value: ENTRY_TYPES.EXPENSE, label: 'Despesa' },
          ]}
        />
        <TextField label="Descrição" required autoFocus value={form.descricao} onChange={set('descricao')} />
        <Select
          label="Categoria" value={form.categoria} onChange={set('categoria')} placeholder="Selecione"
          options={(CATEGORIES[form.tipo] ?? []).map((c) => ({ value: c, label: c }))}
        />
        <FieldRow>
          <TextField label="Valor" type="number" min="0" step="0.01" required suffix="R$"
            value={form.valor} onChange={set('valor')} />
          <TextField label="Vencimento" type="date" value={form.vencimento} onChange={set('vencimento')} />
        </FieldRow>
        <TextField label="Centro de custo" value={form.centroCusto} onChange={set('centroCusto')} />
        <Select
          label="Situação" value={form.status} onChange={set('status')}
          options={[
            { value: ENTRY_STATUS.PENDING, label: 'Pendente' },
            { value: ENTRY_STATUS.PAID, label: 'Pago / recebido' },
          ]}
        />
        <TextArea label="Observações" rows={2} value={form.observacoes} onChange={set('observacoes')} />
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════ Apoio ═══════════════════════════ */


function buildFlowSeries(entries, period, range) {
  const buckets = new Map(bucketsFor(range, period).map((b) => [b.key, { label: b.label, endLabel: b.endLabel, current: b.current, partial: b.partial, receitas: 0, despesas: 0 }]));

  for (const entry of entries) {
    if (entry.status !== ENTRY_STATUS.PAID) continue;
    const bucket = buckets.get(bucketKey(localDay(entry.pagamentoEm) ?? entry.vencimento, period));
    if (!bucket) continue;
    const value = Number(entry.valor) || 0;
    if (entry.tipo === ENTRY_TYPES.REVENUE) bucket.receitas += value;
    else bucket.despesas += value;
  }

  return Array.from(buckets.entries()).map(([key, b]) => ({ ...b, key }));
}

/** Série acumulada a partir dos baldes do período. */
function cumulative(buckets, field) {
  let total = 0;
  return buckets.map((b) => {
    total += Number(b[field]) || 0;
    return { label: b.endLabel ?? b.label, value: total };
  });
}

/** Variação percentual; nula quando não há base de comparação. */
function variation(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
