import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { localDay } from '../../core/periods.js';
import { isLate, isUnresolved, isUpcoming, hasActiveConsent } from '../../core/appointments.js';
import * as repo from '../../data/repository.js';
import { STORES, PATIENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS, CONSENT_PURPOSES } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { Breadcrumb } from '../../components/Shell.jsx';
import { Sheet } from '../../components/Overlay.jsx';
import { Skeleton, MiniMetricCard } from '../../components/Card.jsx';
import { Button, Chip, Avatar, StatusDot } from '../../components/primitives.jsx';
import { IndexList } from '../../components/Tabs.jsx';
import Icon from '../../components/Icon.jsx';
import { age, date, dateTime, time, relative, phone as formatPhone } from '../../core/format.js';
import { PatientForm } from './PatientForm.jsx';
import { TimelineView } from './views/TimelineView.jsx';
import { NotesView } from './views/NotesView.jsx';
import { ScalesView } from './views/ScalesView.jsx';
import { MilestonesView } from './views/MilestonesView.jsx';
import { MedicationsView } from './views/MedicationsView.jsx';
import { AttachmentsView } from './views/AttachmentsView.jsx';
import { DocumentsView } from './views/DocumentsView.jsx';
import { ConsentsView } from './views/ConsentsView.jsx';
import { ClinicalDocumentModal } from '../documents/ClinicalDocumentModal.jsx';

/**
 * Prontuário eletrônico — três colunas.
 *
 *   280px navegação do paciente · 1fr conteúdo · 320px painel de contexto
 *
 * O painel da direita é a ficha de bolso do médico: foto, idade, diagnósticos
 * ativos, alergias em vermelho, medicações em uso e o perfil sensorial. Ele
 * não rola junto com o conteúdo — durante a consulta, essa informação precisa
 * estar sempre à vista.
 */

const SECTIONS = [
  { value: 'linha-do-tempo', label: 'Linha do tempo' },
  { value: 'evolucoes', label: 'Evoluções clínicas' },
  { value: 'escalas', label: 'Escalas e instrumentos' },
  { value: 'marcos', label: 'Marcos do desenvolvimento' },
  { value: 'medicacoes', label: 'Medicações' },
  { value: 'anexos', label: 'Exames e anexos' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'consentimentos', label: 'Consentimentos' },
];

