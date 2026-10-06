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
import { Card, CardHeader, CardBody, Metric, MetricStrip, EmptyState, Skeleton, MoneyValue } from '../../components/Card.jsx';
import { Button, Chip, StatusDot, Avatar, IconButton } from '../../components/primitives.jsx';
import { BarChart, Gauge, StackedRatioBar } from '../../charts/index.jsx';
import { localDay, periodRange, inRange } from '../../core/periods.js';
import { isLate, isUpcoming, isUnresolved, displayStatus, waitInfo, confirmationWindow, oldestByDay, namesList, trailingNoShows, CONSECUTIVE_NO_SHOW_ALERT, teleconsultsWithoutConsent, messagingOptIn } from '../../core/appointments.js';
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const where = plaza ? { praca: plaza } : {};
      const [appointments, patients, documents, entries, consents] = await Promise.all([
        repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
        repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
        repo.list(STORES.ENTRIES, { where }).catch(() => []),
        repo.list(STORES.CONSENTS, {}).catch(() => []),
      ]);
      if (!cancelled) setState({ loading: false, data: { appointments, patients, documents, entries, consents } });
    })();

    return () => { cancelled = true; };
  }, [plaza]);

  if (state.loading) return <OverviewSkeleton />;

  const props = { ...state.data, user, canFinance: can?.read?.('finance') };

  return (
    <>
      <GreetingHeader>
        <Button variant="primary" icon="plus" onClick={() => window.location.hash = '#/pacientes?novo=1'}>
          Novo paciente
        </Button>
      </GreetingHeader>

      {user?.role === ROLES.FINANCE ? <FinanceHome {...props} />
        : user?.role === ROLES.RECEPTION ? <ReceptionHome {...props} />
        : <DoctorHome {...props} />}
    </>
  );
}

/* ═══════════════════════════ Home do médico ═══════════════════════════ */

