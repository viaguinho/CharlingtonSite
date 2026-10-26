import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import * as repo from '../../data/repository.js';
import { STORES, PATIENT_STATUS_LABELS, CONSENT_PURPOSES } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { Breadcrumb } from '../../components/Shell.jsx';
import { Skeleton } from '../../components/Card.jsx';
import { Button, Chip, StatusDot } from '../../components/primitives.jsx';
import ErrorBoundary from '../../components/ErrorBoundary.jsx';
import Icon from '../../components/Icon.jsx';
import { age, date, relative } from '../../core/format.js';
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
import RescheduleDialog from '../agenda/RescheduleDialog.jsx';
import { ProfileColumn } from './record/ProfileColumn.jsx';
import { InsightsColumn, recordedMilestones } from './record/InsightsColumn.jsx';
import { AlertPills } from './record/AlertPills.jsx';
import { VisitRail } from './record/VisitRail.jsx';
import { SectionPanel } from './record/SectionPanel.jsx';
import { AllergyNotice } from './record/AllergyNotice.jsx';
import { patientStates, firstVisit } from './record/patientStates.js';

// O palco 3D (three + modelo) só carrega nesta rota. A cadeia rota → palco → cena
// era pedida em série (a cena só era pedida depois de o palco montar: ~1 s até o
// busto, 3,2 s em 4G): aqui os dois módulos começam a baixar assim que a rota
// carrega, em paralelo com a leitura dos dados.
const loadStage = () => import('./anatomy/AnatomyStage.jsx');
const AnatomyStage = lazy(loadStage);
if (typeof window !== 'undefined') {
  loadStage().catch(() => {});
  import('./anatomy/scene.js').catch(() => {});
}

/**
 * Prontuário eletrônico — redesign Quantis em tema claro (20/10/2026).
 *
 *   coluna do paciente · palco anatômico · coluna de medidas
 *
 * A visão geral é a composição inteira; cada seção do prontuário abre num
 * painel de vidro sobre o palco e a coluna direita, com a coluna do paciente
 * sempre à vista. Guia: docs/redesign-paciente/guia.md.
 */

const SECTIONS = [
  { value: 'linha-do-tempo', label: 'Linha do tempo' },
  { value: 'evolucoes', label: 'Evoluções' },
  { value: 'escalas', label: 'Escalas' },
  { value: 'marcos', label: 'Marcos' },
  { value: 'medicacoes', label: 'Medicações' },
  { value: 'anexos', label: 'Exames' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'consentimentos', label: 'Consentimentos' },
];

// O que cada seção lê: se a leitura falhou, o painel diz isso em vez de mostrar "vazio".
const SECTION_STORES = {
  evolucoes: STORES.NOTES,
  escalas: STORES.SCALES,
  marcos: STORES.MILESTONES,
  medicacoes: STORES.MEDICATIONS,
  anexos: STORES.ATTACHMENTS,
  documentos: STORES.DOCUMENTS,
  consentimentos: STORES.CONSENTS,
};

const STORE_LABELS = {
  [STORES.GUARDIANS]: 'responsáveis',
  [STORES.APPOINTMENTS]: 'consultas',
  [STORES.NOTES]: 'evoluções',
  [STORES.SCALES]: 'escalas',
  [STORES.MILESTONES]: 'marcos',
  [STORES.MEDICATIONS]: 'medicações',
  [STORES.ATTACHMENTS]: 'exames',
  [STORES.DOCUMENTS]: 'documentos',
  [STORES.CONSENTS]: 'consentimentos',
};

const joinNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : names[0]);

const SECTION_TITLES = {
  'linha-do-tempo': 'Linha do tempo',
  evolucoes: 'Evoluções clínicas',
  escalas: 'Escalas e instrumentos',
  marcos: 'Marcos do desenvolvimento',
  medicacoes: 'Medicações',
  anexos: 'Exames e anexos',
  documentos: 'Documentos',
  consentimentos: 'Consentimentos',
};

// Leituras que alimentam a Linha do tempo: se uma falha, ela não pode parecer completa.
const TIMELINE_STORES = [STORES.APPOINTMENTS, STORES.NOTES, STORES.DOCUMENTS, STORES.ATTACHMENTS, STORES.SCALES, STORES.MEDICATIONS];

