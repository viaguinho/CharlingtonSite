import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '../../core/session.jsx';
import { ROLES } from '../../core/rbac.js';
import * as repo from '../../data/repository.js';
import {
  STORES, APPOINTMENT_STATUS, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE,
  APPOINTMENT_TYPE_LABELS, DOCUMENT_STATUS, ENTRY_STATUS, ENTRY_TYPES,
} from '../../data/schema.js';
import { GreetingHeader, Bento } from '../../components/Shell.jsx';
import AgendaPanel from './AgendaPanel.jsx';
import RescheduleDialog from '../agenda/RescheduleDialog.jsx';
import { Card, CardHeader, CardBody, Metric, MetricStrip, EmptyState, Skeleton, MoneyValue } from '../../components/Card.jsx';
import { Button, Chip, StatusDot, Avatar, IconButton } from '../../components/primitives.jsx';
import { BarChart, Gauge, StackedRatioBar } from '../../charts/index.jsx';
import TickRuler from '../../charts/TickRuler.jsx';
import { PERIOD_OPTIONS } from '../../components/Tabs.jsx';
import { localDay, periodRange, inRange, bucketsFor, bucketKey, grainLabel } from '../../core/periods.js';
import { isLate, isUpcoming, isUnresolved, canReschedule, displayStatus, waitInfo, confirmationWindow, oldestByDay, namesList, trailingNoShows, CONSECUTIVE_NO_SHOW_ALERT, teleconsultsWithoutConsent, messagingOptIn } from '../../core/appointments.js';
import Icon from '../../components/Icon.jsx';
import { time, money, age, isoDay, duration } from '../../core/format.js';

/**
 * Visão geral.
 *
 * Não é uma tela — é uma por papel. O médico precisa saber quem chega e o que
 * falta decidir; a recepção precisa saber o que confirmar e quem está
 * esperando; o financeiro precisa saber o que entra e o que sai. Servir o
 * mesmo mural de KPIs para os três seria servir mal para os três.
 */
export default function OverviewScreen() {
  const { user, plaza, can } = useSession();
  const [state, setState] = useState({ loading: true, data: null });
  // Gravação feita na agenda do card (status, remarcação, novo agendamento)
  // recarrega a tela inteira: os KPIs e as pendências contam o mesmo registro.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const where = plaza ? { praca: plaza } : {};
      const [appointments, patients, documents, entries, consents, rooms] = await Promise.all([
        repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
        repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
        repo.list(STORES.ENTRIES, { where }).catch(() => []),
        repo.list(STORES.CONSENTS, {}).catch(() => []),
        repo.list(STORES.ROOMS, { where }).catch(() => []),
      ]);
      if (!cancelled) setState({ loading: false, data: { appointments, patients, documents, entries, consents, rooms } });
    })();

    return () => { cancelled = true; };
  }, [plaza, version]);

  if (state.loading) return <div className="ov"><OverviewSkeleton /></div>;

  const props = { ...state.data, user, canFinance: can?.read?.('finance'), canSchedule: !!can?.write?.('agenda'), onChanged: () => setVersion((v) => v + 1) };

  return (
    <div className="ov">
      <GreetingHeader>
        <Button variant="primary" icon="plus" onClick={() => window.location.hash = '#/pacientes?novo=1'}>
          Novo paciente
        </Button>
      </GreetingHeader>

      {user?.role === ROLES.FINANCE ? <FinanceHome {...props} />
        : user?.role === ROLES.RECEPTION ? <ReceptionHome {...props} />
        : <DoctorHome {...props} />}
    </div>
  );
}

/* ═══════════════════════════ Home do médico ═══════════════════════════ */

