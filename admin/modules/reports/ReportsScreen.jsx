import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import {
  STORES, APPOINTMENT_STATUS, APPOINTMENT_TYPE_LABELS, ENTRY_TYPES, ENTRY_STATUS, DOCUMENT_TYPES,
} from '../../data/schema.js';
import { findCID10 } from '../../data/cid10.js';
import { useSession } from '../../core/session.jsx';
import { PLAZA_LABELS } from '../../core/rbac.js';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip, MoneyValue, Skeleton } from '../../components/Card.jsx';
import { Button, Chip, DeltaChip } from '../../components/primitives.jsx';
import { PeriodTabs } from '../../components/Tabs.jsx';
import { useToast } from '../../components/Overlay.jsx';
import { StackedRatioBar, CategoryBars } from '../../charts/index.jsx';
import DotCalendar, { skylineWindow } from '../../charts/DotCalendar.jsx';
import Icon from '../../components/Icon.jsx';
import { money, duration, percent, number } from '../../core/format.js';
import { periodRange, periodCaption, previousRange, rangeShort, hasHistory, inRange, inWindow, localDay } from '../../core/periods.js';
import { isLate, isUpcoming, isUnresolved, waitInfo, confirmationWindow, messagingOptIn } from '../../core/appointments.js';
import { useNavigate } from 'react-router-dom';

/**
 * Relatórios.
 *
 * Todos calculados sobre dado real, todos com recorte de período e unidade,
 * todos exportáveis. Onde não há dado, o relatório diz que não há dado — não
 * inventa uma curva para a tela não ficar vazia.
 */
