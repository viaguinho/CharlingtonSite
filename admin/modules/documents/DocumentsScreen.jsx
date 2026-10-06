import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES, DOCUMENT_STATUS, APPOINTMENT_STATUS } from '../../data/schema.js';
import { LEGACY_TEMPLATES, DOCUMENT_SKELETONS } from '../../data/documentTemplates.js';
import { useSession } from '../../core/session.jsx';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip } from '../../components/Card.jsx';
import { DataTable, TableToolbar } from '../../components/DataTable.jsx';
import { Button, Chip, IconButton, StatusDot, Avatar } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Modal, Sheet, useToast, ConfirmDialog } from '../../components/Overlay.jsx';
import { TextField, TextArea, Select, Checkbox } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { DocumentSheet } from './DocumentSheet.jsx';
import { dateTime, relative, date, money } from '../../core/format.js';
import { localDay } from '../../core/periods.js';
import { oldestByDay, namesList } from '../../core/appointments.js';

/**
 * Documentos clínicos — visão da clínica inteira.
 *
 * Três abas: emitidos, fila de assinatura e modelos. A fila permite assinar
 * em lote: o médico digita um PIN e todos os documentos pendentes são
 * assinados, cada um com seu próprio registro de auditoria.
 */
export default function DocumentsScreen() {
  const { plaza, can } = useSession();
  const pending = usePendingReports(plaza);
  const [tab, setTab] = useState(null);
  // Abre em "A emitir" quando há laudo esperando: é a pendência que a Visão
  // geral conta, e ela precisa estar onde se age sobre ela.
  const current = tab ?? (pending.items.length ? 'emitir' : 'emitidos');

  return (
    <>
      <PageHeader
        eyebrow="Emissão e assinatura"
        title="Documentos clínicos"
        description="Prescrições, atestados, laudos e relatórios emitidos no papel timbrado da clínica, com assinatura digital e numeração sequencial."
        toolbar={
          <Tabs
            variant="segment"
            value={current}
            onChange={setTab}
            ariaLabel="Seções de documentos"
            items={[
              { value: 'emitir', label: 'A emitir', count: pending.loading ? undefined : pending.items.length },
              { value: 'emitidos', label: 'Emitidos' },
              { value: 'fila', label: 'Fila de assinatura' },
              { value: 'modelos', label: 'Modelos' },
            ]}
          />
        }
      />

      {current === 'emitir' ? <ToIssueTab pending={pending} /> : null}
      {current === 'emitidos' ? <IssuedTab plaza={plaza} pendingCount={pending.items.length} /> : null}
      {current === 'fila' ? <SignatureQueueTab plaza={plaza} canSign={can.write('documents.issue')} /> : null}
      {current === 'modelos' ? <TemplatesTab plaza={plaza} /> : null}
    </>
  );
}

/* ═══════════════════════════ A emitir ═══════════════════════════ */

/**
 * Atendimentos do tipo laudo, concluídos, sem nenhum documento vinculado. É a
 * mesma regra que a Visão geral usa para "laudos a emitir" — calculada num
 * lugar só para que as duas telas nunca discordem.
 */
function usePendingReports(plaza) {
  const [state, setState] = useState({ loading: true, items: [], paid: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const where = plaza ? { praca: plaza } : {};
      const [appointments, documents, patients, entries] = await Promise.all([
        repo.list(STORES.APPOINTMENTS, { where }).catch(() => []),
        repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
        repo.list(STORES.ENTRIES, { where }).catch(() => []),
      ]);
      const issued = new Set(documents.map((d) => d.atendimentoId).filter(Boolean));
      const items = appointments
        .filter((a) => a.tipo === 'laudo' && a.status === APPOINTMENT_STATUS.DONE && !issued.has(a.id))
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map((a) => ({ ...a, patient: patients.find((p) => p.id === a.pacienteId) }));
      // Quanto essas famílias já pagaram por um documento que não receberam.
      const ids = new Set(items.map((a) => a.id));
      const paid = entries
        .filter((e) => e.tipo === 'receita' && e.status === 'pago' && ids.has(e.atendimentoId))
        .reduce((total, e) => total + (Number(e.valor) || 0), 0);
      if (!cancelled) setState({ loading: false, items, paid });
    })();
    return () => { cancelled = true; };
  }, [plaza]);
  return state;
}