export default function PatientRecordScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();

  const [section, setSection] = useState('linha-do-tempo');
  const [loading, setLoading] = useState(true);   // só a carga inicial mostra esqueleto
  const [editing, setEditing] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [resumoAberto, setResumoAberto] = useState(false);
  const [record, setRecord] = useState({
    patient: null, guardians: [], appointments: [], notes: [],
    scales: [], milestones: [], medications: [], attachments: [],
    documents: [], consents: [],
  });

  const load = useCallback(async () => {
    try {
      const patient = await repo.get(STORES.PATIENTS, id);
      if (!patient) { navigate('/pacientes'); return; }

      const byPatient = { where: { pacienteId: id } };
      const [guardians, appointments, notes, scales, milestones, medications, attachments, documents, consents] =
        await Promise.all([
          repo.list(STORES.GUARDIANS).catch(() => []),
          repo.list(STORES.APPOINTMENTS, byPatient).catch(() => []),
          repo.list(STORES.NOTES, byPatient).catch(() => []),
          repo.list(STORES.SCALES, byPatient).catch(() => []),
          repo.list(STORES.MILESTONES, byPatient).catch(() => []),
          repo.list(STORES.MEDICATIONS, byPatient).catch(() => []),
          repo.list(STORES.ATTACHMENTS, byPatient).catch(() => []),
          repo.list(STORES.DOCUMENTS, byPatient).catch(() => []),
          repo.list(STORES.CONSENTS, byPatient).catch(() => []),
        ]);

      setRecord({
        patient,
        guardians: guardians.filter((g) => patient.responsaveis?.includes(g.id)),
        appointments, notes, scales, milestones, medications, attachments, documents, consents,
      });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <RecordSkeleton />;

  const { patient } = record;
  if (!patient) return null;

  const counts = {
    'linha-do-tempo': null,
    evolucoes: record.notes.length || null,
    escalas: record.scales.length || null,
    marcos: record.milestones.length || null,
    medicacoes: record.medications.filter((m) => !m.suspensaEm).length || null,
    anexos: record.attachments.length || null,
    // Pendência vem antes do total: "9 a emitir" é o que precisa de ação.
    documentos: (() => {
      const issued = new Set(record.documents.map((d) => d.atendimentoId).filter(Boolean));
      const pending = record.appointments.filter((a) => a.tipo === 'laudo' && a.status === 'concluido' && !issued.has(a.id)).length;
      return pending ? { value: pending, tone: 'warning', hint: `${pending} a emitir` } : record.documents.length || null;
    })(),
    consentimentos: (() => {
      // Só conta o que DEPENDE de consentimento: o registro de "tratamento
      // clínico" é informação ao responsável (base legal própria) e dizia
      // "1 vigente" numa criança sem nenhum consentimento concedido.
      const active = record.consents.filter((c) => !c.revogadoEm
        && c.finalidade !== CONSENT_PURPOSES.CLINICAL).length;
      return active ? { value: active, tone: 'neutral', hint: `${active} vigente${active > 1 ? 's' : ''}` } : null;
    })(),
  };

  const viewProps = { ...record, appointments: record.appointments, reload: load, onIssueDocument: setDocModal, onGoToSection: setSection };

  return (
    <>
      <Breadcrumb items={[
        { label: 'Pacientes', to: '/pacientes' },
        { label: patient.nomeSocial || patient.nome },
      ]} />

      <PatientHeader
        patient={patient}
        guardians={record.guardians}
        appointments={record.appointments}
        consents={record.consents}
        onEdit={() => setEditing(true)}
        onIssue={() => setDocModal({ patient })}
        onOpenResumo={() => setResumoAberto(true)}
        canIssue={can.write('documents.issue')}
      />

      <div className="record">
        <nav className="record__nav" aria-label="Seções do prontuário">
          <IndexList
            items={SECTIONS.map((s) => ({ ...s, count: counts[s.value] }))}
            value={section}
            onChange={setSection}
          />
        </nav>

        <div className="record__content" key={section}>
          {section === 'linha-do-tempo' ? <TimelineView {...viewProps} /> : null}
          {section === 'evolucoes' ? <NotesView {...viewProps} /> : null}
          {section === 'escalas' ? <ScalesView {...viewProps} /> : null}
          {section === 'marcos' ? <MilestonesView {...viewProps} /> : null}
          {section === 'medicacoes' ? <MedicationsView {...viewProps} /> : null}
          {section === 'anexos' ? <AttachmentsView {...viewProps} /> : null}
          {section === 'documentos' ? <DocumentsView {...viewProps} /> : null}
          {section === 'consentimentos' ? <ConsentsView {...viewProps} /> : null}
        </div>

        <ContextPanel {...record} />
      </div>

      <Sheet
        open={resumoAberto}
        onClose={() => setResumoAberto(false)}
        width={360}
        title="Resumo do paciente"
        description="O mesmo painel de contexto da coluna lateral, para telas estreitas."
      >
        <ContextPanel {...record} embutido />
      </Sheet>

      <PatientForm
        open={editing}
        patient={patient}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }}
      />

      <ClinicalDocumentModal
        open={!!docModal}
        patient={patient}
        guardians={record.guardians}
        initialType={docModal?.tipo}
        appointment={docModal?.atendimentoId ? record.appointments.find((a) => a.id === docModal.atendimentoId) : undefined}
        onClose={() => setDocModal(null)}
        onIssued={() => { setDocModal(null); load(); }}
      />
    </>
  );
}

/* ═══════════════════════ Cabeçalho do paciente ═══════════════════════
   A gramática da REF 3: avatar, nome grande, linha de diagnóstico, tempo de
   acompanhamento e um par de ações — secundária contornada, primária escura. */