function DoctorHome({ appointments, patients, documents, entries = [], consents = [], canFinance }) {
  const navigate = useNavigate();
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
  // Próximos dias = a MESMA janela das confirmações: a soma da lista fecha com o card.
  const nextDays = confirmations.byDay;
  const shortDay = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  // Nenhuma família com opt-in: a mensagem de confirmação não sai, e a tela
  // que oferece a ação diz isso antes do clique.
  const optIn = messagingOptIn(consents);

  const weekBars = useMemo(() => buildWeekBars(appointments), [appointments]);

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

  return (
    <Bento>
      <MetricStripCard>
        {/* O número grande é o que pede ação agora. Consulta sem desfecho (o
            registro que falta de um horário passado) vem primeiro quando
            existe; sem ela, quem espera na recepção; sem ninguém, o dia. */}
        {needsRecord.length ? (
          <Metric
            featured
            label="Consultas sem desfecho"
            value={needsRecord.length}
            tone="danger"
            target={`${needsRecord.length > 1 ? 'A mais antiga de' : 'De'} ${new Date(needsRecord[0].inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time(needsRecord[0].inicio)} · registrar chegada, atendimento ou falta`}
          />
        ) : null}
        <Metric
          featured={!needsRecord.length && !waiting.length}
          label="Consultas hoje"
          value={todays.length}
          target={todays.length
            ? [done.length ? `${done.length} ${done.length === 1 ? 'concluída' : 'concluídas'}` : null,
              upcomingToday.length ? `${upcomingToday.length} por acontecer` : null,
              upcomingToday.length ? `primeira às ${time(upcomingToday[0].inicio)}` : null,
              cancelledToday ? `fora ${cancelledToday} ${cancelledToday === 1 ? 'cancelada' : 'canceladas'}` : null]
              .filter(Boolean).join(' · ') || `${todays.length} ${todays.length === 1 ? 'consulta' : 'consultas'}`
            : cancelledToday ? `Nenhuma consulta · ${cancelledToday} ${cancelledToday === 1 ? 'cancelada' : 'canceladas'}` : 'Nenhuma consulta agendada para hoje'}
        />
        <Metric
          featured={!needsRecord.length && waiting.length > 0}
          label="Na recepção"
          value={waiting.length}
          tone={waiting.length ? 'warning' : undefined}
          target={waiting.length
            ? `${nameOf(waiting[0].pacienteId).split(' ')[0]} espera há ${duration(waitMinutes(waiting[0]))}`
            : 'Ninguém esperando'}
        />
        {/* "Documentos pendentes" misturava o que falta EMITIR com o que falta
            ASSINAR. O número é o de laudos a emitir, com o mesmo nome de
            Pacientes e Documentos; a assinatura aparece como nota. */}
        {reportsToIssue.length || !pendingDocs.length ? (
          <Metric
            label="Laudos a emitir"
            value={reportsToIssue.length}
            tone={reportsToIssue.length ? 'warning' : undefined}
            target={[
              reportsToIssue.length
                ? `atendimentos de laudo concluídos, documento não emitido · mais antigo em ${new Date(`${oldestReports.day}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                : 'Nenhum laudo a emitir',
              canFinance && reportsPaid ? `${money(reportsPaid)} já recebidos` : null,
              pendingDocs.length ? `${pendingDocs.length} ${pendingDocs.length === 1 ? 'documento aguarda' : 'documentos aguardam'} assinatura` : null,
            ].filter(Boolean).join(' · ')}
          />
        ) : (
          <Metric
            label="A assinar"
            value={pendingDocs.length}
            tone="warning"
            target="documentos emitidos aguardando assinatura"
          />
        )}
        {canFinance ? (
          <Metric
            label="Recebido no mês"
            value={<MoneyValue value={receivedTotal} cents={false} />}
            target={receivedMonth.length
              ? `${receivedMonth.length} ${receivedMonth.length === 1 ? 'recebimento' : 'recebimentos'} até hoje`
              : 'Nenhum recebimento neste mês'}
          />
        ) : null}
        {needsRecord.length || canFinance ? null : (
          <Metric
            label="Em acompanhamento"
            value={activePatients.length}
            target={withoutReturn.length
              ? `${withoutReturn.length} sem retorno marcado`
              : 'Todos com retorno marcado'}
          />
        )}
      </MetricStripCard>

      {/* ——— Agenda do dia em timeline vertical ——— */}
      <Card span={7} rows={2} variant="flush">
        <CardHeader
          title="Sua agenda de hoje"
          subtitle={todays.length ? `${todays.length} atendimentos programados` : undefined}
          actions={<Button size="sm" onClick={() => navigate('/agenda')}>Abrir agenda</Button>}
        />
        <CardBody>
          {todays.length ? (
            <ol className="daylist">
              {todays.map((appointment) => {
                const patient = patients.find((p) => p.id === appointment.pacienteId);
                const isNow = appointment.status === APPOINTMENT_STATUS.IN_PROGRESS;
                return (
                  <li key={appointment.id} className={`daylist__item ${isNow ? 'is-now' : ''}`}>
                    <span className="daylist__time num">{time(appointment.inicio)}</span>
                    <span className="daylist__rail" aria-hidden="true" />
                    <button
                      type="button"
                      className="daylist__body"
                      onClick={() => patient && navigate(`/pacientes/${patient.id}`)}
                    >
                      <Avatar name={patient?.nome} src={patient?.foto} size={34} />
                      <span className="daylist__text">
                        <strong>{patient?.nome ?? 'Paciente não vinculado'}</strong>
                        <span>
                          {patient?.dataNascimento ? `${age(patient.dataNascimento).label} · ` : ''}
                          {APPOINTMENT_TYPE_LABELS[appointment.tipo] ?? 'Consulta'}
                        </span>
                      </span>
                      {(() => {
                        const shown = displayStatus(appointment, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_TONE);
                        return <Chip tone={shown.tone} icon={shown.icon}>{shown.label}</Chip>;
                      })()}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon="calendar"
              title="Nenhum atendimento hoje"
              description="Quando houver consultas agendadas para hoje, elas aparecem aqui em ordem de horário."
              action={<Button size="sm" icon="plus" onClick={() => navigate('/agenda')}>Agendar consulta</Button>}
            />
          )}
          {nextDays.length ? (
            <div className="card-subsection">
              <p className="flow-pair__label">Próximos 7 dias <span className="muted">· {shortDay(confirmations.range.from)} a {shortDay(confirmations.range.to)}</span></p>
              <ul className="next-days">
                {nextDays.map(([day, row]) => (
                  <li key={day}>
                    <span>{new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                    <strong className="num">
                      {row.total} {row.total === 1 ? 'consulta' : 'consultas'}
                      {row.unconfirmed ? <span className="muted"> · {row.unconfirmed} sem confirmação</span> : null}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* ——— Fila de pendências ——— */}
      <Card span={5}>
        <CardHeader title="Precisa de você" subtitle="Pendências do consultório, da mais urgente à rotina" />
        <CardBody>
          {(pendingDocs.length || checkedIn.length || reportsToIssue.length || late.length || unresolved.length || overdueTitles.length || payableSoonTitles.length || repeatedNoShows.length || tele.children.size) ? (
            <ul className="pending">
              {late.map((a) => (
                <li key={a.id}>
                  <span className="pending__icon pending__icon--danger"><Icon name="alert-triangle" size={15} /></span>
                  <span className="pending__text">
                    <strong>{nameOf(a.pacienteId)} não chegou</strong>
                    <span>Consulta das {time(a.inicio)} · {duration(Math.round((Date.now() - new Date(a.inicio)) / 60000))} de atraso · registrar chegada ou falta na agenda</span>
                  </span>
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
                    <strong>{overdueTitles.length} {overdueTitles.length === 1 ? 'título vencido' : 'títulos vencidos'} · {money(overdueTotal)}</strong>
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
        </CardBody>
      </Card>

      {/* ——— Confirmações dos próximos 7 dias ———
          A composição por tipo de 3 consultas não pedia ação nenhuma. O que a
          recepção faz com a próxima semana é confirmar: quantas faltam. */}
      <Card span={5}>
        <CardHeader
          title="Confirmações"
          subtitle={`Consultas de ${shortDay(confirmations.range.from)} a ${shortDay(confirmations.range.to)} (próximos 7 dias)`}
          actions={confirmations.unconfirmed
            ? (
              <Button size="sm" onClick={() => navigate('/comunicacao')}>
                {optIn ? 'Pedir confirmação' : 'Registrar consentimento'}
              </Button>
            )
            : null}
        />
        <CardBody>
          {confirmations.total ? (
            <>
              <p className="chart__summary">
                <strong className="num">{confirmations.confirmed}</strong>
                <span>de {confirmations.total} {confirmations.total === 1 ? 'consulta confirmada' : 'consultas confirmadas'}</span>
              </p>
              <StackedRatioBar
                segments={[
                  // Sem confirmação é âmbar como no aviso de confirmação de
                  // toda tela; dois cinzas vizinhos (1,4:1) não se distinguiam.
                  { label: 'Confirmadas', value: confirmations.confirmed, tone: 'mid' },
                  { label: 'Sem confirmação', value: confirmations.unconfirmed, tone: 'warning' },
                ]}
                formatValue={(v) => `${v}`}
                showPercent={false}
              />
              {confirmations.firstUnconfirmed ? (
                <p className="chart__note">
                  Primeira sem confirmação: {nameOf(confirmations.firstUnconfirmed.pacienteId)},{' '}
                  {new Date(confirmations.firstUnconfirmed.inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}{' '}
                  às {time(confirmations.firstUnconfirmed.inicio)}.
                </p>
              ) : null}
              {confirmations.unconfirmed && !optIn ? (
                <p className="chart__note report-note--danger">
                  <Icon name="alert-triangle" size={13} />
                  Nenhuma família registrou consentimento para mensagens: a confirmação
                  automática não sai até o opt-in ser registrado no prontuário.
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="calendar"
              title="Nada agendado para os próximos 7 dias"
              action={<Button size="sm" icon="plus" onClick={() => navigate('/agenda')}>Agendar</Button>}
              compact
            />
          )}
        </CardBody>
      </Card>

      {/* ——— Produção da semana ——— */}
      <Card span={12} className="bento-full">
        <CardHeader
          title="Produção assistencial"
          subtitle="Atendimentos concluídos nos últimos 14 dias"
          onExpand={() => navigate('/relatorios')}
        />
        <CardBody>
          <BarChart
            data={weekBars}
            height={200}
            title="Atendimentos concluídos por dia nos últimos 14 dias"
            valueLabel="Atendimentos concluídos"
            bucketNoun="dias"
            zeroLabel="sem atendimento concluído"
            summary={{
              value: weekBars.reduce((t, d) => t + d.value, 0),
              label: `concluídos em 14 dias · ${weekBars.filter((d) => d.value > 0).length} dias com atendimento`,
            }}
            emptyMessage="Assim que os primeiros atendimentos forem concluídos, a produção diária aparece aqui."
            emptyAction={<Button size="sm" icon="calendar" onClick={() => navigate('/agenda')}>Abrir agenda</Button>}
          />
        </CardBody>
      </Card>
    </Bento>
  );
}

/* ═══════════════════════════ Home da recepção ═══════════════════════════ */

function ReceptionHome({ appointments, patients }) {
  const navigate = useNavigate();
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
          label="Resultado nos últimos 30 dias"
          value={hasData ? money(summary.revenue - summary.expense) : '—'}
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
  // `bento-full` mantém a faixa em 12 colunas mesmo quando o breakpoint
  // colapsa os demais widgets para meia largura.
  return (
    <div className="bento-full bento-strip" style={{ gridColumn: 'span 12' }}>
      <MetricStrip>{children}</MetricStrip>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <GreetingHeader />
      <Bento>
        <div style={{ gridColumn: 'span 12' }}>
          <Skeleton height={96} radius="var(--r-lg)" card />
        </div>
        <div style={{ gridColumn: 'span 7' }}><Skeleton height={380} radius="var(--r-lg)" card /></div>
        <div style={{ gridColumn: 'span 5' }}><Skeleton height={380} radius="var(--r-lg)" card /></div>
      </Bento>
    </>
  );
}

/** Últimos 14 dias de atendimentos concluídos, por dia. */
function buildWeekBars(appointments) {
  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = isoDay(day);
    const count = appointments.filter(
      (a) => localDay(a.inicio) === key && a.status === APPOINTMENT_STATUS.DONE,
    ).length;
    days.push({
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: count,
      current: i === 0,
      weekend: [0, 6].includes(day.getDay()),
    });
  }
  return days.some((d) => d.value > 0) ? days : [];
}