function ToIssueTab({ pending }) {
  const { items, loading, paid } = pending;
  // Empate por dia: dois laudos de 21/07 são os dois mais antigos, não um.
  const oldest = oldestByDay(items, (a) => localDay(a.inicio));
  const columns = [
    {
      key: 'paciente', label: 'Paciente',
      sortValue: (row) => row.patient?.nome,
      render: (row) => (
        <span className="table__primary">
          <Avatar name={row.patient?.nome} size={34} />
          <span className="table__primary-text">
            <strong>{row.patient?.nome ?? 'Paciente removido'}</strong>
            <span>Laudo neurológico</span>
          </span>
        </span>
      ),
    },
    {
      key: 'inicio', label: 'Atendido em', width: 240, sortable: true,
      render: (row) => {
        const isOld = Date.now() - new Date(row.inicio).getTime() > 7 * 86400000;
        return (
          <span className="nowrap">
            {date(row.inicio)} ·{' '}
            <span style={isOld ? { color: 'var(--signal-amber-ink)', fontWeight: 'var(--w-medium)' } : {}}>{relative(row.inicio)}</span>
          </span>
        );
      },
    },
    {
      // A linha inteira abre o prontuário. 28 botões iguais "Emitir no
      // prontuário" repetiam a mesma palavra 28 vezes sem distinguir nada.
      key: 'acao', label: '', width: 56, align: 'right',
      render: (row) => (
        <IconButton name="chevron-right" label={`Emitir laudo de ${row.patient?.nome ?? 'paciente'} no prontuário`}
          onClick={(e) => { e.stopPropagation(); window.location.hash = `#/pacientes/${row.pacienteId}`; }} />
      ),
    },
  ];

  return (
    <>
      <MetricStrip loading={loading}>
        <Metric
          featured
          label="Laudos atrasados (> 7 dias)"
          value={items.filter(a => Date.now() - new Date(a.inicio).getTime() > 7 * 86400000).length}
          tone={items.filter(a => Date.now() - new Date(a.inicio).getTime() > 7 * 86400000).length ? 'warning' : undefined}
          target={oldest
            ? [
              `${oldest.items.length === 1 ? 'Mais antigo' : `${oldest.items.length} mais antigos`}: ${namesList(oldest.items.map((a) => a.patient?.nome ?? '—'))}, ${oldest.items.length === 1 ? 'atendido' : 'atendidos'} ${relative(oldest.items[0].inicio)}`,
              paid ? `${money(paid)} já recebidos por todos os laudos` : null,
            ].filter(Boolean).join(' · ')
            : 'Nenhum laudo atrasado'}
        />
        <Metric
          label="Laudos recentes"
          value={items.filter(a => Date.now() - new Date(a.inicio).getTime() <= 7 * 86400000).length}
        />
      </MetricStrip>
      <div style={{ height: 'var(--gutter)' }} />
      <Card variant="flush">
        <CardHeader
          title="Atendimentos de laudo sem o documento emitido"
          subtitle="Do atendimento mais antigo ao mais recente"
        />
        <DataTable
          columns={columns}
          rows={items}
          loading={loading}
          onRowClick={(row) => { window.location.hash = `#/pacientes/${row.pacienteId}`; }}
          emptyState={
            <EmptyState
              icon="check"
              title="Nenhum laudo esperando emissão"
              description="Todo atendimento de laudo concluído já tem documento vinculado."
            />
          }
        />
      </Card>
    </>
  );
}

/* ═══════════════════════════ Emitidos ═══════════════════════════ */