function DoctorHome({ appointments, patients, documents, entries = [], consents = [], rooms = [], canFinance, canSchedule, onChanged }) {
  const navigate = useNavigate();
  const [rescheduling, setRescheduling] = useState(null);
  // Remarcar só onde ainda cabe: agendado ou confirmado, e só para quem edita a agenda.
  const rescheduleButton = (a) => (canSchedule && canReschedule(a)
    ? <IconButton name="calendar" label="Remarcar" onClick={() => setRescheduling(a)} />
    : null);
  const today = isoDay();

  const todays = useMemo(
    () => appointments
      .filter((a) => localDay(a.inicio) === today && a.status !== APPOINTMENT_STATUS.CANCELLED)
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? '')),
    [appointments, today],
  );

  const checkedIn = todays
    .filter((a) => a.status === APPOINTMENT_STATUS.CHECKED_IN)
    .sort((a, b) => (a.checkInEm ?? '').localeCompare(b.checkInEm ?? ''));
  // Na recepção é quem chegou HOJE e espera há menos de 4 h. Chegada antiga
  // sem atendimento, e qualquer consulta de dia passado ainda em aberto, é
  // "sem desfecho": a mesma regra da Agenda, dos Relatórios e dos Pacientes.
  const waiting = checkedIn.filter((a) => !isUnresolved(a));
  const unresolved = useMemo(
    () => appointments.filter((a) => isUnresolved(a)).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [appointments],
  );
  const done = todays.filter((a) => a.status === APPOINTMENT_STATUS.DONE);
  // A Agenda diz "fora 1 cancelada": a Visão geral fala do mesmo dia.
  const cancelledToday = appointments.filter((a) => localDay(a.inicio) === today && a.status === APPOINTMENT_STATUS.CANCELLED).length;
  const pendingDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.PENDING);
  const activePatients = patients.filter((p) => p.status === 'ativo');

  // Laudo concluído sem documento emitido: o atendimento aconteceu, foi
  // cobrado, e a família ainda não tem o papel. "A assinar 0" escondia isso.
  const reportsToIssue = useMemo(() => {
    const issued = new Set(documents.map((d) => d.atendimentoId).filter(Boolean));
    return appointments.filter((a) => a.tipo === 'laudo'
      && a.status === APPOINTMENT_STATUS.DONE && !issued.has(a.id));
  }, [appointments, documents]);

  // Em acompanhamento sem nenhum retorno marcado dali para frente.
  const withoutReturn = useMemo(() => {
    const upcoming = new Set(appointments
      .filter((a) => localDay(a.inicio) >= today && [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS].includes(a.status))
      .map((a) => a.pacienteId));
    return activePatients.filter((p) => !upcoming.has(p.id));
  }, [appointments, activePatients, today]);

  // Horário que já passou sem check-in: não é "restante", é atraso ou falta
  // ainda não registrada. A recepção precisa ver isso antes de marcar falta.
  const late = todays.filter((a) => isLate(a));
  const upcomingToday = todays.filter((a) => isUpcoming(a));
  // Tudo que tem horário passado e nenhum desfecho: atrasados de hoje e
  // consultas em aberto de dias anteriores.
  const needsRecord = [...late, ...unresolved];

  // Dinheiro que já devia ter entrado: é pendência de quem decide, e a tela
  // inicial não mostrava nenhum real. Só para quem tem acesso ao financeiro.
  const overdueTitles = canFinance
    ? entries.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PENDING && e.vencimento && e.vencimento < today)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    : [];
  const overdueTotal = overdueTitles.reduce((t, e) => t + (Number(e.valor) || 0), 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const in7Days = isoDay(nextWeek);
  const payableSoonTitles = canFinance
    ? entries.filter((e) => e.tipo === ENTRY_TYPES.EXPENSE && e.status === ENTRY_STATUS.PENDING && e.vencimento >= today && e.vencimento <= in7Days)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    : [];
  const payableSoonTotal = payableSoonTitles.reduce((t, e) => t + (Number(e.valor) || 0), 0);


  const nameOf = (id) => patients.find((p) => p.id === id)?.nome ?? 'Paciente não vinculado';
  const waitMinutes = (a) => waitInfo(a).minutes;
  const oldestReports = oldestByDay(reportsToIssue, (a) => localDay(a.inicio));
  // O que a família já pagou por um laudo que ainda não recebeu: as duas telas
  // eram verdadeiras em separado e, juntas, escondiam isso.
  const reportsPaid = useMemo(() => {
    const ids = new Set(reportsToIssue.map((a) => a.id));
    return entries
      .filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PAID && ids.has(e.atendimentoId))
      .reduce((total, e) => total + (Number(e.valor) || 0), 0);
  }, [entries, reportsToIssue]);
  const confirmations = useMemo(() => confirmationWindow(appointments, 7), [appointments]);
  const shortDay = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  const next7DaysAppointments = useMemo(() => {
    if (!confirmations?.range) return [];
    return appointments
      .filter((a) => {
        const d = localDay(a.inicio);
        return d >= confirmations.range.from
          && d <= confirmations.range.to
          && a.status !== APPOINTMENT_STATUS.CANCELLED
          && (a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.SCHEDULED)
          && !a.titulo;
      })
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''));
  }, [appointments, confirmations]);

  const formatAppointmentSchedule = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${capitalizedWeekday}, ${dayMonth} às ${time(isoString)}`;
  };
  // Nenhuma família com opt-in: a mensagem de confirmação não sai, e a tela
  // que oferece a ação diz isso antes do clique.
  const optIn = messagingOptIn(consents);


  // Quanto entrou: recebido no mês corrente, até agora. Sem ele a tela das 8h
  // respondia três das quatro perguntas do dia.
  const monthStart = `${today.slice(0, 8)}01`;
  const receivedMonth = canFinance
    ? entries.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.status === ENTRY_STATUS.PAID
      && (localDay(e.pagamentoEm) ?? '') >= monthStart && (localDay(e.pagamentoEm) ?? '') <= today)
    : [];
  const receivedTotal = receivedMonth.reduce((t, e) => t + (Number(e.valor) || 0), 0);

  // Criança em acompanhamento que faltou às últimas consultas seguidas.
  const repeatedNoShows = useMemo(() => patients
    .filter((p) => p.status === 'ativo')
    .map((p) => ({ patient: p, run: trailingNoShows(appointments.filter((a) => a.pacienteId === p.id)) }))
    .filter((x) => x.run.length >= CONSECUTIVE_NO_SHOW_ALERT), [patients, appointments]);

  // Teleconsulta marcada nos próximos 14 dias sem consentimento vigente.
  const tele = useMemo(() => teleconsultsWithoutConsent(appointments, consents), [appointments, consents]);
  // Teleconsulta sem consentimento marcada para hoje ou amanhã: só aí é alerta.
  const teleUrgent = tele.upcoming.some((a) => localDay(a.inicio) <= addDays(today, 1));

  // Gráfico do hero: a situação dos atendimentos em cada período (semana,
  // mês, trimestre e ano corrente), com o mesmo critério de "sem desfecho"
  // dos KPIs ao lado. Reunião interna não é atendimento e fica fora.
  const statusPeriods = useMemo(() => buildStatusPeriods(appointments, today), [appointments, today]);
  const [heroPeriod, setHeroPeriod] = useState('month');
  const currentStatusPeriod = useMemo(
    () => statusPeriods.find((p) => p.key === heroPeriod) ?? statusPeriods[1] ?? statusPeriods[0],
    [statusPeriods, heroPeriod],
  );
  const productionBars = useMemo(
    () => buildProductionBars(appointments, heroPeriod, today),
    [appointments, heroPeriod, today],
  );
  const heroBarsTotal = useMemo(
    () => productionBars.reduce((t, d) => t + d.value, 0),
    [productionBars],
  );
  const heroBarsActive = useMemo(
    () => productionBars.filter((d) => d.value > 0).length,
    [productionBars],
  );
  const singleNoun = heroPeriod === 'year' ? 'mês' : heroPeriod === 'quarter' ? 'semana' : 'dia';
  const pluralNoun = heroPeriod === 'year' ? 'meses' : heroPeriod === 'quarter' ? 'semanas' : 'dias';
  const periodNounDesc = heroPeriod === 'week' ? 'nesta semana' : heroPeriod === 'month' ? 'neste mês' : heroPeriod === 'quarter' ? 'neste trimestre' : 'neste ano';

  // Quantas linhas a fila de pendências mostra (o texto do cartão conta).
  const pendingCount = late.length + waiting.length + unresolved.length + repeatedNoShows.length
    + (tele.children.size ? 1 : 0) + (reportsToIssue.length ? 1 : 0) + (overdueTitles.length ? 1 : 0)
    + (payableSoonTitles.length ? 1 : 0) + (pendingDocs.length ? 1 : 0);

  return (
    <Bento>
      {/* ——— Atividade dos pacientes: os indicadores do dia e a situação/produção (Lado Esquerdo Superior) ——— */}
      <Card span={7} className="ov-hero">
        <CardHeader
          icon="activity"
          title="Atividade dos pacientes"
          onExpand={() => navigate('/relatorios')}
        />
        <div className="ov-hero__body">
          <div className="ov-rail">
        <Metric
          featured
          label="Consultas hoje"
          value={todays.length}
          mood="volume"
          target={todays.length
            ? [done.length ? `${done.length} ${done.length === 1 ? 'concluída' : 'concluídas'}` : null,
              upcomingToday.length ? `${upcomingToday.length} por acontecer` : null,
              upcomingToday.length ? `primeira às ${time(upcomingToday[0].inicio)}` : null,
              cancelledToday ? `fora ${cancelledToday} ${cancelledToday === 1 ? 'cancelada' : 'canceladas'}` : null]
              .filter(Boolean).join(' · ') || `${todays.length} ${todays.length === 1 ? 'consulta' : 'consultas'}`
            : cancelledToday ? `Nenhuma consulta · ${cancelledToday} ${cancelledToday === 1 ? 'cancelada' : 'canceladas'}` : 'Nenhuma consulta agendada para hoje'}
        />
        <Metric
          featured
          label="Na recepção"
          value={waiting.length}
          mood="clinical"
          target={waiting.length
            ? `${nameOf(waiting[0].pacienteId).split(' ')[0]} espera há ${duration(waitMinutes(waiting[0]))}`
            : 'Ninguém esperando'}
        />
        <Metric
          featured
          label="Consultas sem desfecho"
          value={needsRecord.length}
          mood="attention"
          tone={needsRecord.length ? 'danger' : undefined}
          target={needsRecord.length
            ? `${needsRecord.length > 1 ? 'A mais antiga de' : 'De'} ${new Date(needsRecord[0].inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time(needsRecord[0].inicio)} · registrar chegada, atendimento ou falta`
            : 'Todas as consultas com desfecho registrado'}
        />
          </div>

          <div className="ov-hero__chart">
            <TickRuler
              periods={statusPeriods}
              activePeriod={heroPeriod}
              onPeriodChange={setHeroPeriod}
              title="Situação dos atendimentos"
              unit="atendimento"
            />

            <div className="ov-production-embed">
              <div className="ov-production-embed__head">
                <div className="ov-production-embed__title">
                  <Icon name="activity" size={14} />
                  <strong>Produção assistencial</strong>
                  <span className="ov-production-embed__caption">
                    {currentStatusPeriod?.caption ? `· ${currentStatusPeriod.caption}` : ''}
                  </span>
                </div>
                {heroBarsTotal > 0 ? (
                  <span className="ov-production-embed__summary">
                    <strong className="num">{heroBarsTotal}</strong> {heroBarsTotal === 1 ? 'concluído' : 'concluídos'}
                    <span className="ov-production-embed__days"> · {heroBarsActive} {heroBarsActive === 1 ? singleNoun : pluralNoun} com produção</span>
                  </span>
                ) : (
                  <span className="ov-production-embed__summary">
                    0 concluídos
                  </span>
                )}
              </div>

              <BarChart
                key={heroPeriod}
                data={productionBars}
                tone="positive"
                height={140}
                title={`Atendimentos concluídos ${grainLabel(heroPeriod)} no período`}
                valueLabel="Atendimentos concluídos"
                bucketNoun={pluralNoun}
                zeroLabel="sem atendimento concluído"
                emptyMessage={`Nenhum atendimento concluído ${periodNounDesc} até o momento.`}
                emptyAction={<Button size="sm" icon="calendar" onClick={() => navigate('/agenda')}>Abrir agenda</Button>}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ——— Coluna Lateral: Precisa de você + Confirmações (Lado Direito Superior, pareado com Atividade dos pacientes) ——— */}
      <div className="ov-side-column">
        {/* ——— Precisa de você (Metade Superior) ——— */}
        <Card className="ov-helper">
          <CardHeader icon="clipboard" title="Precisa de você" />
          <p className="ov-helper__lead">
            {pendingCount
              ? <>Você tem <strong>{pendingCount} {pendingCount === 1 ? 'pendência' : 'pendências'}</strong> no consultório, da mais urgente à rotina.</>
              : <>Nenhuma pendência no consultório <strong>agora</strong>.</>}
          </p>

          <section className="ov-insights" aria-label="Fila de pendências">
            <header className="ov-insights__head">
              <span className="ov-insights__title"><Icon name="list" size={16} /> Fila de pendências</span>
              {pendingCount ? <span className="ov-chip ov-chip--ink"><strong className="num">{pendingCount}</strong></span> : null}
            </header>
            <div className="ov-insights__body">
            {(pendingDocs.length || checkedIn.length || reportsToIssue.length || late.length || unresolved.length || overdueTitles.length || payableSoonTitles.length || repeatedNoShows.length || tele.children.size) ? (
              <ul className="pending">
                {late.map((a) => (
                  <li key={a.id}>
                    <span className="pending__icon pending__icon--danger"><Icon name="alert-triangle" size={15} /></span>
                    <span className="pending__text">
                      <strong>{nameOf(a.pacienteId)} não chegou</strong>
                      <span>Consulta das {time(a.inicio)} · {duration(Math.round((Date.now() - new Date(a.inicio)) / 60000))} de atraso · registrar chegada ou falta na agenda</span>
                    </span>
                    {rescheduleButton(a)}
                    <IconButton name="chevron-right" label="Abrir agenda" onClick={() => navigate('/agenda')} />
                  </li>
                ))}
                {waiting.map((a) => (
                  <li key={a.id}>
                    <span className="pending__icon pending__icon--warning"><Icon name="clock" size={15} /></span>
                    <span className="pending__text">
                      <strong>{nameOf(a.pacienteId)} está na recepção</strong>
                      <span>
                        Chegou às {time(a.checkInEm)} · espera há {duration(waitMinutes(a))} · consulta das {time(a.inicio)}
                      </span>
                    </span>
                    <IconButton name="chevron-right" label="Abrir prontuário" onClick={() => navigate(`/pacientes/${a.pacienteId}`)} />
                  </li>
                ))}
                {unresolved.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <span className="pending__icon pending__icon--danger"><Icon name="history" size={15} /></span>
                    <span className="pending__text">
                      <strong>{nameOf(a.pacienteId)}: consulta sem desfecho</strong>
                      <span>
                        {new Date(a.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {time(a.inicio)}
                        {' · '}{a.status === APPOINTMENT_STATUS.CHECKED_IN ? `chegou às ${time(a.checkInEm)} e não há atendimento` : `ainda "${APPOINTMENT_STATUS_LABELS[a.status].toLowerCase()}"`}
                        {' · '}registrar na agenda
                      </span>
                    </span>
                    {rescheduleButton(a)}
                    <IconButton name="chevron-right" label="Abrir agenda" onClick={() => navigate('/agenda')} />
                  </li>
                ))}
                {unresolved.length > 3 ? (
                  <li className="pending__more">E mais {unresolved.length - 3} {unresolved.length - 3 === 1 ? 'consulta' : 'consultas'} sem desfecho na agenda.</li>
                ) : null}
                {repeatedNoShows.map(({ patient, run }) => (
                  <li key={`faltas-${patient.id}`}>
                    {/* Falta repetida é padrão a conversar, não urgência de hoje:
                        a cor fica para o que precisa de ação agora. */}
                    <span className="pending__icon pending__icon--info"><Icon name="alert-triangle" size={15} /></span>
                    <span className="pending__text">
                      <strong>{patient.nome} faltou às {run.length} últimas consultas</strong>
                      <span>
                        {(() => {
                          // "20/07, 10/08 e 31/08": vírgulas e "e" só antes da última.
                          const days = run.slice().reverse().map((a) => new Date(a.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
                          return days.length > 1 ? `${days.slice(0, -1).join(', ')} e ${days[days.length - 1]}` : days[0];
                        })()}
                        {' · '}falar com a família
                      </span>
                    </span>
                    <IconButton name="chevron-right" label="Abrir prontuário" onClick={() => navigate(`/pacientes/${patient.id}`)} />
                  </li>
                ))}
                {tele.children.size ? (
                  <li>
                    {/* Âmbar só quando a próxima teleconsulta sem consentimento é
                        hoje ou amanhã; o resto é rotina a registrar. */}
                    <span className={`pending__icon pending__icon--${teleUrgent ? 'warning' : 'info'}`}><Icon name="video" size={15} /></span>
                    <span className="pending__text">
                      <strong>
                        Teleconsulta sem consentimento: {tele.children.size} {tele.children.size === 1 ? 'criança' : 'crianças'}
                      </strong>
                      <span>
                        {[
                          tele.done.length ? `${tele.done.length} ${tele.done.length === 1 ? 'consulta já realizada' : 'consultas já realizadas'}` : null,
                          tele.upcoming.length ? `${tele.upcoming.length} ${tele.upcoming.length === 1 ? 'consulta futura' : 'consultas futuras'} (próxima: ${nameOf(tele.upcoming[0].pacienteId).split(' ')[0]}, ${new Date(tele.upcoming[0].inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})` : null,
                        ].filter(Boolean).join(' · ')}
                        {' · '}registrar no prontuário
                      </span>
                    </span>
                    <IconButton name="chevron-right" label="Abrir prontuário"
                      onClick={() => navigate(`/pacientes?tab=attention`)} />
                  </li>
                ) : null}
                {reportsToIssue.length ? (
                  <li>
                    {/* Documento pendente é âmbar em toda tela, como o KPI acima. */}
                    <span className="pending__icon pending__icon--warning"><Icon name="file-text" size={15} /></span>
                    <span className="pending__text">
                      <strong>
                        {reportsToIssue.length} {reportsToIssue.length === 1 ? 'atendimento de laudo concluído' : 'atendimentos de laudo concluídos'} sem o documento emitido
                        {canFinance && reportsPaid ? ` · ${money(reportsPaid)} já recebidos` : ''}
                      </strong>
                      <span>
                        {oldestReports.items.length === 1 ? 'Mais antigo' : `${oldestReports.items.length} mais antigos`}:{' '}
                        {namesList(oldestReports.items.map((a) => nameOf(a.pacienteId)))},{' '}
                        {oldestReports.items.length === 1 ? 'atendido' : 'atendidos'} em {new Date(`${oldestReports.day}T12:00:00`).toLocaleDateString('pt-BR')}.
                      </span>
                    </span>
                    <IconButton name="chevron-right" label="Ver documentos" onClick={() => navigate('/documentos')} />
                  </li>
                ) : null}
                {overdueTitles.length ? (
                  <li>
                    <span className="pending__icon pending__icon--danger"><Icon name="wallet" size={15} /></span>
                    <span className="pending__text">
                      <strong>{overdueTitles.length} {overdueTitles.length === 1 ? 'título a receber vencido' : 'títulos a receber vencidos'} · {money(overdueTotal)}</strong>
                      <span>O mais antigo venceu em {new Date(`${overdueTitles[0].vencimento}T12:00:00`).toLocaleDateString('pt-BR')}.</span>
                    </span>
                    <IconButton name="chevron-right" label="Ver no financeiro" onClick={() => navigate('/financeiro')} />
                  </li>
                ) : null}
                {payableSoonTitles.length ? (
                  <li>
                    <span className="pending__icon pending__icon--warning"><Icon name="wallet" size={15} /></span>
                    <span className="pending__text">
                      <strong>{payableSoonTitles.length} {payableSoonTitles.length === 1 ? 'título a pagar vence' : 'títulos a pagar vencem'} em até 7 dias · {money(payableSoonTotal)}</strong>
                      <span>O próximo vence em {new Date(`${payableSoonTitles[0].vencimento}T12:00:00`).toLocaleDateString('pt-BR')}.</span>
                    </span>
                    <IconButton name="chevron-right" label="Ver no financeiro" onClick={() => navigate('/financeiro')} />
                  </li>
                ) : null}
                {pendingDocs.length ? (
                  <li>
                    <span className="pending__icon pending__icon--info"><Icon name="signature" size={15} /></span>
                    <span className="pending__text">
                      <strong>{pendingDocs.length} {pendingDocs.length === 1 ? 'documento aguardando assinatura' : 'documentos aguardando assinatura'}</strong>
                      <span>Assine em lote com um único código.</span>
                    </span>
                    <IconButton name="chevron-right" label="Ver" onClick={() => navigate('/documentos')} />
                  </li>
                ) : null}
              </ul>
            ) : (
              <EmptyState
                icon="check"
                title="Nada pendente"
                description="Nenhum documento a assinar, nenhum laudo a emitir e ninguém esperando na recepção."
                compact
              />
            )}
            </div>
          </section>
        </Card>

        {/* ——— Confirmações dos próximos 7 dias (Metade Inferior) ——— */}
        <Card className="ov-confirm-card">
          <CardHeader title="Confirmações · próximos 7 dias" />
          <div className="ov-confirm">
            {confirmations.total ? (
              <>
                <div className="ov-confirm__pill">
                  <span className="ov-confirm__caption">
                    <Icon name="calendar" size={14} />
                    Próximos 7 dias
                  </span>
                  <span className="ov-confirm__count">
                    <strong className="num">{confirmations.confirmed}</strong>{' '}
                    de {confirmations.total} {confirmations.total === 1 ? 'consulta confirmada' : 'consultas confirmadas'}
                  </span>
                  <span
                    className="ov-confirm__bar"
                    role="img"
                    aria-label={`${confirmations.confirmed} confirmadas e ${confirmations.unconfirmed} sem confirmação`}
                  >
                    <i style={{ flex: confirmations.confirmed }} />
                    <i className="is-pending" style={{ flex: confirmations.unconfirmed }} />
                  </span>
                  <span className="ov-confirm__meta">
                    Consultas de {shortDay(confirmations.range.from)} a {shortDay(confirmations.range.to)}
                    {confirmations.unconfirmed ? <span className="ov-confirm__warn"> · {confirmations.unconfirmed} sem confirmação</span> : null}
                  </span>
                </div>

                <div className="ov-confirm__list">
                  {next7DaysAppointments.map((a) => {
                    const isConfirmed = a.status === APPOINTMENT_STATUS.CONFIRMED;
                    const patientName = nameOf(a.pacienteId);

                    return (
                      <div key={a.id} className="ov-confirm__item">
                        <div className="ov-confirm__item-info">
                          <strong className="ov-confirm__item-name">{patientName}</strong>
                          <span className="ov-confirm__item-time">
                            {formatAppointmentSchedule(a.inicio)}
                          </span>
                        </div>
                        <div className="ov-confirm__item-actions">
                          {isConfirmed ? (
                            <Chip tone="success">Confirmada</Chip>
                          ) : (
                            <>
                              <Chip tone="warning">Pendente</Chip>
                              <button
                                type="button"
                                className="ov-confirm__contact-btn"
                                onClick={() => navigate('/comunicacao')}
                                title={`Entrar em contato com responsável de ${patientName}`}
                                aria-label={`Entrar em contato com responsável de ${patientName}`}
                              >
                                <Icon name="message-circle" size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {confirmations.unconfirmed && !optIn ? (
                  <p className="ov-confirm__note report-note--danger">
                    <Icon name="alert-triangle" size={13} />
                    Nenhuma família registrou consentimento para mensagens: a confirmação
                    automática não sai até o opt-in ser registrado no prontuário.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="ov-confirm__row">
                <div className="ov-confirm__pill">
                  <span className="ov-confirm__count">Nada agendado para os próximos 7 dias</span>
                </div>
                <Button size="sm" icon="plus" onClick={() => navigate('/agenda')}>Agendar</Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ——— Agenda: dia, semana, mês e lista (Ocupa Toda a Horizontal) ——— */}
      <AgendaPanel
        span={12}
        appointments={appointments}
        patients={patients}
        rooms={rooms}
        consents={consents}
        confirmations={confirmations}
        onChanged={onChanged}
      />

      <RescheduleDialog
        appointment={rescheduling}
        onClose={() => setRescheduling(null)}
        onDone={() => { setRescheduling(null); onChanged?.(); }}
      />
    </Bento>
  );
}

/* ═══════════════════════════ Home da recepção ═══════════════════════════ */

function ReceptionHome({ appointments, patients, canSchedule, onChanged }) {
  const navigate = useNavigate();
  const [rescheduling, setRescheduling] = useState(null);
  const today = isoDay();

  const todays = appointments
    .filter((a) => localDay(a.inicio) === today && a.status !== APPOINTMENT_STATUS.CANCELLED)
    .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''));

  const waiting = todays.filter((a) => a.status === APPOINTMENT_STATUS.CHECKED_IN);
  const unconfirmed = todays.filter((a) => a.status === APPOINTMENT_STATUS.SCHEDULED);
  const occupancy = todays.length ? Math.round((todays.length / 12) * 100) : 0;

  return (
    <Bento>
      <MetricStripCard>
        <Metric
          featured
          label="Consultas hoje"
          value={todays.length}
          target={unconfirmed.length
            ? `${unconfirmed.length} ainda sem confirmação`
            : todays.length ? 'Todas confirmadas' : 'Agenda livre'}
        />
        <Metric label="A confirmar" value={unconfirmed.length} tone={unconfirmed.length ? 'accent' : undefined} />
        <Metric label="Aguardando" value={waiting.length} />
        <Metric label="Cadastrados" value={patients.length} useCompact />
      </MetricStripCard>

      <Card span={8} variant="flush">
        <CardHeader
          title="Sala de espera"
          subtitle="Tempo decorrido desde o check-in"
          actions={<Button size="sm" icon="plus" onClick={() => navigate('/agenda')}>Novo agendamento</Button>}
        />
        <CardBody>
          {waiting.length ? (
            <ul className="waiting">
              {waiting.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.pacienteId);
                const minutes = appointment.checkInEm
                  ? Math.round((Date.now() - new Date(appointment.checkInEm).getTime()) / 60000)
                  : null;
                const tone = minutes == null ? 'neutral' : minutes > 30 ? 'danger' : minutes > 15 ? 'warning' : 'success';
                return (
                  <li key={appointment.id}>
                    <Avatar name={patient?.nome} src={patient?.foto} size={38} />
                    <span className="waiting__text">
                      <strong>{patient?.nome ?? '—'}</strong>
                      <span>{patient?.dataNascimento ? age(patient.dataNascimento).label : ''} · {time(appointment.inicio)}</span>
                    </span>
                    <span className={`waiting__clock waiting__clock--${tone} num`}>
                      {minutes != null ? duration(minutes) : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon="users"
              title="Sala de espera vazia"
              description="Quando alguém fizer check-in, o tempo de espera começa a contar aqui."
            />
          )}
        </CardBody>
      </Card>

      <Card span={4}>
        <CardHeader title="Andamento do dia" eyebrow="Agenda" />
        <CardBody className="center-content">
          {/* O medidor media "3/12 da capacidade" com um 12 que não vinha de
              lugar nenhum. Sem capacidade cadastrada, o único denominador
              verdadeiro é a própria agenda do dia. */}
          {todays.length ? (
            <Gauge
              value={todays.filter((a) => a.status === APPOINTMENT_STATUS.DONE).length}
              max={todays.length}
              label="atendimentos concluídos"
              formatValue={(v) => `${v}/${todays.length}`}
            />
          ) : (
            <EmptyState icon="calendar" title="Agenda livre hoje" compact />
          )}
        </CardBody>
      </Card>

      <Card span={12} className="bento-full">
        <CardHeader title="Confirmações pendentes" eyebrow="WhatsApp" />
        <CardBody>
          {unconfirmed.length ? (
            <ul className="confirm-list">
              {unconfirmed.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.pacienteId);
                return (
                  <li key={appointment.id}>
                    <StatusDot tone="warning" />
                    <span className="confirm-list__name">{patient?.nome ?? '—'}</span>
                    <span className="confirm-list__time num">{time(appointment.inicio)}</span>
                    {canSchedule && canReschedule(appointment)
                      ? <Button size="sm" variant="ghost" icon="calendar" onClick={() => setRescheduling(appointment)}>Remarcar</Button>
                      : null}
                    <Button size="sm" icon="whatsapp" onClick={() => navigate('/comunicacao')}>Confirmar</Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon="check"
              title="Todas as consultas de hoje estão confirmadas"
              compact
            />
          )}
        </CardBody>
      </Card>

      <RescheduleDialog
        appointment={rescheduling}
        onClose={() => setRescheduling(null)}
        onDone={() => { setRescheduling(null); onChanged?.(); }}
      />
    </Bento>
  );
}

/* ═══════════════════════════ Home do financeiro ═══════════════════════════ */

function FinanceHome({ entries }) {
  const navigate = useNavigate();
  const today = isoDay();

  const range = useMemo(() => periodRange('month'), []);

  const summary = useMemo(() => {
    // Fluxo nos últimos 30 dias; pendências são posição de hoje.
    const paid = entries.filter((e) => e.status === ENTRY_STATUS.PAID
      && inRange(localDay(e.pagamentoEm) ?? e.vencimento, range));
    const pending = entries.filter((e) => e.status === ENTRY_STATUS.PENDING);
    const sum = (list, type) => list
      .filter((e) => e.tipo === type)
      .reduce((total, e) => total + (Number(e.valor) || 0), 0);

    const overdue = pending.filter((e) => e.tipo === ENTRY_TYPES.REVENUE && e.vencimento && e.vencimento < today);

    return {
      revenue: sum(paid, ENTRY_TYPES.REVENUE),
      expense: sum(paid, ENTRY_TYPES.EXPENSE),
      receivable: sum(pending, ENTRY_TYPES.REVENUE),
      payable: sum(pending, ENTRY_TYPES.EXPENSE),
      overdue: overdue.length,
      overdueValue: overdue.reduce((t, e) => t + (Number(e.valor) || 0), 0),
    };
  }, [entries, today, range]);

  const hasData = entries.length > 0;

  return (
    <Bento>
      <MetricStripCard>
        <Metric
          featured
          mood={hasData && summary.revenue - summary.expense < 0 ? 'attention' : 'positive'}
          label="Resultado nos últimos 30 dias"
          value={hasData ? <MoneyValue value={summary.revenue - summary.expense} cents={false} /> : '—'}
          target={hasData
            ? `${money(summary.revenue)} recebido · ${money(summary.expense)} pago`
            : 'Nenhum lançamento registrado'}
        />
        <Metric label="A receber em aberto" value={hasData ? money(summary.receivable) : '—'} target="posição de hoje" />
        <Metric label="A pagar em aberto" value={hasData ? money(summary.payable) : '—'} target="posição de hoje" />
        <Metric
          label="Em atraso"
          value={hasData ? money(summary.overdueValue) : '—'}
          tone={summary.overdue ? 'danger' : undefined}
        />
      </MetricStripCard>

      <Card span={8}>
        <CardHeader title="Receitas × despesas" eyebrow="Pagas nos últimos 30 dias" onExpand={() => navigate('/financeiro')} />
        <CardBody>
          {hasData ? (
            <StackedRatioBar
              segments={[
                { label: 'Receitas', value: summary.revenue, tone: 'mid' },
                { label: 'Despesas', value: summary.expense, tone: 'soft' },
              ]}
              formatValue={money}
            />
          ) : (
            <EmptyState
              icon="wallet"
              title="Nenhum lançamento registrado"
              description="Cadastre receitas e despesas para acompanhar o fluxo de caixa da clínica."
              action={<Button size="sm" icon="plus" onClick={() => navigate('/financeiro')}>Novo lançamento</Button>}
            />
          )}
        </CardBody>
      </Card>

      <Card span={4}>
        <CardHeader title="Inadimplência" eyebrow="Atenção" />
        <CardBody>
          {summary.overdue ? (
            <>
              <Metric label="Títulos vencidos" value={<Link style={{ color: 'inherit' }} to="/financeiro?vencidos=true">{summary.overdue}</Link>} tone="danger" />
              <p className="muted small" style={{ marginTop: 'var(--s-3)' }}>
                {money(summary.overdueValue)} em aberto além do vencimento.
              </p>
            </>
          ) : (
            <EmptyState icon="check" title="Nada em atraso" compact />
          )}
        </CardBody>
      </Card>
    </Bento>
  );
}

/* ═══════════════════════════ Apoio ═══════════════════════════ */

function MetricStripCard({ children }) {
  // `bento-full` mantém as pílulas bento em 12 colunas no grid bento,
  // separadas individualmente com gap e cantos arredondados.
  return (
    <div className="bento-full bento-strip" style={{ gridColumn: 'span 12' }}>
      <MetricStrip variant="bento">{children}</MetricStrip>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <GreetingHeader />
      <Bento>
        <div className="bento-full bento-strip" style={{ gridColumn: 'span 12' }}>
          <div className="metric-strip metric-strip--bento">
            <Skeleton height={124} radius="var(--r-lg)" card />
            <Skeleton height={124} radius="var(--r-lg)" card />
            <Skeleton height={124} radius="var(--r-lg)" card />
            <Skeleton height={124} radius="var(--r-lg)" card />
          </div>
        </div>
        <div style={{ gridColumn: 'span 7' }}><Skeleton height={380} radius="var(--r-lg)" card /></div>
        <div style={{ gridColumn: 'span 5' }}><Skeleton height={380} radius="var(--r-lg)" card /></div>
      </Bento>
    </>
  );
}

/** As fatias da rosca do hero, na mesma ordem em todo período. */
// Cor pelo sentido (validada para daltonismo): concluído é positivo, a
// realizar é volume, sem desfecho pede atenção, falta é perda, cancelado sai.
const SITUATION_SLICES = [
  { key: 'done', label: 'Concluídos', color: '--mark-positive' },
  { key: 'upcoming', label: 'A realizar', color: '--mark-volume' },
  { key: 'open', label: 'Sem desfecho', color: '--mark-attention' },
  { key: 'noshow', label: 'Faltas', color: '--mark-serious' },
  { key: 'cancelled', label: 'Cancelados', color: '--mark-neutral' },
];

/** Fim do período de calendário que começa em `from` (a semana vai até sábado, o mês até o último dia). */
function periodEnd(period, from) {
  const d = new Date(`${from}T12:00:00`);
  if (period === 'week') d.setDate(d.getDate() + 6);
  else if (period === 'month') d.setMonth(d.getMonth() + 1, 0);
  else if (period === 'quarter') d.setMonth(d.getMonth() + 3, 0);
  else d.setMonth(12, 0);
  return isoDay(d);
}

/**
 * Atendimentos de cada período por situação. O período inteiro entra, não só
 * até hoje: o que ainda vai acontecer é "A realizar", e o que já passou sem
 * registro é "Sem desfecho" (a mesma regra da lista de pendências).
 */
function buildStatusPeriods(appointments, today) {
  const ref = new Date(`${today}T12:00:00`);
  const dm = (day) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  return PERIOD_OPTIONS.map(({ value, label }) => {
    const from = periodRange(value, ref).from;
    const to = periodEnd(value, from);
    const counts = { done: 0, upcoming: 0, open: 0, noshow: 0, cancelled: 0 };
    for (const a of appointments) {
      if (a.tipo === 'evento') continue;
      const day = localDay(a.inicio);
      if (!day || day < from || day > to) continue;
      if (a.status === APPOINTMENT_STATUS.DONE) counts.done += 1;
      else if (a.status === APPOINTMENT_STATUS.NO_SHOW) counts.noshow += 1;
      else if (a.status === APPOINTMENT_STATUS.CANCELLED) counts.cancelled += 1;
      else if (isUnresolved(a) || isLate(a)) counts.open += 1;
      else counts.upcoming += 1;
    }
    return {
      key: value,
      label,
      caption: `${dm(from)} a ${dm(to)}`,
      slices: SITUATION_SLICES.map((s) => ({ ...s, value: counts[s.key] })),
    };
  });
}

/** Atendimentos concluídos no período selecionado (semana, mês, trimestre ou ano), agregados no grão adequado. */
function buildProductionBars(appointments, period, today) {
  const ref = new Date(`${today}T12:00:00`);
  const from = periodRange(period, ref).from;
  const to = periodEnd(period, from);
  const range = { from, to };
  const todayKey = bucketKey(today, period);

  const rawBuckets = bucketsFor(range, period);
  const buckets = new Map(
    rawBuckets.map((b) => [
      b.key,
      {
        key: b.key,
        label: b.label,
        value: 0,
        current: b.key === todayKey,
        partial: b.partial,
        weekend: b.weekend,
      },
    ]),
  );

  for (const a of appointments) {
    if (a.tipo === 'evento') continue;
    if (a.status !== APPOINTMENT_STATUS.DONE) continue;
    const day = localDay(a.inicio);
    if (!day || day < from || day > to) continue;
    const key = bucketKey(day, period);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.value += 1;
    }
  }

  return Array.from(buckets.values());
}

