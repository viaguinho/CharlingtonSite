import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { localDay } from '../../core/periods.js';
import { isLate, isUnresolved, trailingNoShows, CONSECUTIVE_NO_SHOW_ALERT, teleconsultsWithoutConsent } from '../../core/appointments.js';
import * as repo from '../../data/repository.js';
import { STORES, PATIENT_STATUS, PATIENT_STATUS_LABELS } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, EmptyState, Metric, MetricStrip, Skeleton } from '../../components/Card.jsx';
import { DataTable, TableToolbar } from '../../components/DataTable.jsx';
import { Button, IconButton, Chip, Avatar, StatusDot } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { TextField } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { PatientForm } from './PatientForm.jsx';
import { age, date, phone as formatPhone, relative, time } from '../../core/format.js';

/**
 * Lista de pacientes.
 *
 * Duas apresentações do mesmo dado: tabela densa (padrão, para quem procura
 * alguém específico) e cards (para quem está varrendo a carteira). A busca é
 * instantânea e local — digitar o nome de uma criança nunca vai para a URL.
 */
export default function PatientsScreen() {
  const navigate = useNavigate();
  const { plaza, can } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patients, setPatients] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [consents, setConsents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('table');
  const [formOpen, setFormOpen] = useState(searchParams.get('novo') === '1');

  async function load() {
    setLoading(true);
    const where = plaza ? { praca: plaza } : {};
    const [p, g, a, c, d] = await Promise.all([
      repo.list(STORES.PATIENTS, { where }).catch(() => []),
      repo.list(STORES.GUARDIANS, { where }).catch(() => []),
      repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
      repo.list(STORES.CONSENTS, {}).catch(() => []),
      repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
    ]);
    setPatients(p);
    setGuardians(g);
    setAppointments(a);
    setConsents(c);
    setDocuments(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, [plaza]);

  // Laudos a emitir por criança: atendimento de laudo concluído sem documento
  // vinculado — a mesma regra de Documentos e da Visão geral.
  const reportsPending = useMemo(() => {
    const issued = new Set(documents.map((doc) => doc.atendimentoId).filter(Boolean));
    const map = new Map();
    for (const a of appointments) {
      if (a.tipo !== 'laudo' || a.status !== 'concluido' || issued.has(a.id)) continue;
      map.set(a.pacienteId, (map.get(a.pacienteId) ?? 0) + 1);
    }
    return map;
  }, [appointments, documents]);

  // Teleconsulta (feita ou marcada) sem consentimento vigente da família.
  const teleMissing = useMemo(() => teleconsultsWithoutConsent(appointments, consents).children, [appointments, consents]);

  // Em acompanhamento e sem nada marcado de hoje em diante: é quem some da
  // agenda sem ninguém perceber. A mesma regra da Visão geral.
  const withoutReturn = useMemo(() => {
    const today = localDay(new Date().toISOString());
    const upcoming = new Set(appointments
      .filter((a) => localDay(a.inicio) >= today && ['agendado', 'confirmado', 'aguardando', 'em_atendimento'].includes(a.status))
      .map((a) => a.pacienteId));
    return new Set(patients.filter((p) => p.status === PATIENT_STATUS.ACTIVE && !upcoming.has(p.id)).map((p) => p.id));
  }, [patients, appointments]);

  // Quem precisa de atenção, sobre TODOS os pacientes (não só a busca atual).
  const attention = useMemo(() => patients
    .filter((p) => p.status === PATIENT_STATUS.ACTIVE)
    .map((p) => {
      const mine = appointments.filter((a) => a.pacienteId === p.id);
      return {
        patient: p, noShowRun: trailingNoShows(mine).length, unresolved: mine.some((a) => isUnresolved(a)),
        noConsent: teleMissing.has(p.id),
      };
    })
    .filter((x) => x.noShowRun >= CONSECUTIVE_NO_SHOW_ALERT || x.unresolved || x.noConsent), [patients, appointments, teleMissing]);
  const attentionIds = useMemo(() => new Set(attention.map((x) => x.patient.id)), [attention]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients
      .filter((p) => status === 'all'
        || (status === 'atencao' ? attentionIds.has(p.id)
          : status === 'sem_retorno' ? withoutReturn.has(p.id)
          : p.status === status))
      .filter((p) => {
        if (!q) return true;
        const pGuardians = guardians.filter((g) => p.responsaveis?.includes(g.id));
        const gSearch = pGuardians.map((g) => `${g.nome ?? ''} ${g.telefone ?? ''}`).join(' ');
        return `${p.nome ?? ''} ${p.nomeSocial ?? ''} ${p.cpf ?? ''} ${p.cns ?? ''} ${gSearch}`
          .toLowerCase().includes(q);
      })
      .map((p) => {
        const pGuardians = guardians.filter((g) => p.responsaveis?.includes(g.id));
        const guardian = pGuardians[0];
        const extraGuardiansCount = Math.max(0, pGuardians.length - 1);
        const mine = appointments.filter((a) => a.pacienteId === p.id);
        // Última consulta é a que ACONTECEU (concluída). Um horário das 10h
        // ainda não atendido não é "consulta há 13 minutos".
        const past = mine.filter((a) => a.status === 'concluido').sort((a, b) => b.inicio.localeCompare(a.inicio));
        // Próxima: tudo que ainda não aconteceu a partir de HOJE, inclusive o
        // horário das 10h que já passou mas segue confirmado — ele ainda está
        // pendente, e pular para o dia 21 escondia isso.
        const today = localDay(new Date().toISOString());
        const next = mine
          .filter((a) => localDay(a.inicio) >= today && ['agendado', 'confirmado', 'aguardando', 'em_atendimento'].includes(a.status))
          .sort((a, b) => a.inicio.localeCompare(b.inicio));
        // Quem já chegou ou está em atendimento não tem "próxima": está aqui.
        const present = next.find((a) => ['aguardando', 'em_atendimento'].includes(a.status) && !isUnresolved(a));
        const upcoming = next.filter((a) => !isLate(a) && !isUnresolved(a) && !['aguardando', 'em_atendimento'].includes(a.status));
        const late = next.find((a) => isLate(a));
        // Consulta passada sem desfecho mais recente: aparece no lugar da última
        // consulta, porque a última que aconteceu pode não ser a última marcada.
        const unresolved = mine.filter((a) => isUnresolved(a)).sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
        return {
          ...p, guardian, extraGuardiansCount, lastVisit: past[0]?.inicio ?? null, nextVisit: upcoming[0]?.inicio ?? null,
          lateToday: late?.inicio ?? null, presentToday: present ?? null, unresolved: unresolved ?? null,
          noShowRun: trailingNoShows(mine).length,
          noConsent: teleMissing.has(p.id),
          reportsToIssue: reportsPending.get(p.id) ?? 0,
        };
      })
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
  }, [patients, guardians, appointments, query, status, withoutReturn, teleMissing, reportsPending]);

  const columns = [
    {
      key: 'nome',
      label: 'Paciente',
      sortable: true,
      render: (row) => (
        <span className="table__primary">
          <Avatar name={row.nome} src={row.foto} size={34} />
          <span className="table__primary-text">
            <strong>{row.nomeSocial || row.nome}</strong>
            <span>{row.dataNascimento ? age(row.dataNascimento).label : 'Idade não informada'}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'guardian',
      label: 'Responsável',
      hideBelow: 900,
      sortValue: (row) => row.guardian?.nome,
      render: (row) => row.guardian ? (
        <span className="table__primary-text">
          <strong style={{ fontWeight: 'var(--w-regular)' }}>
            {row.guardian.nome}
            {row.extraGuardiansCount > 0 ? (
              <span className="muted" style={{ marginLeft: 6, fontSize: '0.85em' }}>
                (+{row.extraGuardiansCount})
              </span>
            ) : null}
          </strong>
          <span>{row.guardian.telefone ? formatPhone(row.guardian.telefone) : row.guardian.parentesco}</span>
        </span>
      ) : <span className="muted">Não vinculado</span>,
    },
    {
      key: 'lastVisit',
      label: 'Última realizada',
      hideBelow: 1200,
      sortable: true,
      // Só o que aconteceu. Consulta sem desfecho não é "realizada": ela vai
      // para a coluna Situação.
      render: (row) => (row.lastVisit
        ? <span title={date(row.lastVisit)}>{date(row.lastVisit).slice(0, 5)} · {relative(row.lastVisit)}</span>
        : <span className="muted">—</span>),
    },
    {
      key: 'nextVisit',
      label: 'Próxima',
      hideBelow: 1200,
      sortable: true,
      render: (row) => (row.presentToday
        ? <StatusDot
          tone="warning"
          label={row.presentToday.status === 'em_atendimento'
            ? `Hoje ${time(row.presentToday.inicio)} · em atendimento`
            : `Hoje ${time(row.presentToday.inicio)} · na recepção`} />
        : row.lateToday
        ? <StatusDot tone="danger" label={`Hoje ${time(row.lateToday)} · atrasado`} />
        : row.nextVisit
          ? <span>{date(row.nextVisit)}</span>
          : <span className="muted">—</span>),
    },
    {
      key: 'status',
      label: 'Situação',
      width: 240,
      // Em acompanhamento é o normal: texto simples. Doze pontos verdes iguais
      // não distinguiam nada; o ponto fica para o que foge do normal.
      render: (row) => (situationChip(row) ?? (row.status === PATIENT_STATUS.ACTIVE
        ? <span className="nowrap">{PATIENT_STATUS_LABELS[row.status]}</span>
        : <StatusDot tone="neutral" label={PATIENT_STATUS_LABELS[row.status]} />)),
    },
    {
      key: 'actions',
      label: '',
      width: 48,
      align: 'right',
      render: () => <Icon name="chevron-right" size={15} className="muted" />,
    },
  ];

  const counts = {
    atencao: attention.length,
    sem_retorno: withoutReturn.size,
    all: patients.length,
    [PATIENT_STATUS.ACTIVE]: patients.filter((p) => p.status === PATIENT_STATUS.ACTIVE).length,
    [PATIENT_STATUS.DISCHARGED]: patients.filter((p) => p.status === PATIENT_STATUS.DISCHARGED).length,
    [PATIENT_STATUS.INACTIVE]: patients.filter((p) => p.status === PATIENT_STATUS.INACTIVE).length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Cadastro clínico"
        title="Pacientes"
        description="Cada criança, seus responsáveis, o histórico e o que foi combinado com a escola — em um lugar só."
        toolbar={
          <Tabs
            variant="segment"
            value={view}
            onChange={setView}
            ariaLabel="Modo de visualização"
            items={[
              { value: 'table', label: 'Lista', icon: 'list' },
              { value: 'cards', label: 'Cards', icon: 'grid' },
            ]}
          />
        }
        actions={
          can.write('patients.list') ? (
            <Button variant="primary" icon="user-plus" onClick={() => setFormOpen(true)}>
              Novo paciente
            </Button>
          ) : null
        }
      />

      {/* O número que responde à tela: quantas crianças pedem uma ação. Enquanto
          os dados não chegam, esqueleto — nunca "0" nem "nenhuma falta". */}
      {loading ? <Skeleton height={168} radius="var(--r-lg)" card /> : (
      <MetricStrip>
        <Metric
          featured
          label="Precisam de atenção"
          value={attention.length}
          action={attention.length
            ? <Button size="sm" onClick={() => setStatus('atencao')}>Ver quem</Button>
            : null}
          tone={attention.length ? 'danger' : undefined}
          target={attention.length
            ? [
              [attention.filter((x) => x.noShowRun >= CONSECUTIVE_NO_SHOW_ALERT).length, 'com faltas seguidas'],
              [attention.filter((x) => x.unresolved).length, 'com consulta sem desfecho'],
              [attention.filter((x) => x.noConsent).length, 'com teleconsulta sem consentimento'],
            ].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ')
              // A soma das parcelas passa do total quando a mesma criança tem
              // duas situações: dizer isso evita a desconfiança de erro.
              + (() => {
                const parts = attention.filter((x) => x.noShowRun >= CONSECUTIVE_NO_SHOW_ALERT).length
                  + attention.filter((x) => x.unresolved).length
                  + attention.filter((x) => x.noConsent).length;
                const overlap = parts - attention.length;
                return overlap > 0 ? ` · ${overlap} ${overlap === 1 ? 'criança soma duas situações' : 'crianças somam duas situações'}` : '';
              })()
            : 'Nenhuma falta seguida nem consulta sem desfecho'}
        />
        <Metric
          label="Em acompanhamento"
          value={counts[PATIENT_STATUS.ACTIVE]}
          target={`de ${patients.length} ${patients.length === 1 ? 'cadastrado' : 'cadastrados'}`}
        />
        <Metric
          label="Laudos a emitir"
          value={[...reportsPending.values()].reduce((t, n) => t + n, 0)}
          tone={reportsPending.size ? 'warning' : undefined}
          target={reportsPending.size ? `para ${reportsPending.size} ${reportsPending.size === 1 ? 'criança' : 'crianças'}` : 'Nenhum laudo esperando'}
        />
        <Metric
          label="Sem retorno marcado"
          value={withoutReturn.size}
          tone={withoutReturn.size ? 'warning' : undefined}
          target={withoutReturn.size ? 'em acompanhamento e sem consulta futura' : 'Todos com retorno'}
        />
      </MetricStrip>
      )}
      <div style={{ height: 'var(--gutter)' }} />

      {!loading && withoutReturn.size ? (
        <>
          <div className="ops-alert" role="status">
            <Icon name="calendar" size={15} />
            <p>
              <strong>
                {withoutReturn.size === 1 ? '1 criança em acompanhamento está' : `${withoutReturn.size} crianças em acompanhamento estão`} sem retorno marcado.
              </strong>{' '}
              {patients.filter((p) => withoutReturn.has(p.id)).map((p) => p.nome).slice(0, 3).join(', ')}
              {withoutReturn.size > 3 ? ` e mais ${withoutReturn.size - 3}` : ''}.
            </p>
            <Button size="sm" onClick={() => setStatus('sem_retorno')}>Ver quem</Button>
          </div>
          <div style={{ height: 'var(--gutter)' }} />
        </>
      ) : null}

      <Card variant="flush">
        <TableToolbar>
          <TextField
            icon="search"
            placeholder="Buscar por nome, CPF, CNS ou responsável…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar paciente"
            className="patients__search"
          />
          <Tabs
            variant="underline"
            value={status}
            onChange={setStatus}
            ariaLabel="Filtrar por situação"
            items={[
              { value: 'all', label: 'Todos', count: loading ? undefined : counts.all ?? 0 },
              // O KPI mais urgente precisa de um filtro: sem ele, achar as 11
              // crianças exigia varrer as 42 linhas.
              { value: 'atencao', label: 'Precisam de atenção', count: loading ? undefined : counts.atencao },
              { value: PATIENT_STATUS.ACTIVE, label: 'Em acompanhamento', count: loading ? undefined : counts[PATIENT_STATUS.ACTIVE] ?? 0 },
              { value: PATIENT_STATUS.DISCHARGED, label: 'Alta', count: loading ? undefined : counts[PATIENT_STATUS.DISCHARGED] ?? 0 },
              { value: PATIENT_STATUS.INACTIVE, label: 'Inativos', count: loading ? undefined : counts[PATIENT_STATUS.INACTIVE] ?? 0 },
              { value: 'sem_retorno', label: 'Sem retorno marcado', count: loading ? undefined : counts.sem_retorno },
            ]}
          />
        </TableToolbar>

        {view === 'table' ? (
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            caption="Lista de pacientes"
            onRowClick={(row) => navigate(`/pacientes/${row.id}`)}
            emptyState={
              // Três vazios diferentes: busca sem resultado, aba filtrada sem
              // ninguém e sistema sem paciente. Só o último diz "começa vazio".
              <EmptyState
                icon={query ? 'search' : patients.length ? 'filter' : 'users'}
                title={query ? 'Nenhum paciente encontrado' : patients.length ? 'Nenhum paciente nesta aba' : 'Nenhum paciente cadastrado ainda'}
                description={query
                  ? `Nada corresponde a “${query}”. Verifique a grafia ou limpe o filtro.`
                  : patients.length
                    ? `Há ${patients.length} ${patients.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'}; nenhum se encaixa neste filtro.`
                    : 'O sistema começa vazio. Cadastre a primeira criança para abrir o prontuário, agendar consultas e emitir documentos.'}
                action={query || patients.length
                  ? <Button size="sm" onClick={() => { setQuery(''); setStatus('all'); }}>Ver todos</Button>
                  : can.write('patients.list')
                    ? <Button size="sm" variant="primary" icon="user-plus" onClick={() => setFormOpen(true)}>Cadastrar paciente</Button>
                    : null}
              />
            }
          />
        ) : (
          <PatientCardGrid rows={rows} loading={loading} onOpen={(row) => navigate(`/pacientes/${row.id}`)} />
        )}
      </Card>

      <PatientForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          if (searchParams.get('novo')) setSearchParams({});
        }}
        onSaved={(saved) => {
          setFormOpen(false);
          load();
          navigate(`/pacientes/${saved.id}`);
        }}
      />
    </>
  );
}