function PatientHeader({ patient, guardians, appointments, consents = [], onEdit, onIssue, onOpenResumo, canIssue }) {
  const navigate = useNavigate();
  const ageInfo = patient.dataNascimento ? age(patient.dataNascimento) : null;
  const guardian = guardians[0];

  const followUp = useMemo(() => {
    // A data exata, e o tempo na mesma escala da linha do tempo abaixo — o
    // cabeçalho dizia "há 1 mês" sobre um primeiro registro de 8 semanas atrás.
    const first = [...appointments]
      .filter((a) => a.status === 'concluido')
      .sort((a, b) => (a.inicio ?? '').localeCompare(b.inicio ?? ''))[0];
    if (!first) return null;
    return `em acompanhamento desde ${date(first.inicio)} (${relative(first.inicio)})`;
  }, [appointments]);

  // Mesma regra da lista de pacientes: o que ainda não aconteceu, de hoje em
  // diante — inclusive um horário de hoje já passado mas ainda pendente.
  const todayKey = localDay(new Date().toISOString());
  const open = appointments
    .filter((a) => localDay(a.inicio) >= todayKey && ['agendado', 'confirmado', 'aguardando', 'em_atendimento'].includes(a.status))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  // Quem está na recepção ou atrasado HOJE não tem "próxima consulta": tem uma
  // consulta acontecendo agora. O cabeçalho diz o estado, não só a data.
  const present = open.find((a) => ['aguardando', 'em_atendimento'].includes(a.status) && !isUnresolved(a));
  const late = open.find((a) => isLate(a));
  const next = open.find((a) => a !== present && !isLate(a) && !isUnresolved(a));
  // Horário passado sem desfecho (de hoje ou de outro dia): o mais recente.
  const unresolved = appointments.filter((a) => isUnresolved(a)).sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
  // Teleconsulta sem consentimento vigente: as já feitas e a próxima marcada.
  const teleConsent = hasActiveConsent(consents, 'teleconsulta', patient.id);
  const teleDone = teleConsent ? [] : appointments.filter((a) => a.tipo === 'teleconsulta' && a.status === 'concluido');
  const teleNext = teleConsent ? null : appointments.filter((a) => a.tipo === 'teleconsulta' && isUpcoming(a)).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const presentLabel = present
    ? present.status === 'em_atendimento'
      ? `Em atendimento · consulta das ${time(present.inicio)}`
      : `Na recepção desde ${time(present.checkInEm)} · consulta das ${time(present.inicio)}`
    : null;

  return (
    <header className="patient-header">
      <Avatar name={patient.nome} src={patient.foto} size={64} />

      <div className="patient-header__id">
        <h1>{patient.nomeSocial || patient.nome}</h1>
        {patient.nomeSocial ? <p className="patient-header__legal">Nome de registro: {patient.nome}</p> : null}
        <p className="patient-header__meta">
          {ageInfo ? <span>{ageInfo.label}</span> : null}
          {patient.dataNascimento ? <span>{date(patient.dataNascimento)}</span> : null}
          {followUp ? <span>{followUp}</span> : null}
        </p>
        <div className="patient-header__tags">
          {patient.status === 'ativo'
            ? <span className="patient-header__status">{PATIENT_STATUS_LABELS[patient.status]}</span>
            : <StatusDot tone="neutral" label={PATIENT_STATUS_LABELS[patient.status]} />}
          {patient.clinico?.diagnosticos?.slice(0, 3).map((d) => (
            <Chip key={d.codigo ?? d} tone="code">{d.codigo ? `${d.codigo} · ${d.descricao ?? ''}`.trim() : d}</Chip>
          ))}
        </div>

        {/* Alergia vive no cabeçalho, não só no painel lateral. O painel some
            abaixo de 1320px — largura de notebook comum — e uma alergia que
            desaparece conforme a janela encolhe é risco de paciente, não
            detalhe de layout. */}
        {patient.clinico?.alergias?.length ? (
          <div className="patient-header__allergies" role="status">
            <Icon name="alert-triangle" size={14} />
            <span className="patient-header__allergies-label">Alergias</span>
            <span className="patient-header__allergy-list">{patient.clinico.alergias.join(' · ')}</span>
          </div>
        ) : null}
      </div>

      <div className="patient-header__side">
        {guardians.length > 0 ? (
          <div className="patient-header__guardian">
            <span className="eyebrow">{guardians.length > 1 ? `Responsáveis (${guardians.length})` : 'Responsável'}</span>
            <strong>{guardians[0].nome}</strong>
            <span>{guardians[0].parentesco}{guardians[0].telefone ? ` · ${formatPhone(guardians[0].telefone)}` : ''}</span>
            {guardians.length > 1 ? (
              <span className="muted" style={{ fontSize: 'var(--t-caption)', marginTop: 2 }}>
                + {guardians.slice(1).map((g) => `${g.nome}${g.parentesco ? ` (${g.parentesco})` : ''}`).join(' · ')}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Estados do paciente com o mesmo chip da Agenda e de Pacientes. */}
        {teleNext || teleDone.length ? (
          <Chip tone="warning" icon="video" wrap>
            Sem consentimento para teleconsulta
            {teleNext ? ` · próxima em ${date(teleNext.inicio)}` : ''}
            {teleDone.length ? ` · ${teleDone.length} já ${teleDone.length === 1 ? 'realizada' : 'realizadas'}` : ''}
          </Chip>
        ) : null}
        {unresolved ? (
          <Chip tone="danger" icon="history" wrap>
            Consulta de {dateTime(unresolved.inicio)} sem desfecho registrado · {APPOINTMENT_TYPE_LABELS[unresolved.tipo]}
          </Chip>
        ) : null}
        {present ? (
          <Chip tone="warning" wrap>{presentLabel} · {APPOINTMENT_TYPE_LABELS[present.tipo]}</Chip>
        ) : null}
        {late ? (
          <Chip tone="danger" wrap>Hoje {time(late.inicio)} · atrasado, sem chegada · {APPOINTMENT_TYPE_LABELS[late.tipo]}</Chip>
        ) : null}
        {next ? (
          <div className="patient-header__next">
            <Icon name="calendar" size={14} />
            <span>Próxima: {dateTime(next.inicio)} · {APPOINTMENT_TYPE_LABELS[next.tipo]}</span>
          </div>
        ) : present || late || unresolved ? null : (
          <button type="button" className="patient-header__next is-empty" onClick={() => navigate('/agenda')}>
            <Icon name="calendar" size={14} />
            <span>Sem retorno agendado — agendar</span>
          </button>
        )}

        <div className="patient-header__actions">
          {/* Só aparece quando a coluna de contexto não cabe — aí o resumo
              precisa de outra porta de entrada. */}
          <Button onClick={onOpenResumo} icon="clipboard" className="patient-header__resumo">Resumo</Button>
          <Button onClick={onEdit} icon="edit">Editar ficha</Button>
          {canIssue ? (
            <Button variant="primary" icon="file-text" onClick={onIssue}>Emitir documento</Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════ Painel de contexto ═══════════════════════
   Coluna direita fixa. É o que o médico precisa ver sem procurar enquanto
   conversa com a família.                                                */

function ContextPanel({ patient, medications, scales, appointments, embutido = false }) {
  const active = medications.filter((m) => !m.suspensaEm);
  const lastScale = [...scales].sort((a, b) => (b.aplicadaEm ?? '').localeCompare(a.aplicadaEm ?? ''))[0];
  const done = appointments.filter((a) => a.status === 'concluido');

  return (
    <aside className={`context ${embutido ? 'context--embutido' : ''}`.trim()} aria-label="Resumo do paciente">
      {patient.clinico?.alergias?.length ? (
        <section className="context__block context__block--alert">
          <span className="context__title">
            <Icon name="alert-triangle" size={14} />
            Alergias
          </span>
          <div className="context__chips">
            <span className="patient-header__allergy-list">{patient.clinico.alergias.join(' · ')}</span>
          </div>
        </section>
      ) : null}

      <section className="context__block">
        <span className="context__title">Diagnósticos ativos</span>
        {patient.clinico?.diagnosticos?.length ? (
          <ul className="context__list">
            {patient.clinico.diagnosticos.map((d) => (
              <li key={d.codigo ?? d}>
                <strong>{d.codigo ?? '—'}</strong>
                <span>{d.descricao ?? d}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="context__empty">Nenhum diagnóstico registrado.</p>
        )}
      </section>

      <section className="context__block">
        <span className="context__title">Medicações em uso</span>
        {active.length ? (
          <ul className="context__list">
            {active.map((m) => (
              <li key={m.id}>
                <strong>{m.principioAtivo || m.nome}</strong>
                <span>{m.posologia}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="context__empty">Nenhuma medicação em uso.</p>
        )}
      </section>

      <section className="context__block">
        <span className="context__title">Acompanhamento</span>
        <div className="context__metrics">
          <MiniMetricCard label="Consultas realizadas" value={done.length} />
          {lastScale ? (
            <MiniMetricCard
              label={lastScale.instrumento}
              value={lastScale.escore}
              denominator={lastScale.escoreMaximo}
              footnote={`Aplicada ${relative(lastScale.aplicadaEm)}`}
              trend={lastScale.interpretacao}
              trendTone={lastScale.risco === 'alto' ? 'danger' : lastScale.risco === 'moderado' ? 'warning' : 'success'}
            />
          ) : null}
        </div>
      </section>

      {patient.perfilSensorial?.gatilhos || patient.perfilSensorial?.estrategias ? (
        <section className="context__block context__block--sensory">
          <span className="context__title">
            <Icon name="heart-pulse" size={14} />
            Perfil sensorial
          </span>
          {patient.perfilSensorial.gatilhos ? (
            <p className="context__note"><em>Evitar:</em> {patient.perfilSensorial.gatilhos}</p>
          ) : null}
          {patient.perfilSensorial.estrategias ? (
            <p className="context__note"><em>Funciona:</em> {patient.perfilSensorial.estrategias}</p>
          ) : null}
          {patient.perfilSensorial.toleranciaEspera ? (
            <p className="context__note"><em>Espera:</em> {patient.perfilSensorial.toleranciaEspera}</p>
          ) : null}
        </section>
      ) : null}

      {patient.escola?.instituicao ? (
        <section className="context__block">
          <span className="context__title">Escola</span>
          <p className="context__note">
            {patient.escola.instituicao}
            {patient.escola.serie ? ` · ${patient.escola.serie}` : ''}
          </p>
        </section>
      ) : null}
    </aside>
  );
}

function RecordSkeleton() {
  return (
    <div>
      <Skeleton height={20} width="240px" />
      <div style={{ height: 24 }} />
      <Skeleton height={124} radius="var(--r-lg)" card />
      <div style={{ height: 24 }} />
      <div className="record">
        <Skeleton height={300} radius="var(--r-lg)" card />
        <Skeleton height={420} radius="var(--r-lg)" card />
        <Skeleton height={420} radius="var(--r-lg)" card />
      </div>
    </div>
  );
}