const emptyRecord = () => ({
  patient: null, guardians: [], appointments: [], notes: [],
  scales: [], milestones: [], medications: [], attachments: [],
  documents: [], consents: [], failed: [], skipped: 0,
});

export default function PatientRecordScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const section = SECTIONS.some((s) => s.value === searchParams.get('secao')) ? searchParams.get('secao') : null;

  const [loading, setLoading] = useState(true);   // só a carga inicial mostra esqueleto
  // Falha ao ler o paciente: sem ele não há prontuário; com ele já na tela, os dados ficam e o aviso aparece.
  const [loadError, setLoadError] = useState(false);
  // Id que não existe (link velho, outra unidade): diz isso, em vez de redirecionar calado.
  const [notFound, setNotFound] = useState(false);
  // Só a última leitura vale: "Tentar de novo" duas vezes não pode ser sobrescrita por uma resposta antiga.
  const loadSeq = useRef(0);
  // "Tentar de novo" precisa mostrar que está tentando e, se falhar outra vez, dizer que falhou outra vez.
  const [retrying, setRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  // O relógio anda com a tela aberta: "Próxima · agora" vira "Atrasado" sem recarregar.
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [attachIntent, setAttachIntent] = useState(null);
  const [timelineFocus, setTimelineFocus] = useState(null);
  // Ação pedida junto com a seção ("Aplicar escala" abre o formulário, não só o painel).
  const [sectionIntent, setSectionIntent] = useState(null);
  const pillsRef = useRef(null);
  // Abaixo de 1024px o painel é tela cheia: o resto da página fica inerte por trás.
  const fullscreenPanel = useMediaQuery('(max-width: 1023px)');
  const [record, setRecord] = useState(emptyRecord);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const raw = await repo.get(STORES.PATIENTS, id);
      if (seq !== loadSeq.current) return;
      if (!raw) { setNotFound(true); setLoadError(false); setRecord(emptyRecord()); return; }
      // Ficha antiga sem os blocos clínicos não pode derrubar a tela inteira.
      const patient = { ...raw, clinico: raw.clinico ?? {}, perfilSensorial: raw.perfilSensorial ?? {} };

      const byPatient = { where: { pacienteId: id } };
      // Leitura que falha NÃO é lista vazia: "Nenhuma medicação registrada" diria
      // ao médico que o paciente não toma nada. A loja que falhou fica marcada.
      const failed = [];
      const read = (store, options) => repo.list(store, options).catch(() => { failed.push(store); return []; });
      const [guardians, appointments, notes, scales, milestones, medications, attachments, documents, consents] =
        await Promise.all([
          read(STORES.GUARDIANS),
          read(STORES.APPOINTMENTS, byPatient),
          read(STORES.NOTES, byPatient),
          read(STORES.SCALES, byPatient),
          read(STORES.MILESTONES, byPatient),
          read(STORES.MEDICATIONS, byPatient),
          read(STORES.ATTACHMENTS, byPatient),
          read(STORES.DOCUMENTS, byPatient),
          read(STORES.CONSENTS, byPatient),
        ]);

      if (seq !== loadSeq.current) return;

      // Uma consulta com data ilegível derrubaria a faixa e os alertas, alergia incluída.
      const sane = appointments.filter((a) => Number.isFinite(Date.parse(a.inicio)));

      setLoadError(false);
      setNotFound(false);
      setRecord({
        patient,
        // Na ordem da ficha: o primeiro cadastrado é o responsável principal.
        guardians: (patient.responsaveis ?? []).map((gid) => guardians.find((g) => g.id === gid)).filter(Boolean),
        appointments: sane, notes, scales, milestones, medications, attachments, documents, consents,
        failed, skipped: appointments.length - sane.length,
      });
    } catch {
      if (seq === loadSeq.current) setLoadError(true);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [id]);

  const retry = useCallback(async () => {
    setRetrying(true);
    setAttempts((n) => n + 1);
    try { await load(); } finally { setRetrying(false); }
  }, [load]);

  // Outro paciente na mesma rota: nada do anterior fica na tela enquanto o novo carrega.
  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    setAttempts(0);
    setRecord(emptyRecord());
    load();
  }, [load]);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const timer = setInterval(bump, 60_000);
    const onVisible = () => { if (!document.hidden) bump(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const setSection = useCallback((value) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) params.set('secao', value); else params.delete('secao');
      return params;
    });
  }, [setSearchParams]);

  const goToSection = useCallback((value, options) => {
    setSectionIntent(value && options?.create ? { section: value, create: true, nonce: Date.now() } : null);
    setSection(value);
  }, [setSection]);

  const closePanel = useCallback(() => {
    setSection(null);
  }, [setSection]);

  // Fechar pelo ×, por Esc ou pelo voltar do navegador devolve o foco à
  // pílula da seção que estava aberta — sem isso o voltar do navegador
  // largava o foco no body.
  const lastSection = useRef(section);
  useEffect(() => {
    const previous = lastSection.current;
    lastSection.current = section;
    if (section || !previous) return;
    setAttachIntent(null);
    setTimelineFocus(null);
    setSectionIntent(null);
    requestAnimationFrame(() => {
      // Fechou clicando numa pílula ("Visão geral"): o foco fica onde o clique o deixou.
      if (pillsRef.current?.contains(document.activeElement)) return;
      pillsRef.current?.querySelector(`[data-section="${previous}"]`)?.focus({ preventScroll: true });
    });
  }, [section]);

  const states = useMemo(
    () => (record.patient ? patientStates(record.patient, record.appointments, record.consents, record.failed) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [record.patient, record.appointments, record.consents, record.failed, tick],
  );

  if (loading) return <RecordSkeleton />;
  if (notFound) return <PatientNotFound onBack={() => navigate('/pacientes', { replace: true })} />;

  const { patient } = record;
  if (!patient) return loadError ? <RecordUnavailable onRetry={() => { setLoading(true); load(); }} /> : null;

  // Uma leitura que falhou não é "zero": contagem e pendência dela não se afirmam.
  const unreadable = new Set(record.failed);

  const counts = {
    'linha-do-tempo': null,
    evolucoes: record.notes.length || null,
    // Instrumentos, não aplicações: é o que o painel lista ("3 instrumentos aplicados").
    escalas: new Set(record.scales.map((s) => s.instrumentoId)).size || null,
    // A mesma régua do card e do painel: um marco que voltou a "Não avaliado" sai da conta.
    marcos: recordedMilestones(record.milestones).length || null,
    medicacoes: record.medications.filter((m) => !m.suspensaEm).length || null,
    anexos: record.attachments.length || null,
    // Pendência vem antes do total: "9 a emitir" é o que precisa de ação.
    documentos: unreadable.has(STORES.DOCUMENTS) ? null : (() => {
      const issued = new Set(record.documents.map((d) => d.atendimentoId).filter(Boolean));
      const pending = record.appointments.filter((a) => a.tipo === 'laudo' && a.status === 'concluido' && !issued.has(a.id)).length;
      return pending ? { value: pending, tone: 'warning', hint: `${pending} a emitir` } : record.documents.length || null;
    })(),
    consentimentos: (() => {
      // Só conta o que DEPENDE de consentimento: o registro de "tratamento
      // clínico" é informação ao responsável (base legal própria).
      const active = record.consents.filter((c) => !c.revogadoEm
        && c.finalidade !== CONSENT_PURPOSES.CLINICAL).length;
      return active ? { value: active, tone: 'neutral', hint: `${active} vigente${active > 1 ? 's' : ''}` } : null;
    })(),
  };

  // Remarcar só para quem edita a agenda; sem a permissão o botão nem aparece.
  const onReschedule = can.write('agenda') ? setRescheduling : undefined;
  const canUpload = can.write('patients.clinical');
  const viewProps = {
    ...record, reload: load, onIssueDocument: setDocModal, onGoToSection: goToSection, onReschedule,
  };
  const intentFor = (value) => (sectionIntent?.section === value ? sectionIntent : null);
  // Escala vazia: "Aplicar escala" (e o "Abrir" ao lado) já abre o registro.
  const goFromInsights = (value, options) => goToSection(value, options
    ?? (value === 'escalas' && !record.scales.length && can.write('patients.clinical') ? { create: true } : undefined));
  // Fora da visão geral em tela cheia, o que fica atrás do painel não recebe foco.
  const behindPanel = section && fullscreenPanel ? { inert: true, 'aria-hidden': 'true' } : {};

  const openAttachments = (patch) => {
    setAttachIntent({ nonce: Date.now(), ...patch });
    setSection('anexos');
  };

  const issueNames = record.failed.map((store) => STORE_LABELS[store]).filter(Boolean);
  const ageInfo = patient.dataNascimento ? age(patient.dataNascimento) : null;
  const first = firstVisit(record.appointments);
  const name = patient.nomeSocial || patient.nome;

  const alerts = <AlertPills states={states} onReschedule={onReschedule} collapse />;
  // A faixa e as colunas falham sozinhas: um registro ruim nunca derruba a barra, a alergia e o resto.
  const rail = (
    <ErrorBoundary scope="faixa de consultas" fallback={null}>
      <VisitRail appointments={record.appointments} onOpen={(a) => { setTimelineFocus(a.id); setSection('linha-do-tempo'); }} />
    </ErrorBoundary>
  );

  return (
    <div className="pr">
      <div className="pr-behind" {...behindPanel}>
        <Breadcrumb items={[
          { label: 'Pacientes', to: '/pacientes' },
          { label: name },
        ]} />
      </div>

      {issueNames.length || record.skipped || loadError ? (
        <div className="pr-issue" role="alert" {...behindPanel}>
          <Icon name="alert-triangle" size={16} />
          <p>
            {loadError ? `${attempts ? 'Ainda não' : 'Não'} foi possível atualizar o prontuário agora. ` : null}
            {issueNames.length ? `${attempts ? 'Ainda não' : 'Não'} foi possível ler ${joinNames(issueNames)}. O que aparece abaixo pode estar incompleto. ` : null}
            {record.skipped ? `${record.skipped} ${record.skipped === 1 ? 'consulta com data ilegível ficou' : 'consultas com data ilegível ficaram'} de fora.` : null}
          </p>
          {loadError || issueNames.length ? (
            <button type="button" className="pr-link" onClick={retry} disabled={retrying} aria-busy={retrying || undefined}>{retrying ? 'Lendo de novo…' : 'Tentar de novo'}</button>
          ) : null}
        </div>
      ) : null}

      <header className="pr-bar" {...behindPanel}>
        <button type="button" className="pr-bar__back" onClick={() => navigate('/pacientes')} aria-label="Voltar para Pacientes">
          <Icon name="chevron-left" size={18} />
        </button>

        <div className="pr-bar__id">
          <h1>{name}</h1>
          {patient.nomeSocial ? <p className="pr-bar__legal">Nome de registro: {patient.nome}</p> : null}
          <p className="pr-bar__meta">
            {ageInfo ? <span>{ageInfo.label}</span> : null}
            {patient.dataNascimento ? <span className="num">{date(patient.dataNascimento)}</span> : null}
            {first ? (
              // "Em acompanhamento" só vale para quem está ativo: com alta ou arquivado, a frase é o fato.
              <span>{patient.status === 'ativo' ? 'em acompanhamento desde' : 'primeiro atendimento em'} <span className="num">{date(first.inicio)}</span> ({relative(first.inicio)})</span>
            ) : null}
            {patient.status === 'ativo'
              ? <span className="pr-bar__status">{PATIENT_STATUS_LABELS[patient.status]}</span>
              : <StatusDot tone="neutral" label={PATIENT_STATUS_LABELS[patient.status]} />}
            {patient.clinico?.diagnosticos?.length ? (
              // Os códigos quebram juntos: "F90.0" nunca fica sozinho na linha de baixo.
              <span className="pr-bar__codes">
                {patient.clinico.diagnosticos.slice(0, 3).map((d) => (
                  <Chip key={d.codigo ?? d} tone="code">{d.codigo ?? d}</Chip>
                ))}
                {/* O card de diagnósticos lista todos; o cabeçalho diz quantos ficaram de fora. */}
                {patient.clinico.diagnosticos.length > 3 ? (
                  <Chip tone="muted">+{patient.clinico.diagnosticos.length - 3}</Chip>
                ) : null}
              </span>
            ) : null}
          </p>
        </div>

        <div className="pr-bar__actions">
          <Button onClick={() => setEditing(true)} icon="edit">Editar ficha</Button>
          {can.write('documents.issue') ? (
            <Button variant="primary" icon="file-text" onClick={() => setDocModal({ patient })}>Emitir documento</Button>
          ) : null}
        </div>
      </header>

      <SectionPills
        listRef={pillsRef}
        value={section}
        counts={counts}
        behind={behindPanel}
        onChange={(value) => (value === section ? null : value ? goToSection(value) : closePanel())}
      >
        {/* Abaixo de 1024px o palco desce: a alergia gruda junto da barra de
            seções para que alguma alergia fique sempre à vista ao rolar. */}
        <div className="pr-pills__alerts"><AlertPills states={states} onReschedule={onReschedule} compact /></div>
      </SectionPills>

      <div className={`pr-grid ${section ? 'has-panel' : ''}`.trim()}>
        <div className="pr-behind" {...behindPanel}>
        <ErrorBoundary scope="coluna do paciente" fallback={<RegionFailed label="a coluna do paciente" />}>
        <ProfileColumn
          unreadable={unreadable}
          patient={patient}
          guardians={record.guardians}
          appointments={record.appointments}
          attachments={record.attachments}
          states={states}
          onReschedule={onReschedule}
          onSchedule={() => navigate(`/agenda?agendar=${encodeURIComponent(patient.id)}`)}
          onOpenAttachments={(origens) => openAttachments({ filter: origens })}
          onUpload={(origem) => openAttachments({ upload: origem })}
          onPreview={(attachment) => openAttachments({ preview: attachment })}
          onGoToSection={goToSection}
          canUpload={canUpload}
        />
        </ErrorBoundary>
        </div>

        <div className="pr-stage" aria-hidden={section ? 'true' : undefined} inert={section ? true : undefined}>
          <ErrorBoundary fallback={<StageFallback alerts={alerts} rail={rail} />}>
            <Suspense fallback={<StageFallback alerts={alerts} rail={rail} loading />}>
              <AnatomyStage
                attachments={record.attachments}
                alerts={alerts}
                rail={rail}
                paused={!!section}
                onOpenAttachments={(origem) => openAttachments({ filter: [origem] })}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="pr-side" aria-hidden={section ? 'true' : undefined} inert={section ? true : undefined}>
          <ErrorBoundary scope="coluna de medidas" fallback={<RegionFailed label="a coluna de medidas" />}>
          <InsightsColumn
            unreadable={unreadable}
            scales={record.scales}
            medications={record.medications}
            documents={record.documents}
            milestones={record.milestones}
            allergies={states?.allergies ?? []}
            onGoToSection={goFromInsights}
            canWrite={can.write('patients.clinical')}
          />
          </ErrorBoundary>
        </div>

        {section ? (
          <SectionPanel key={section} label={SECTION_TITLES[section]} patientName={name} onClose={closePanel}
            alerts={<AlertPills states={states} onReschedule={onReschedule} compact part="allergy" />}
            states={<AlertPills states={states} onReschedule={onReschedule} compact part="others" />}>
            {SECTION_STORES[section] && unreadable.has(SECTION_STORES[section]) ? (
              // Sem a leitura não há como saber o que já existe: criar agora duplicaria registro.
              <RecordUnavailable inline what={STORE_LABELS[SECTION_STORES[section]]} onRetry={load} />
            ) : (
              <>
                {section === 'linha-do-tempo' ? (
                  <>
                    {TIMELINE_STORES.some((s) => unreadable.has(s)) ? (
                      <p className="pr-panel-issue" role="status">
                        <Icon name="alert-triangle" size={16} />
                        <span>Não foi possível ler {joinNames(TIMELINE_STORES.filter((s) => unreadable.has(s)).map((s) => STORE_LABELS[s]))}. A linha do tempo pode estar incompleta. <button type="button" className="pr-link" onClick={retry} disabled={retrying}>{retrying ? 'Lendo de novo…' : 'Tentar de novo'}</button></span>
                      </p>
                    ) : null}
                    <TimelineView {...viewProps} focusId={timelineFocus} />
                  </>
                ) : null}
                {section === 'evolucoes' ? <NotesView {...viewProps} intent={intentFor('evolucoes')} /> : null}
                {section === 'escalas' ? <ScalesView {...viewProps} intent={intentFor('escalas')} /> : null}
                {section === 'marcos' ? <MilestonesView {...viewProps} intent={intentFor('marcos')} /> : null}
                {section === 'medicacoes' ? <MedicationsView {...viewProps} intent={intentFor('medicacoes')} /> : null}
                {section === 'anexos' ? <AttachmentsView {...viewProps} intent={attachIntent} /> : null}
                {section === 'documentos' ? <DocumentsView {...viewProps} /> : null}
                {section === 'consentimentos' ? <ConsentsView {...viewProps} /> : null}
              </>
            )}
          </SectionPanel>
        ) : null}
      </div>

      <ErrorBoundary scope="ficha do paciente" fallback={null}>
        <PatientForm
          open={editing}
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      </ErrorBoundary>

      <ClinicalDocumentModal
        open={!!docModal}
        patient={patient}
        guardians={record.guardians}
        initialType={docModal?.tipo}
        notice={<AllergyNotice patient={patient} hint="Confirme com o responsável antes de prescrever." />}
        allergies={states?.allergies ?? []}
        appointment={docModal?.atendimentoId ? record.appointments.find((a) => a.id === docModal.atendimentoId) : undefined}
        onClose={() => setDocModal(null)}
        onIssued={() => { setDocModal(null); load(); }}
      />

      <RescheduleDialog
        appointment={rescheduling}
        notice={<AllergyNotice patient={patient} />}
        onClose={() => setRescheduling(null)}
        onDone={() => { setRescheduling(null); load(); }}
      />
    </div>
  );
}