export default function ReportsScreen() {
  const { plaza, can } = useSession();
  const toast = useToast();
  const navigate = useNavigate();

  const [period, setPeriod] = useState('month');
  const [data, setData] = useState({ appointments: [], patients: [], notes: [], entries: [], documents: [], consents: [], medications: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const where = plaza ? { praca: plaza } : {};
      const [appointments, patients, notes, entries, documents, consents, medications] = await Promise.all([
        repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
        repo.list(STORES.NOTES).catch(() => []),
        repo.list(STORES.ENTRIES, { where }).catch(() => []),
        repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
        repo.list(STORES.CONSENTS, { where }).catch(() => []),
        repo.list(STORES.MEDICATIONS).catch(() => []),
      ]);
      setData({ appointments, patients, notes, entries, documents, consents, medications });
      setLoading(false);
    })();
  }, [plaza]);

  const range = useMemo(() => periodRange(period), [period]);

  const scoped = useMemo(() => ({
    appointments: data.appointments.filter((a) => inRange(localDay(a.inicio), range)),
    entries: data.entries.filter((e) => inRange(localDay(e.pagamentoEm) ?? e.vencimento, range)),
    // O perfil epidemiológico obedece ao período como todo o resto. Antes ele
    // somava o histórico inteiro sob um seletor de "Semana" e afirmava 28
    // registros de autismo numa semana, numa clínica de 12 pacientes.
    notes: data.notes.filter((n) => inRange(localDay(n.assinadaEm ?? n.criadoEm), range)),
    documents: data.documents.filter((d) => inRange(localDay(d.assinatura?.assinadoEm ?? d.criadoEm), range)),
    medications: (data.medications || []).filter((m) => {
      if (plaza && m.praca && m.praca !== plaza) return false;
      return inRange(localDay(m.iniciadaEm ?? m.criadoEm), range);
    }),
  }), [data, range, plaza]);

  const production = useMemo(() => ({
    ...summarizeProduction(scoped.appointments),
    open: scoped.appointments.filter((a) => isUpcoming(a)).length,
    late: scoped.appointments.filter((a) => isLate(a)).length,
    waiting: scoped.appointments.filter((a) => [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS].includes(a.status) && !isUnresolved(a)).length,
    unresolved: scoped.appointments.filter((a) => isUnresolved(a)).length,
  }), [scoped.appointments]);

  // O mesmo trecho do período anterior, para cada indicador dizer se melhorou.
  const prevRange = useMemo(() => previousRange(period, range), [period, range]);
  const previous = useMemo(() => summarizeProduction(
    data.appointments.filter((a) => inWindow(a.inicio, prevRange)),
  ), [data.appointments, prevRange]);
  const history = hasHistory(data.appointments.map((a) => localDay(a.inicio)), prevRange, range);
  // A janela anterior é descrita UMA vez para a faixa inteira: ou houve registro
  // nela (e todo KPI mostra o número), ou não houve (e todo KPI diz o mesmo).
  const prevHasRecords = history && previous.total > 0;
  // Comparação de período exige amostra dos dois lados — vale para TODO selo de
  // variação da faixa, não só para a taxa de faltas. "−6 min" vindo de uma única
  // chegada registrada tinha o mesmo peso visual de uma tendência.
  const MIN_COMPARE = 3;
  const comparable = prevHasRecords && production.total >= MIN_COMPARE && previous.total >= MIN_COMPARE;
  const smallSample = prevHasRecords && !comparable;
  const smallSampleNote = 'amostra pequena para comparar com o período anterior';
  const prevLabel = rangeShort(prevRange);
  // Sem histórico, não há variação: dizer isso em vez de comparar com zero.
  // Uma descrição só para a janela anterior em toda a faixa: um KPI dizia
  // "0 em 01–06/07" e o vizinho "sem registro em 01–06/07", sobre o mesmo trecho.
  const noBase = data.appointments.length ? `sem registro em ${rangeShort(prevRange)} para comparar` : 'sem histórico anterior para comparar';
  const prevRevenueEntries = data.entries
    .filter((e) => e.tipo === ENTRY_TYPES.REVENUE && inWindow(e.pagamentoEm ?? e.vencimento, prevRange));
  const prevRevenue = prevRevenueEntries
    .filter((e) => e.status === ENTRY_STATUS.PAID)
    .reduce((total, e) => total + (Number(e.valor) || 0), 0);
  // "R$ 0,00 em 01–06/07" afirmava uma medida onde não havia nenhum lançamento,
  // enquanto os KPIs vizinhos diziam "sem registro" para o mesmo trecho.
  const prevHasRevenue = prevRevenueEntries.length > 0;

  // Espera em curso: a média só conta atendimentos já iniciados. Quem está na
  // recepção agora fica fora dela — e a tela precisa dizer isso.
  const liveWaits = useMemo(() => {
    const today = localDay(new Date().toISOString());
    return data.appointments
      .filter((a) => a.status === APPOINTMENT_STATUS.CHECKED_IN && a.checkInEm && localDay(a.inicio) === today)
      .map((a) => waitInfo(a))
      .sort((a, b) => b.minutes - a.minutes);
  }, [data.appointments]);

  // Tipos dos atendimentos CONCLUÍDOS — o mesmo universo do KPI principal,
  // para que o centro da rosca e o primeiro número da faixa sejam iguais.
  const byType = useMemo(() => {
    const map = new Map();
    for (const appointment of scoped.appointments) {
      if (appointment.status !== APPOINTMENT_STATUS.DONE) continue;
      map.set(appointment.tipo, (map.get(appointment.tipo) ?? 0) + 1);
    }
    const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((t, [, v]) => t + v, 0);
    // Arredondamento simples: contagens iguais sempre têm o mesmo percentual.
    // Forçar a soma a 100 dava "1 · 13%" ao lado de "1 · 12%".
    return rows.map(([type, value]) => ({
      label: APPOINTMENT_TYPE_LABELS[type] ?? type, value, detail: `· ${Math.round((value / total) * 100)}%`,
    }));
  }, [scoped.appointments]);

  const durationByType = useMemo(() => {
    const map = new Map();
    for (const a of scoped.appointments) {
      if (a.status !== APPOINTMENT_STATUS.DONE || !a.inicioAtendimento || !a.fimAtendimento) continue;
      const m = (new Date(a.fimAtendimento) - new Date(a.inicioAtendimento)) / 60000;
      const row = map.get(a.tipo) ?? { sum: 0, n: 0 };
      row.sum += m; row.n += 1; map.set(a.tipo, row);
    }
    return Array.from(map.entries())
      .map(([type, r]) => {
        const typeLabel = APPOINTMENT_TYPE_LABELS[type] ?? type;
        const totalForType = byType.find(t => t.label === typeLabel)?.value ?? r.n;
        return { label: typeLabel, value: r.sum / r.n, n: r.n, total: totalForType, detail: `· ${r.n} de ${totalForType} com hora de início` };
      })
      .sort((a, b) => b.value - a.value);
  }, [scoped.appointments, byType]);

  // Crianças distintas por CID, não evoluções: um paciente com 23 retornos
  // pesava como 23 casos e o "perfil da clínica" era o perfil da agenda.
  const epidemiology = useMemo(() => {
    const map = new Map();
    for (const note of scoped.notes) {
      if (!note.cidPrincipal || !note.pacienteId) continue;
      if (!map.has(note.cidPrincipal)) map.set(note.cidPrincipal, new Set());
      map.get(note.cidPrincipal).add(note.pacienteId);
    }
    return Array.from(map.entries())
      .map(([code, children]) => ({
        code,
        label: findCID10(code)?.descricao ?? '',
        value: children.size,
        detail: children.size === 1 ? 'criança' : 'crianças',
      }))
      // Lista inteira: cortar em 8 escondia um diagnóstico no trimestre que
      // aparecia no mês — e a lista parecia completa.
      .sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
  }, [scoped.notes]);

  // Medicações mais prescritas: agrupadas por princípio ativo (ou nome comercial)
  // contabilizando o total de crianças atendidas com o medicamento no período.
  const topMedications = useMemo(() => {
    const map = new Map();

    const register = (rawName, patientId) => {
      if (!rawName) return;
      const clean = String(rawName).trim();
      if (!clean) return;
      // Normalização com inicial maiúscula
      const normalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      if (!map.has(normalized)) {
        map.set(normalized, { label: normalized, children: new Set(), total: 0 });
      }
      const entry = map.get(normalized);
      if (patientId) entry.children.add(patientId);
      entry.total += 1;
    };

    // 1. Medicações registradas diretamente no prontuário do paciente
    for (const med of scoped.medications) {
      register(med.principioAtivo || med.nome, med.pacienteId);
    }

    // 2. Prescrições emitidas via documentos clínicos no período
    for (const doc of scoped.documents) {
      if (doc.tipo !== DOCUMENT_TYPES.PRESCRIPTION && !doc.itens?.length) continue;
      if (Array.isArray(doc.itens)) {
        for (const item of doc.itens) {
          register(item.principio || item.nome || item.medicamento, doc.pacienteId);
        }
      }
    }

    return Array.from(map.values())
      .map((entry) => {
        const count = entry.children.size || entry.total;
        return {
          label: entry.label,
          value: count,
          detail: count === 1 ? 'criança' : 'crianças',
        };
      })
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [scoped.medications, scoped.documents]);

  // Faltas por dia da semana: diz em que dia a confirmação da véspera rende
  // mais. Taxa sobre os encerrados daquele dia, não contagem bruta — segunda
  // tem mais agenda e teria mais faltas só por isso.
  const noShowByWeekday = useMemo(() => {
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const closed = new Map(days.map((d) => [d, { label: d, closed: 0, noShow: 0 }]));
    for (const a of scoped.appointments) {
      if (![APPOINTMENT_STATUS.DONE, APPOINTMENT_STATUS.NO_SHOW].includes(a.status)) continue;
      const weekday = new Date(a.inicio).getDay();
      const bucket = closed.get(days[weekday - 1]);
      if (!bucket) continue;
      bucket.closed += 1;
      if (a.status === APPOINTMENT_STATUS.NO_SHOW) bucket.noShow += 1;
    }
    return Array.from(closed.values()).filter((d) => d.closed >= MIN_DAY_SAMPLE);
  }, [scoped.appointments]);

  // O dia com a maior taxa de faltas, só quando é único e está acima da média:
  // é o que vira ação na primeira dobra.
  const worstDay = useMemo(() => {
    const rows = noShowByWeekday
      .map((d) => ({ ...d, expected: d.closed, rate: d.closed ? d.noShow / d.closed : 0 }));
    const sorted = [...rows].sort((a, b) => b.rate - a.rate);
    const [leader, second] = sorted;
    if (!leader?.rate || production.absenteeism == null || leader.rate <= production.absenteeism) return null;
    // Amostra mínima: uma falta em cinco atendimentos não é padrão, é acaso.
    if (leader.noShow < MIN_NOSHOW_SAMPLE || leader.closed < MIN_DAY_SAMPLE) return null;
    // Distância mínima do segundo: 6 de 38 contra 5 de 37 é uma falta de
    // diferença, não "o dia que concentra as faltas".
    if (second && (leader.rate - second.rate < MIN_RATE_GAP || leader.noShow - second.noShow < MIN_NOSHOW_GAP)) return null;
    return leader;
  }, [noShowByWeekday, production.absenteeism]);

  // Mesma regra da Visão geral: um só número de "sem confirmação" no painel.
  const unconfirmedNextWeek = useMemo(() => confirmationWindow(data.appointments, 7).unconfirmed, [data.appointments]);

  // Primeiro registro da base: o que vem antes dele no skyline não é "zero
  // atendimentos", é ausência de dado. Desenhá-lo como dia vazio fazia a
  // produção parecer ter começado em queda.
  const firstRecordDay = useMemo(
    () => data.appointments.map((a) => localDay(a.inicio)).filter(Boolean).sort()[0] ?? null,
    [data.appointments],
  );

  // Skyline: os últimos 12 meses, dia a dia, do mesmo universo do KPI
  // "Atendimentos concluídos" (concluídos da unidade selecionada). O período
  // escolhido fica em foco; o resto esmaece, e a soma do foco é o KPI.
  const today = localDay(new Date().toISOString());
  const skyline = useMemo(() => {
    const done = new Map();
    const missed = new Map();
    for (const a of data.appointments) {
      const day = localDay(a.inicio);
      if (!day) continue;
      if (a.status === APPOINTMENT_STATUS.DONE) done.set(day, (done.get(day) ?? 0) + 1);
      else if (a.status === APPOINTMENT_STATUS.NO_SHOW) missed.set(day, (missed.get(day) ?? 0) + 1);
    }
    const window = skylineWindow(today);
    const inWindowDay = (day) => day >= window.from && day <= window.to;
    const days = [...new Set([...done.keys(), ...missed.keys()])].filter(inWindowDay).map((date) => {
      const faltas = missed.get(date) ?? 0;
      return { date, count: done.get(date) ?? 0, note: faltas ? `${faltas} ${faltas === 1 ? 'falta' : 'faltas'}` : undefined };
    });
    const total = days.reduce((t, d) => t + d.count, 0);
    const busiest = days.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), null);
    // Médias só com dias FECHADOS: hoje ainda está em curso, e dividir o
    // período por um dia incompleto puxava a média para baixo.
    const inPeriod = days.filter((d) => d.count > 0 && inRange(d.date, range));
    const closed = inPeriod.filter((d) => d.date !== today);
    return {
      days, window, total, busiest,
      periodDays: inPeriod.length,
      closedDays: closed.length,
      closedMean: closed.length ? closed.reduce((t, d) => t + d.count, 0) / closed.length : null,
    };
  }, [data.appointments, range, today]);

  const fullDate = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const dmy = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
  const plural = (n, one, many) => (n === 1 ? one : many);
  const skylineStats = [
    { label: 'Últimos 12 meses', value: number(skyline.total), unit: plural(skyline.total, 'atendimento', 'atendimentos'), sub: `${dmy(skyline.window.from)} a ${dmy(skyline.window.to)}` },
    skyline.busiest
      ? { label: 'Dia mais movimentado', value: number(skyline.busiest.count), unit: plural(skyline.busiest.count, 'atendimento', 'atendimentos'), sub: fullDate(skyline.busiest.date) }
      : { label: 'Dia mais movimentado', value: '—', unit: '', sub: 'nenhum atendimento concluído' },
    { label: 'Dias com atendimento', value: number(skyline.periodDays), unit: plural(skyline.periodDays, 'dia', 'dias'), sub: `no período · ${rangeShort(range)}` },
    skyline.closedMean != null
      ? { label: 'Média por dia', value: number(skyline.closedMean, 1), unit: 'por dia com atendimento', sub: `${skyline.closedDays} ${plural(skyline.closedDays, 'dia fechado', 'dias fechados')}, sem hoje` }
      : { label: 'Média por dia', value: '—', unit: '', sub: 'nenhum dia fechado com atendimento no período' },
  ];
  const skylineNote = [
    `Fora de ${rangeShort(range)}, os dias aparecem esmaecidos.`,
    firstRecordDay && firstRecordDay > skyline.window.from
      ? `Sem registros antes de ${dmy(firstRecordDay)}: esses dias não contam como zero.`
      : null,
  ].filter(Boolean).join(' ');

  const revenue = scoped.entries
    .filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PAID)
    .reduce((total, e) => total + (Number(e.valor) || 0), 0);

  function exportCSV() {
    const rows = [
      ['Relatório de produção assistencial'],
      ['Período', `${range.from} a ${range.to}`],
      [],
      ['Indicador', 'Valor'],
      ['Atendimentos agendados', production.total],
      ['Atendimentos concluídos', production.done],
      ['Faltas', production.noShow],
      ['Cancelamentos', production.cancelled],
      ['Taxa de faltas (faltas ÷ concluídos + faltas)', production.absenteeism != null ? percent(production.absenteeism) : 'sem dados'],
      ['Duração média', production.avgDuration != null ? duration(production.avgDuration) : 'sem dados'],
      ['Espera média', production.avgWait != null ? duration(production.avgWait) : 'sem dados'],
      ['Recebido no período', money(revenue)],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `producao-${range.from}-a-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado.');
  }

  const hasData = data.appointments.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Indicadores"
        title="Relatórios"
        description="Produção assistencial, perfil epidemiológico da clínica e desempenho financeiro."
        toolbar={<PeriodTabs value={period} onChange={setPeriod} caption={`${plaza ? PLAZA_LABELS[plaza] : 'Todas as unidades'} · ${periodCaption(period, range)}`} />}
        actions={
          can.read('reports') ? (
            <Button icon="download" onClick={exportCSV} disabled={!hasData}>Exportar CSV</Button>
          ) : null
        }
      />

      <MetricStrip loading={loading}>
        <Metric
          featured
          mood="positive"
          label="Atendimentos concluídos"
          value={production.done}
          delta={comparable ? (variation(production.done, previous.done) === 0 ? <Chip tone="neutral">sem variação ({previous.done} em {prevLabel})</Chip> : <DeltaChip value={variation(production.done, previous.done)} />) : null}
          target={[
            prevHasRecords ? `${previous.done} em ${prevLabel}${smallSample ? ` · ${smallSampleNote}` : ''}` : noBase,
            production.waiting ? `${production.waiting} na recepção` : null,
            production.late ? `${production.late} ${production.late === 1 ? 'atrasado sem chegada' : 'atrasados sem chegada'}` : null,
            production.unresolved ? `${production.unresolved} sem desfecho registrado` : null,
            production.open ? `${production.open} por acontecer` : null,
          ].filter(Boolean).join(' · ')}
        />
        <Metric
          label="Taxa de faltas"
          value={production.absenteeism != null ? number(production.absenteeism * 100, 1) : '—'}
          suffix={production.absenteeism != null ? '%' : undefined}
          // Sem tom no número: vermelho fixo pintava de alarme uma taxa que caía.
          // A direção é do selo de variação.
          delta={comparable && production.absenteeism != null && previous.absenteeism != null && production.expected >= MIN_COMPARE && previous.expected >= MIN_COMPARE
            ? (variation(production.absenteeism, previous.absenteeism) === 0 ? <Chip tone="neutral">sem variação</Chip> : <DeltaChip value={(production.absenteeism - previous.absenteeism) * 100} suffix=" p.p." inverse />)
            : null}
          target={production.absenteeism != null
            ? (prevHasRecords && previous.absenteeism != null && (production.expected < MIN_COMPARE || previous.expected < MIN_COMPARE))
              ? `${production.noShow} de ${production.expected} esperados: ${smallSampleNote}`
              : `${production.noShow} de ${production.expected} esperados · ${prevHasRecords && previous.absenteeism != null ? `${percent(previous.absenteeism, 1)} em ${prevLabel}` : noBase}`
            : undefined}
        />
        <Metric
          label="Duração média"
          value={production.avgDuration != null ? Math.round(production.avgDuration) : '—'}
          suffix={production.avgDuration != null ? 'min' : undefined}
          // Mesma gramática dos vizinhos: selo de variação + base. Neutro: consulta
          // mais longa não é melhor nem pior.
          delta={comparable && production.avgDuration != null && previous.avgDuration != null
            // Diferença dos valores ARREDONDADOS que a tela mostra: 45 − 43 = 2.
            ? (Math.round(production.avgDuration) - Math.round(previous.avgDuration) === 0 ? <Chip tone="neutral">sem variação</Chip> : <DeltaChip value={Math.round(production.avgDuration) - Math.round(previous.avgDuration)} suffix=" min" neutral />)
            : null}
          target={production.avgDuration == null && production.done > 0
            ? 'sem registro de início de atendimento no período'
            : production.done > 0
              ? [
                // O que se mede, entre quais marcos, e sobre quantos.
                'do início à conclusão',
                `${production.done - production.missingStartCount} de ${production.done} concluídos com hora de início`,
                production.teleconsultasCount ? `inclui ${production.teleconsultasCount} ${production.teleconsultasCount === 1 ? 'teleconsulta' : 'teleconsultas'}` : null,
                prevHasRecords && previous.avgDuration != null ? `${Math.round(previous.avgDuration)}\u00a0min em ${prevLabel}${smallSample ? ` · ${smallSampleNote}` : ''}` : noBase,
              ].filter(Boolean).join(' · ')
              : prevHasRecords && previous.avgDuration != null
                ? `${Math.round(previous.avgDuration)}\u00a0min em ${prevLabel}${smallSample ? ` · ${smallSampleNote}` : ''}`
                : noBase}
        />
        <Metric
          label="Espera média"
          value={production.avgWait != null ? Math.round(production.avgWait) : '—'}
          suffix={production.avgWait != null ? 'min' : undefined}
          delta={comparable && production.avgWait != null && previous.avgWait != null && production.waitCount >= MIN_COMPARE
            ? (Math.round(production.avgWait) - Math.round(previous.avgWait) === 0 ? <Chip tone="neutral">sem variação</Chip> : <DeltaChip value={Math.round(production.avgWait) - Math.round(previous.avgWait)} suffix=" min" inverse />)
            : null}
          target={(() => {
            if (production.avgWait == null && production.waitBase > 0) return 'sem registro de início de atendimento no período';
            // Chegada de horas atrás sem atendimento não é espera em curso.
            const live = liveWaits.filter((w) => !w.stale);
            const stale = liveWaits.length - live.length;
            if (live.length) return `Agora: ${live.length === 1 ? '1 criança espera' : `${live.length} crianças esperam`} há até ${duration(live[0].minutes)}, fora da média`;
            if (stale) return `${stale} ${stale === 1 ? 'chegada de hoje sem início' : 'chegadas de hoje sem início'} de atendimento, fora da média`;
            // A base da média: quantos atendimentos tinham chegada registrada.
            // O que se mede: da chegada ao INÍCIO do atendimento (não ao horário marcado).
            const base = `da chegada ao início · ${production.waitCount} ${production.waitCount === 1 ? 'presencial com chegada' : 'presenciais com chegada'} · ${production.missingWaitStartCount} sem hora de início`;
            // A janela anterior é dita em TODO KPI da faixa, inclusive quando falta.
            if (!prevHasRecords || previous.avgWait == null) return `${base} · ${noBase}`;
            return `${base} · ${Math.round(previous.avgWait)}\u00a0min em ${prevLabel}${production.waitCount < MIN_COMPARE ? ` · ${smallSampleNote}` : ''}`;
          })()}
        />
        <Metric
          label="Recebido no período"
          value={<MoneyValue value={revenue} cents={false} />}
          delta={prevHasRevenue && comparable ? (variation(revenue, prevRevenue) === 0 ? <Chip tone="neutral">sem variação</Chip> : <DeltaChip value={variation(revenue, prevRevenue)} />) : null}
          target={prevHasRevenue ? `${money(prevRevenue)} em ${prevLabel}` : noBase}
        />
      </MetricStrip>

      {/* Sem padrão de faltas para apontar, a primeira dobra ainda oferece a
          ação que reduz faltas: confirmar quem vem nos próximos 7 dias. */}
      {!worstDay && unconfirmedNextWeek ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          <div className="ops-alert" role="status">
            <Icon name="message-circle" size={15} />
            <p>
              <strong>{unconfirmedNextWeek} {unconfirmedNextWeek === 1 ? 'consulta dos próximos 7 dias ainda não confirmada' : 'consultas dos próximos 7 dias ainda não confirmadas'}.</strong>{' '}
              Taxa de faltas no período: {production.absenteeism != null ? percent(production.absenteeism, 1) : 'sem dado'}.
              {messagingOptIn(data.consents ?? []) ? '' : ' Nenhuma família com consentimento para mensagens: registre o opt-in antes de pedir confirmação.'}
            </p>
            <Button size="sm" onClick={() => navigate('/comunicacao')}>
              {messagingOptIn(data.consents ?? []) ? 'Pedir confirmação' : 'Registrar consentimento'}
            </Button>
          </div>
        </>
      ) : null}

      {worstDay ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          {/* Padrão de faltas é aviso para planejar, não urgência: o mesmo tom
              do aviso de confirmação. Vermelho fica para o que está errado agora. */}
          <div className="ops-alert" role="status">
            <Icon name="message-circle" size={15} />
            <p>
              <strong>{worstDay.label} concentra a maior taxa de faltas: {percent(worstDay.rate, 1)}</strong>{' '}
              ({worstDay.noShow} de {worstDay.expected}), contra {percent(production.absenteeism, 1)} no período inteiro.
            </p>
            <Button size="sm" onClick={() => navigate('/comunicacao')}>Programar confirmação</Button>
          </div>
        </>
      ) : null}

      <div style={{ height: 'var(--gutter)' }} />

      {loading ? (
        <div className="bento" aria-busy="true" aria-label="Carregando relatórios">
          <div style={{ gridColumn: 'span 6' }}><Skeleton height={456} radius="var(--r-lg)" card /></div>
          <div style={{ gridColumn: 'span 6' }}><Skeleton height={456} radius="var(--r-lg)" card /></div>
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyState
            icon="chart-bar"
            title="Ainda não há o que relatar"
            description="Os relatórios são calculados a partir de atendimentos reais. Depois das primeiras consultas registradas, esta tela ganha conteúdo."
          />
        </Card>
      ) : (
        <div className="bento bento--top-heavy">
          <Card span={12} className="card--production">
            <CardHeader
              title="Produção assistencial"
              subtitle="Atendimentos concluídos por dia nos últimos 12 meses · o período selecionado fica em destaque"
            />
            <CardBody>
              {skyline.total > 0 ? (
                <DotCalendar
                  data={skyline.days}
                  endDate={skyline.window.to}
                  dataFrom={firstRecordDay}
                  focus={range}
                  summary={{ value: number(production.done), label: `concluídos em ${rangeShort(range)}` }}
                  stats={skylineStats}
                  note={skylineNote}
                />
              ) : (
                <EmptyState icon="chart-bar" title="Nenhum atendimento concluído nos últimos 12 meses" compact />
              )}
            </CardBody>
          </Card>

          <Card span={6}>
            <CardHeader title="Tipos de atendimento" subtitle={`Entre os ${number(production.done)} concluídos`} />
            <CardBody>
              {byType.length ? (
                <>
                  {/* Barra cheia = todos os concluídos: o comprimento é a fatia que o rótulo diz. */}
                  <CategoryBars items={byType} formatValue={(v) => number(v)} scaleMax={production.done || undefined} />
                  {byType.reduce((t, r) => t + Math.round((r.value / Math.max(production.done, 1)) * 100), 0) !== 100 ? (
                    <p className="chart__note">Percentuais arredondados: a soma pode dar 99% ou 101%.</p>
                  ) : null}
                  <div className="card-subsection">
                    <p className="flow-pair__label">Duração média por tipo</p>
                    {/* Barras só quando há diferença a mostrar. Quatro barras de 42 a
                        44 min não dizem nada que uma frase não diga melhor. */}
                    {/* A frase "sem diferença" só com amostra: 1 atendimento de
                        teleconsulta não sustenta comparação nenhuma. */}
                    {durationByType.every((d) => d.n < MIN_TYPE_SAMPLE) ? (
                      <EmptyState 
                        icon="clock" 
                        title="Poucos atendimentos com hora de início por tipo para comparar" 
                        action={<Button size="sm" onClick={() => navigate('/agenda')}>Ver atendimentos sem início</Button>} 
                        compact 
                      />

                    ) : durationSpread(durationByType) > 0.15 || durationByType.some((d) => d.n < MIN_TYPE_SAMPLE) ? (
                      <>
                        <CategoryBars 
                          items={durationByType} 
                          formatValue={(v) => `${Math.round(v)}\u00a0min`} 
                          emphasis={durationSpread(durationByType) > 0.15 ? undefined : () => 'plain'} 
                          valueWidth={176} 
                        />
                        {durationSpread(durationByType) <= 0.15 ? (
                          <p className="chart__note">
                            Nenhum tipo é destacado: a diferença entre eles está dentro da variação normal.
                          </p>
                        ) : null}
                        {durationByType.some((d) => d.n < MIN_TYPE_SAMPLE) ? (
                          <p className="chart__note">
                            Menos de {MIN_TYPE_SAMPLE} atendimentos em{' '}
                            {durationByType.filter((d) => d.n < MIN_TYPE_SAMPLE).map((d) => d.label.toLowerCase()).join(', ')}: pouco para comparar os tipos.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="report-note report-note--plain">
                        {/* A frase leva os valores de cada tipo: o leitor confere o "sem diferença". */}
                        {durationByType.map((d) => `${d.label} ${Math.round(d.value)}\u00a0min`).join(' · ')}: sem diferença relevante entre os tipos.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState icon="chart-bar" title="Sem atendimentos concluídos no período" compact />
              )}
            </CardBody>
          </Card>

          <Card span={6} style={{ alignSelf: 'start' }}>
            <CardHeader title="Comparecimento" subtitle={`${number(production.expected)} atendimentos esperados no período`} />
            <CardBody>
              {production.expected ? (
                <>
                  {/* Uma casa decimal, como o KPI "Taxa de faltas" acima. */}
                  <StackedRatioBar
                    decimals={1}
                    formatValue={(v) => number(v)}
                    segments={[
                      { label: 'Compareceram', value: production.done, tone: 'mid' },
                      { label: 'Faltaram', value: production.noShow, tone: 'danger' },
                    ]}
                  />
                  {production.unresolved ? (
                    <p className="report-note report-note--danger">
                      <Icon name="history" size={13} />
                      {production.unresolved === 1
                        ? '1 consulta passada está sem desfecho registrado e fica fora da taxa até ser registrada.'
                        : `${production.unresolved} consultas passadas estão sem desfecho registrado e ficam fora da taxa até serem registradas.`}
                    </p>
                  ) : null}
                  {production.cancelled ? (
                    <p className="report-note">
                      <Icon name="info" size={13} />
                      {production.cancelled === 1
                        ? '1 agendamento foi cancelado com aviso e não conta como falta.'
                        : `${production.cancelled} agendamentos foram cancelados com aviso e não contam como falta.`}
                    </p>
                  ) : null}

                  {noShowByWeekday.length ? (
                    <div className="card-subsection">
                      <p className="flow-pair__label">Taxa de faltas por dia da semana</p>
                      {/* Números, sem barras. Barras vermelhas iguais eram cor sem
                          sentido; barras cinza ao lado do "Faltaram" vermelho eram a
                          mesma falta em duas cores. O vermelho fica só no dia apontado. */}
                      <ul className="rate-list">
                        {noShowByWeekday.map((d) => (
                          <li key={d.label} className={worstDay && d.label === worstDay.label ? 'is-flagged' : ''}>
                            <span className="rate-list__label">{d.label}</span>
                            <strong className="num">{percent(d.noShow / d.closed, 1)}</strong>
                            <span className="rate-list__base num">{d.noShow} de {d.closed}</span>
                          </li>
                        ))}
                      </ul>
                      {/* A regra do destaque fica escrita: sem ela, terça vermelha
                          no ano e cinza no mês parecia a mesma coisa em duas cores. */}
                      <p className="chart__note">
                        {(() => {
                          const ranked = [...noShowByWeekday].sort((a, b) => b.noShow / b.closed - a.noShow / a.closed);
                          if (worstDay) {
                            const second = ranked.find((d) => d.label !== worstDay.label);
                            return `Em vermelho: ${worstDay.label.toLowerCase()} concentra as faltas${second ? `, ${worstDay.noShow - second.noShow} a mais que ${second.label.toLowerCase()}-feira` : ''}.`;
                          }
                          if (ranked.length < 2) return 'Um só dia com atendimentos encerrados: nada a comparar.';
                          // Sem nenhuma falta no período não existe "a maior taxa":
                          // a frase inventava um ranking de zeros.
                          if (!ranked.some((d) => d.noShow > 0)) return 'Nenhuma falta no período: não há dia a comparar.';
                          // A ordem é por TAXA: a diferença também tem de ser em
                          // taxa. Subtrair contagem depois de ordenar por taxa
                          // imprimia "−1 faltas a mais" quando o dia de maior
                          // taxa tinha menos faltas que o seguinte.
                          const rateOf = (d) => (d.closed ? d.noShow / d.closed : 0);
                          // Poucos atendimentos por dia: a frase concluiria o que a
                          // tabela logo acima desmente (33,3% de 1 em 3 contra 0%).
                          if (ranked.slice(0, 2).some((d) => d.closed < MIN_DAY_SAMPLE_WEEKDAY)) {
                            return 'Poucos atendimentos por dia da semana neste período para comparar os dias.';
                          }
                          const gapPp = (rateOf(ranked[0]) - rateOf(ranked[1])) * 100;
                          const comparison = gapPp < 0.05
                            ? 'tem praticamente a mesma taxa de'
                            : `está ${number(gapPp, 1)}\u00a0p.p. acima de`;
                          return `Nenhum dia se destaca: ${ranked[0].label.toLowerCase()}, a maior taxa (${percent(rateOf(ranked[0]), 1)}), ${comparison} ${ranked[1].label.toLowerCase()}, a seguinte.`;
                        })()}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState icon="calendar" title="Sem atendimentos esperados no período" compact />
              )}
            </CardBody>
          </Card>

          <Card span={6} style={{ alignSelf: 'start' }}>
            <CardHeader
              title="Perfil epidemiológico"
              subtitle={(() => {
                const children = new Set(scoped.notes.filter((n) => n.cidPrincipal).map((n) => n.pacienteId)).size;
                const counted = epidemiology.reduce((t, e) => t + e.value, 0);
                // Uma criança com CIDs diferentes em evoluções distintas conta em
                // cada CID: a soma das barras passa do total, e a tela diz por quê.
                const top = Math.max(0, ...epidemiology.map((e) => e.value));
                return `${children} ${children === 1 ? 'criança atendida' : 'crianças atendidas'} no período, por CID-10 principal`
                  + (counted > children ? ` · ${counted - children} com mais de um CID, contada em cada` : '')
                  + (top ? ` · barra cheia = ${top} ${top === 1 ? 'criança' : 'crianças'}` : '');
              })()}
            />
            <CardBody>
              {epidemiology.length ? (
                <CategoryBars items={epidemiology} formatValue={(v) => number(v)} layout="stacked" valueWidth={96} />
              ) : (
                <EmptyState
                  icon="brain"
                  title="Nenhum CID registrado"
                  description="O perfil aparece conforme as evoluções forem sendo assinadas com CID-10."
                  compact
                />
              )}
            </CardBody>
          </Card>

          <Card span={6} style={{ alignSelf: 'start' }}>
            <CardHeader
              title="Medicações mais prescritas"
              subtitle={(() => {
                const children = new Set([
                  ...scoped.medications.filter((m) => m.principioAtivo || m.nome).map((m) => m.pacienteId),
                  ...scoped.documents.filter((d) => d.tipo === DOCUMENT_TYPES.PRESCRIPTION && d.itens?.length).map((d) => d.pacienteId),
                ].filter(Boolean)).size;
                const counted = topMedications.reduce((t, m) => t + m.value, 0);
                const top = Math.max(0, ...topMedications.map((m) => m.value));
                return `${children} ${children === 1 ? 'criança com prescrição' : 'crianças com prescrição'} no período, por princípio ativo`
                  + (counted > children ? ` · ${counted - children} com mais de um fármaco, contada em cada` : '')
                  + (top ? ` · barra cheia = ${top} ${top === 1 ? 'criança' : 'crianças'}` : '');
              })()}
            />
            <CardBody>
              {topMedications.length ? (
                <CategoryBars items={topMedications} formatValue={(v) => number(v)} layout="stacked" valueWidth={96} />
              ) : (
                <EmptyState
                  icon="pill"
                  title="Nenhuma medicação registrada no período"
                  description="As medicações mais frequentes aparecem conforme forem prescritas ou registradas no prontuário."
                  compact
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

const ABSENTEEISM_ALERT = 0.15;
const MIN_NOSHOW_SAMPLE = 5;
const MIN_DAY_SAMPLE = 10;
const MIN_TYPE_SAMPLE = 5;
// Mínimo de atendimentos encerrados por dia da semana para comparar um dia com outro.
const MIN_DAY_SAMPLE_WEEKDAY = 5;
const MIN_RATE_GAP = 0.05;
const MIN_NOSHOW_GAP = 2;

/** Indicadores de produção de um conjunto de agendamentos. */
function summarizeProduction(appointments) {
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
  const missingWaitStartCount = waitBaseList.length - waits.length;
  const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
  return {
    done: done.length, noShow: noShow.length, cancelled: cancelled.length,
    expected, total: expected + cancelled.length,
    absenteeism: expected ? noShow.length / expected : null,
    avgDuration: mean(durations),
    avgWait: mean(waits),
    waitCount: waits.length,
    waitBase: waitBaseList.length,
    missingStartCount,
    missingWaitStartCount,
    teleconsultasCount,
  };
}

/** Diferença relativa entre a maior e a menor duração média. */
function durationSpread(rows) {
  if (rows.length < 2) return 0;
  const values = rows.map((r) => r.value);
  return (Math.max(...values) - Math.min(...values)) / Math.max(...values);
}

function variation(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