function IssuedTab({ plaza, pendingCount }) {
  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const where = plaza ? { praca: plaza } : {};
      const [d, p] = await Promise.all([
        repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
        repo.list(STORES.PATIENTS, { where }).catch(() => []),
      ]);
      setDocuments(d);
      setPatients(p);
      setLoading(false);
    })();
  }, [plaza]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => typeFilter === 'all' || d.tipo === typeFilter)
      .map((d) => ({ ...d, patient: patients.find((p) => p.id === d.pacienteId) }))
      .filter((d) => !q || `${d.patient?.nome ?? ''} ${d.numero ?? ''} ${DOCUMENT_TYPE_LABELS[d.tipo] ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (b.assinatura?.assinadoEm ?? b.criadoEm).localeCompare(a.assinatura?.assinadoEm ?? a.criadoEm));
  }, [documents, patients, query, typeFilter]);

  const signed = documents.filter((d) => d.status === DOCUMENT_STATUS.SIGNED || d.status === DOCUMENT_STATUS.DELIVERED);
  const drafts = documents.filter((d) => d.status === DOCUMENT_STATUS.DRAFT);

  const columns = [
    {
      key: 'paciente',
      label: 'Paciente',
      sortValue: (row) => row.patient?.nome,
      render: (row) => (
        <span className="table__primary">
          <Avatar name={row.patient?.nome} size={34} />
          <span className="table__primary-text">
            <strong>{row.patient?.nome ?? 'Paciente removido'}</strong>
            <span>{DOCUMENT_TYPE_LABELS[row.tipo]}</span>
          </span>
        </span>
      ),
    },
    { key: 'numero', label: 'Número', width: 130, sortable: true, render: (row) => <span className="num">{row.numero ?? '—'}</span> },
    {
      key: 'emitido', label: 'Emitido', width: 170, hideBelow: 900,
      sortValue: (row) => row.assinatura?.assinadoEm ?? row.criadoEm,
      render: (row) => {
        const at = row.assinatura?.assinadoEm ?? row.criadoEm;
        return <span title={dateTime(at)}>{relative(at)}</span>;
      },
    },
    {
      key: 'status', label: 'Situação', width: 180,
      render: (row) => (
        <StatusDot
          tone={row.status === DOCUMENT_STATUS.SIGNED ? 'success' : row.status === DOCUMENT_STATUS.DRAFT ? 'warning' : 'neutral'}
          label={row.status === DOCUMENT_STATUS.SIGNED ? 'Assinado' : row.status === DOCUMENT_STATUS.DRAFT ? 'Rascunho' : 'Substituído'}
        />
      ),
    },
  ];

  // Sem nenhum documento, uma faixa 0 / 0 / 0 com um zero de 48 px era o maior
  // elemento da tela dizendo nada. O estado vazio da tabela diz o que fazer.
  const noDocuments = !loading && documents.length === 0;

  return (
    <>
      {noDocuments ? null : (<>
      <MetricStrip>
        <Metric
          featured
          label="Documentos emitidos"
          value={documents.length}
          target={pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'laudo ainda a emitir' : 'laudos ainda a emitir'}` : 'Nenhum laudo pendente'}
        />
        <Metric label="Assinados digitalmente" value={signed.length} />
        <Metric label="Rascunhos" value={drafts.length} tone={drafts.length ? 'warning' : undefined} />
      </MetricStrip>

      <div style={{ height: 'var(--gutter)' }} />
      </>)}

      <Card variant="flush">
        <TableToolbar>
          <TextField
            icon="search"
            placeholder="Buscar por paciente, número ou tipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar documento"
            className="patients__search"
          />
          <span className="spacer" />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo"
            options={[
              { value: 'all', label: 'Todos os tipos' },
              ...Object.values(DOCUMENT_TYPES).map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] })),
            ]}
          />
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          caption="Documentos emitidos"
          onRowClick={setViewing}
          emptyState={
            <EmptyState
              icon="file-text"
              title={query || typeFilter !== 'all' ? 'Nenhum documento encontrado' : 'Nenhum documento emitido'}
              description={query || typeFilter !== 'all'
                ? 'Ajuste a busca ou o filtro de tipo.'
                : pendingCount
                  ? `Nenhum documento emitido ainda, e ${pendingCount} ${pendingCount === 1 ? 'laudo concluído espera' : 'laudos concluídos esperam'} emissão na aba "A emitir". Documentos são emitidos no prontuário, vinculados a quem os recebeu.`
                  : 'Documentos são emitidos a partir do prontuário do paciente, sempre vinculados a quem os recebeu.'}
              action={query || typeFilter !== 'all' ? null : (
                <Button size="sm" icon="users" onClick={() => { window.location.hash = '#/pacientes'; }}>
                  Escolher paciente
                </Button>
              )}
            />
          }
        />
      </Card>

      <DocumentSheet
        document={viewing}
        patient={viewing?.patient}
        onClose={() => setViewing(null)}
      />
    </>
  );
}