/* ═══════════════════════ Pílulas de seção ═══════════════════════
   As pílulas "Hormone · Circulatory · …" da referência. Tabindex móvel:
   Tab entra uma vez, setas andam, Enter/Espaço abre. */

function SectionPills({ listRef, value, counts, onChange, behind, children }) {
  const items = [{ value: null, label: 'Visão geral' }, ...SECTIONS];
  const activeIndex = Math.max(0, items.findIndex((i) => i.value === value));
  // Tabindex móvel de verdade: a parada de Tab acompanha a pílula focada.
  const [focusIndex, setFocusIndex] = useState(null);
  const stop = focusIndex ?? activeIndex;

  // Faixa rolável (1024 e abaixo): a pílula ativa entra inteira na vista.
  // Só a faixa rola; a página fica onde está.
  useEffect(() => {
    const track = listRef.current;
    const pill = track?.querySelectorAll('button')[activeIndex];
    if (!pill || track.scrollWidth <= track.clientWidth) return;
    const l = pill.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    const r = l + pill.offsetWidth;
    if (l < track.scrollLeft) track.scrollTo({ left: l - 16 });
    else if (r > track.scrollLeft + track.clientWidth) track.scrollTo({ left: r - track.clientWidth + 16 });
  }, [activeIndex, listRef]);

  // Pista de rolagem: a borda que esconde pílulas esmaece (patient-record.css).
  const [more, setMore] = useState('');
  useEffect(() => {
    const track = listRef.current;
    if (!track) return undefined;
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      setMore([track.scrollLeft > 1 ? 'start' : '', track.scrollLeft < max - 1 ? 'end' : ''].filter(Boolean).join(' '));
    };
    sync();
    track.addEventListener('scroll', sync, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(track);
    return () => { track.removeEventListener('scroll', sync); ro?.disconnect(); };
  }, [listRef]);

  const onKeyDown = (e) => {
    const buttons = [...listRef.current.querySelectorAll('button')];
    const at = buttons.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowRight') next = (at + 1) % buttons.length;
    if (e.key === 'ArrowLeft') next = (at - 1 + buttons.length) % buttons.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    if (next == null) return;
    e.preventDefault();
    buttons[next].focus();
    buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // A barra está grudada? (o vidro de largura total só aparece então)
  const barRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const bar = barRef.current;
    const scroller = bar?.closest('.shell__content');
    if (!bar) return undefined;
    const target = scroller ?? window;
    const sync = () => {
      const top = scroller ? scroller.getBoundingClientRect().top + (parseFloat(getComputedStyle(scroller).paddingTop) || 0) : 0;
      setStuck(bar.getBoundingClientRect().top <= top + 1 && (scroller ? scroller.scrollTop : window.scrollY) > 0);
    };
    sync();
    target.addEventListener('scroll', sync, { passive: true });
    return () => target.removeEventListener('scroll', sync);
  }, []);

  return (
    <div ref={barRef} className="pr-pills" data-stuck={stuck || undefined} {...behind}>
    <nav className="pr-pills__nav" aria-label="Seções do prontuário">
      <div ref={listRef} className="pr-pills__track" data-more={more || undefined} onKeyDown={onKeyDown}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocusIndex(null); }}>
        {items.map((item, i) => {
          const count = item.value ? counts[item.value] : null;
          const countValue = count && typeof count === 'object' ? count.value : count;
          const active = i === activeIndex;
          return (
            <button
              key={item.value ?? 'geral'}
              type="button"
              data-section={item.value ?? 'geral'}
              className={`pr-pill ${active ? 'is-active' : ''}`.trim()}
              aria-current={active ? 'page' : undefined}
              tabIndex={i === stop ? 0 : -1}
              onFocus={() => setFocusIndex(i)}
              onClick={() => onChange(item.value)}
              title={count && typeof count === 'object' ? count.hint : undefined}
            >
              {item.label}
              {countValue ? (
                <span className={`pr-pill__count num ${count?.tone === 'warning' ? 'is-warning' : ''}`.trim()}>
                  {count && typeof count === 'object' && count.tone === 'warning' ? count.hint : countValue}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
    {children}
    </div>
  );
}

/** `matchMedia` como estado: o painel muda de papel (sobreposto × tela cheia) na quebra. */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Região que falhou ao desenhar: o resto da página, a barra e a alergia seguem de pé. */
function RegionFailed({ label }) {
  return (
    <div className="pr-card pr-region-failed" role="alert">
      <p className="pr-empty">Não foi possível mostrar {label}. O restante do prontuário continua disponível.</p>
    </div>
  );
}

/** Falha de leitura: nunca o texto de "nenhum registro", e nenhum botão de criar. */
function RecordUnavailable({ onRetry, inline = false, what = 'o prontuário' }) {
  return (
    <div className={`pr-unavailable ${inline ? 'is-inline' : ''}`.trim()} role="alert">
      <Icon name="alert-triangle" size={20} />
      <h2>Não foi possível ler {what}</h2>
      <p>Isso não significa que não haja registros. Tente de novo; se continuar, recarregue o painel.</p>
      <Button variant="primary" icon="refresh" onClick={onRetry}>Tentar de novo</Button>
    </div>
  );
}

/** Id sem paciente: link velho, outra unidade ou registro removido. Volta sem prender o histórico. */
function PatientNotFound({ onBack }) {
  return (
    <div className="pr-unavailable" role="alert">
      <Icon name="search" size={20} />
      <h2>Paciente não encontrado</h2>
      <p>Este endereço não corresponde a nenhum paciente desta clínica. O link pode ser antigo ou de outra unidade.</p>
      <Button variant="primary" onClick={onBack}>Ir para Pacientes</Button>
    </div>
  );
}

function StageFallback({ alerts, rail, loading = false }) {
  return (
    <div className="pr-stage__fallback">
      <div className="pr-stage__alerts">{alerts}</div>
      <p className="pr-stage__msg">{loading ? 'Carregando o modelo anatômico…' : 'Não foi possível abrir o modelo 3D neste navegador.'}</p>
      <div className="pr-stage__rail">{rail}</div>
    </div>
  );
}

function RecordSkeleton() {
  return (
    <div className="pr" aria-busy="true">
      <p className="sr-only" role="status">Carregando o prontuário…</p>
      <Skeleton height={20} width="240px" />
      <div style={{ height: 'var(--s-6)' }} />
      <Skeleton height={64} width="420px" />
      <div style={{ height: 'var(--s-6)' }} />
      <div className="pr-grid">
        <Skeleton height={520} radius="var(--r-card)" card />
        <Skeleton height={620} radius="var(--r-card)" card />
        <Skeleton height={520} radius="var(--r-card)" card />
      </div>
    </div>
  );
}