/**
 * Grade de cards — a gramática da REF 4 aplicada a paciente: avatar, nome,
 * subtítulo, atalho de abertura e rodapé com a próxima consulta e as ações
 * de contato.
 */
function PatientCardGrid({ rows, loading, onOpen }) {
  if (loading) {
    return (
      <div className="patient-grid">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="patient-card patient-card--skeleton skeleton" />)}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon="users"
        title="Nenhum paciente para exibir"
        description="Ajuste os filtros ou cadastre o primeiro paciente."
      />
    );
  }

  return (
    <div className="patient-grid">
      {rows.map((row) => (
        <article key={row.id} className="patient-card">
          <header className="patient-card__head">
            <Avatar name={row.nome} src={row.foto} size={40} />
            <div className="patient-card__id">
              <strong>{row.nomeSocial || row.nome}</strong>
              <span>{row.dataNascimento ? age(row.dataNascimento).label : '—'}</span>
            </div>
            <IconButton name="arrow-up-right" label={`Abrir prontuário de ${row.nome}`} shape="circle" onClick={() => onOpen(row)} />
          </header>

          <div className="patient-card__body">
            {row.guardian ? (
              <p className="patient-card__line">
                <Icon name="users" size={13} />
                {row.guardian.nome} <span className="muted">· {row.guardian.parentesco || 'responsável'}</span>
              </p>
            ) : null}
            {/* Mesmos dados da Lista: última realizada também aqui. */}
            <p className={`patient-card__line ${row.lastVisit ? '' : 'muted'}`}>
              <Icon name="history" size={13} />
              {row.lastVisit ? `Última realizada em ${date(row.lastVisit)}` : 'Nenhuma consulta realizada'}
            </p>
            {row.nextVisit ? (
              <p className="patient-card__line">
                <Icon name="calendar" size={13} />
                Próxima consulta em {date(row.nextVisit)}
              </p>
            ) : (
              <p className="patient-card__line muted">
                <Icon name="calendar" size={13} />
                Sem retorno agendado
              </p>
            )}
            {row.clinico?.diagnosticos?.length ? (
              <div className="patient-card__tags">
                {row.clinico.diagnosticos.slice(0, 2).map((d) => (
                  <Chip key={d.codigo ?? d} tone="info">{d.codigo ?? d}</Chip>
                ))}
              </div>
            ) : null}
          </div>

          <footer className="patient-card__foot">
            {/* Mesma situação da vista Lista: falta seguida e consulta sem
                desfecho aparecem aqui também, com a mesma cor. */}
            {situationChip(row) ?? (row.status === PATIENT_STATUS.ACTIVE ? (
              <span className="nowrap">{PATIENT_STATUS_LABELS[row.status]}</span>
            ) : (
              <StatusDot tone="neutral" label={PATIENT_STATUS_LABELS[row.status]} />
            ))}
            <span className="spacer" />
            <IconButton name="whatsapp" label="Mensagem" shape="circle" variant="surface" />
            <IconButton name="file-text" label="Documentos" shape="circle" variant="solid" onClick={() => onOpen(row)} />
          </footer>
        </article>
      ))}
    </div>
  );
}

/**
 * Situação que pede ação — o mesmo chip da Agenda (cor, ícone e texto), na
 * Lista e nos Cards. `null` quando não há nada fora do normal.
 */
function situationChip(row) {
  // TODAS as pendências da criança, da mais grave à rotina. Mostrar só a
  // primeira escondia os laudos de quem tinha também uma consulta sem desfecho.
  const chips = [
    row.noShowRun >= CONSECUTIVE_NO_SHOW_ALERT
      ? <Chip key="faltas" tone="danger">Faltou às {row.noShowRun} últimas</Chip> : null,
    row.unresolved
      ? <Chip key="desfecho" tone="danger" icon="history">Sem desfecho · {date(row.unresolved.inicio).slice(0, 5)}</Chip> : null,
    row.noConsent
      ? <Chip key="consent" tone="warning" icon="video">Teleconsulta sem consentimento</Chip> : null,
    row.reportsToIssue
      ? <Chip key="laudos" tone="warning" icon="file-text">{row.reportsToIssue} {row.reportsToIssue === 1 ? 'laudo a emitir' : 'laudos a emitir'}</Chip> : null,
  ].filter(Boolean);
  return chips.length ? <span className="situation-chips">{chips}</span> : null;
}