/* ═══════════════════════ Fila de assinatura ═══════════════════════ */

function SignatureQueueTab({ plaza, canSign }) {
  const toast = useToast();
  const { requireStepUp } = useSession();
  const [pending, setPending] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [signing, setSigning] = useState(false);
  const [pin, setPin] = useState('');
  const [provider, setProvider] = useState('birdid');
  const [busy, setBusy] = useState(false);

  async function load() {
    const where = plaza ? { praca: plaza } : {};
    const [d, p] = await Promise.all([
      repo.list(STORES.DOCUMENTS, { where }).catch(() => []),
      repo.list(STORES.PATIENTS, { where }).catch(() => []),
    ]);
    const queue = d.filter((doc) => doc.status === DOCUMENT_STATUS.DRAFT || doc.status === DOCUMENT_STATUS.PENDING);
    setPending(queue);
    setPatients(p);
    setSelected(new Set(queue.map((doc) => doc.id)));
  }

  useEffect(() => { load(); }, [plaza]);

  async function signBatch() {
    if (!selected.size) { toast.error('Selecione ao menos um documento.'); return; }
    if (provider !== 'icpbrasil' && !pin.trim()) { toast.error('Digite o PIN ou código OTP.'); return; }

    setBusy(true);
    let ok = 0;
    let failed = 0;

    try {
      await requireStepUp('documents.issue', 'Assinatura em lote de documentos clínicos.');

      for (const id of selected) {
        const doc = pending.find((d) => d.id === id);
        if (!doc) continue;
        try {
          const result = await repo.invoke('sign-document', {
            provider, hash: doc.hashConteudo, pin: provider === 'icpbrasil' ? undefined : pin,
            documentType: doc.tipo,
          });
          await repo.update(STORES.DOCUMENTS, id, {
            status: DOCUMENT_STATUS.SIGNED,
            assinatura: {
              provedor: provider, id: result.signatureId,
              urlVerificacao: result.verificationUrl, assinadoEm: new Date().toISOString(),
            },
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      if (ok) toast.success(`${ok} ${ok === 1 ? 'documento assinado' : 'documentos assinados'}.`);
      if (failed) toast.error(`${failed} ${failed === 1 ? 'documento falhou' : 'documentos falharam'} na assinatura.`);
      setPin('');
      setSigning(false);
      load();
    } catch (error) {
      if (error.message !== 'Ação cancelada.') toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id) {
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Aguardando assinatura"
          subtitle={pending.length ? `${pending.length} documentos · ${selected.size} selecionados` : undefined}
          actions={
            canSign && pending.length ? (
              <Button variant="primary" icon="signature" onClick={() => setSigning(true)} disabled={!selected.size}>
                Assinar selecionados
              </Button>
            ) : null
          }
        />
        <CardBody>
          {pending.length ? (
            <ul className="sign-queue">
              {pending.map((doc) => {
                const patient = patients.find((p) => p.id === doc.pacienteId);
                return (
                  <li key={doc.id}>
                    <Checkbox
                      label=""
                      checked={selected.has(doc.id)}
                      onChange={() => toggle(doc.id)}
                      aria-label={`Selecionar documento de ${patient?.nome}`}
                    />
                    <span className="sign-queue__icon"><Icon name="file-text" size={15} /></span>
                    <span className="sign-queue__text">
                      <strong>{DOCUMENT_TYPE_LABELS[doc.tipo]}</strong>
                      <span>{patient?.nome ?? '—'} · criado {relative(doc.criadoEm)}</span>
                    </span>
                    <Chip tone="warning">Pendente</Chip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon="check"
              title="Nada aguardando assinatura"
              description="Documentos emitidos sem assinatura imediata aparecem aqui para serem assinados em lote."
            />
          )}
        </CardBody>
      </Card>

      <Modal
        open={signing}
        onClose={() => setSigning(false)}
        size="sm"
        title="Assinar em lote"
        description={`${selected.size} ${selected.size === 1 ? 'documento será assinado' : 'documentos serão assinados'} com um único código.`}
        footer={
          <>
            <Button onClick={() => setSigning(false)} disabled={busy}>Cancelar</Button>
            <Button variant="primary" onClick={signBatch} loading={busy}>Assinar</Button>
          </>
        }
      >
        <Select
          label="Provedor" value={provider} onChange={(e) => setProvider(e.target.value)}
          options={[
            { value: 'birdid', label: 'Bird ID (Soluti)' },
            { value: 'vidaas', label: 'VIDaaS (Valid)' },
            { value: 'icpbrasil', label: 'ICP-Brasil (certificado local)' },
          ]}
        />
        {provider !== 'icpbrasil' ? (
          <TextField
            label="PIN / código OTP" type="password" autoFocus
            value={pin} onChange={(e) => setPin(e.target.value)}
          />
        ) : null}
      </Modal>
    </>
  );
}

/* ═══════════════════════════ Modelos ═══════════════════════════ */

function TemplatesTab({ plaza }) {
  const { user } = useSession();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [removing, setRemoving] = useState(null);

  async function load() {
    const list = await repo.list(STORES.TEMPLATES, { where: plaza ? { praca: plaza } : {} }).catch(() => []);
    setTemplates(list);
  }

  useEffect(() => { load(); }, [plaza]);

  async function importLegacy(selection) {
    try {
      for (const legacy of LEGACY_TEMPLATES.filter((t) => selection.has(t.id))) {
        await repo.create(STORES.TEMPLATES, {
          nome: legacy.nome,
          tipo: legacy.tipo,
          conteudo: '',
          itens: legacy.itens,
          favorito: false,
          origem: legacy.origem,
        });
      }
      toast.success('Modelos importados. Revise cada um antes de usar.');
      setImporting(false);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map();
    for (const template of templates) {
      if (!map.has(template.tipo)) map.set(template.tipo, []);
      map.get(template.tipo).push(template);
    }
    return map;
  }, [templates]);

  return (
    <>
      <Card variant="flush">
        <CardHeader
          title="Meus modelos"
          subtitle={templates.length ? `${templates.length} modelos salvos` : undefined}
          actions={
            <>
              <Button size="sm" icon="download" onClick={() => setImporting(true)}>Importar do painel anterior</Button>
              <Button size="sm" variant="primary" icon="plus" onClick={() => setEditing({})}>Novo modelo</Button>
            </>
          }
        />
        <CardBody>
          {templates.length ? (
            <div className="templates">
              {Array.from(grouped.entries()).map(([type, list]) => (
                <section key={type}>
                  <h4 className="templates__group">{DOCUMENT_TYPE_LABELS[type] ?? type}</h4>
                  <ul>
                    {list.map((template) => (
                      <li key={template.id} className="template">
                        <span className="template__icon"><Icon name="copy" size={15} /></span>
                        <div className="template__text">
                          <strong>{template.nome}</strong>
                          <span>
                            {template.itens?.length
                              ? `${template.itens.length} ${template.itens.length === 1 ? 'item' : 'itens'}`
                              : 'texto livre'}
                            {template.origem ? ` · ${template.origem}` : ''}
                          </span>
                        </div>
                        <IconButton name="edit" label={`Editar ${template.nome}`} onClick={() => setEditing(template)} />
                        <IconButton name="trash" label={`Excluir ${template.nome}`} onClick={() => setRemoving(template)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="copy"
              title="Nenhum modelo salvo"
              description="Modelos aceleram a emissão sem tirar sua decisão do caminho — o conteúdo clínico é sempre seu. O painel anterior tinha três modelos que podem ser importados para revisão."
              action={
                <Button size="sm" icon="download" onClick={() => setImporting(true)}>
                  Ver modelos do painel anterior
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>

      <TemplateEditor
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />

      <ImportLegacyModal
        open={importing}
        onClose={() => setImporting(false)}
        onImport={importLegacy}
      />

      <ConfirmDialog
        open={!!removing}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await repo.remove(STORES.TEMPLATES, removing.id, 'Excluído pelo usuário');
          setRemoving(null);
          load();
        }}
        title="Excluir este modelo?"
        message={`“${removing?.nome}” deixa de aparecer na emissão. Documentos já emitidos com ele não são afetados.`}
        confirmLabel="Excluir"
      />
    </>
  );
}

function TemplateEditor({ template, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: '', tipo: DOCUMENT_TYPES.PRESCRIPTION, conteudo: '', itens: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!template) return;
    setForm({
      nome: template.nome ?? '',
      tipo: template.tipo ?? DOCUMENT_TYPES.PRESCRIPTION,
      conteudo: template.conteudo ?? '',
      itens: template.itens ?? [],
    });
  }, [template]);

  async function save() {
    if (!form.nome.trim()) { toast.error('Dê um nome ao modelo.'); return; }
    setBusy(true);
    try {
      if (template?.id) await repo.update(STORES.TEMPLATES, template.id, form);
      else await repo.create(STORES.TEMPLATES, form);
      toast.success('Modelo salvo.');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!template}
      onClose={onClose}
      width={540}
      title={template?.id ? 'Editar modelo' : 'Novo modelo'}
      description="Use variáveis como {{paciente.nome}} para que o modelo se adapte a cada criança."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Salvar modelo</Button>
        </>
      }
    >
      <div className="template-form">
        <TextField label="Nome do modelo" required autoFocus
          value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
        <Select
          label="Tipo de documento" value={form.tipo}
          onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          options={Object.values(DOCUMENT_TYPES).map((t) => ({ value: t, label: DOCUMENT_TYPE_LABELS[t] }))}
        />
        <TextArea label="Conteúdo" rows={10}
          value={form.conteudo} onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))} />
      </div>
    </Sheet>
  );
}

function ImportLegacyModal({ open, onClose, onImport }) {
  const [selection, setSelection] = useState(new Set());

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Modelos do painel anterior"
      description="Estes modelos vinham embutidos no sistema antigo. Revise o conteúdo clínico de cada um e importe apenas o que você aprova."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onImport(selection)} disabled={!selection.size}>
            Importar {selection.size || ''}
          </Button>
        </>
      }
    >
      <p className="form-note">
        <Icon name="alert-triangle" size={13} />
        Conteúdo clínico é responsabilidade técnica sua. Nenhum destes modelos foi
        ativado automaticamente — nada é prescrito por padrão pelo sistema.
      </p>

      <ul className="legacy-list">
        {LEGACY_TEMPLATES.map((template) => (
          <li key={template.id}>
            <Checkbox
              label={template.nome}
              description={DOCUMENT_TYPE_LABELS[template.tipo]}
              checked={selection.has(template.id)}
              onChange={(checked) => setSelection((set) => {
                const next = new Set(set);
                if (checked) next.add(template.id); else next.delete(template.id);
                return next;
              })}
            />
            <ol className="legacy-list__items">
              {template.itens.map((item, index) => (
                <li key={index}>
                  <strong>{item.principio}{item.concentracao ? ` — ${item.concentracao}` : ''}</strong>
                  <span>{item.posologia}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
