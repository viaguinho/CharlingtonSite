import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import { STORES, RETENTION_YEARS, CONSENT_PURPOSE_LABELS } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { ROLES, ROLE_LABELS, PLAZAS, PLAZA_LABELS, NAVIGATION, levelFor, ACCESS } from '../../core/rbac.js';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric } from '../../components/Card.jsx';
import { Button, Chip, StatusDot, Avatar, IconButton } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Modal, ConfirmDialog, useToast } from '../../components/Overlay.jsx';
import { TextField, Select, Switch, FieldRow } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { money, date, fileSize } from '../../core/format.js';

/**
 * Configurações e governança.
 *
 * Quatro áreas: identidade da clínica, usuários e permissões, integrações e
 * LGPD. A aba de integrações é onde mora a diferença mais importante entre
 * este painel e o anterior: aqui se vê o STATUS de uma credencial, nunca o
 * valor dela.
 */
export default function SettingsScreen() {
  const { can } = useSession();
  const [tab, setTab] = useState('clinica');

  if (!can.read('settings')) {
    return (
      <Card>
        <EmptyState icon="lock" title="Acesso restrito" description="As configurações são visíveis apenas para administradores." />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Identidade da clínica, acessos, integrações e conformidade com a LGPD."
        toolbar={
          <Tabs
            variant="segment"
            value={tab}
            onChange={setTab}
            ariaLabel="Seções de configuração"
            items={[
              { value: 'clinica', label: 'Clínica', icon: 'stethoscope' },
              { value: 'acessos', label: 'Acessos', icon: 'key' },
              { value: 'integracoes', label: 'Integrações', icon: 'link' },
              { value: 'lgpd', label: 'LGPD', icon: 'shield' },
            ]}
          />
        }
      />

      {tab === 'clinica' ? <ClinicTab /> : null}
      {tab === 'acessos' ? <AccessTab /> : null}
      {tab === 'integracoes' ? <IntegrationsTab /> : null}
      {tab === 'lgpd' ? <LgpdTab /> : null}
    </>
  );
}

/* ═══════════════════════════ Clínica ═══════════════════════════ */

function ClinicTab() {
  const toast = useToast();
  const [clinic, setClinic] = useState(null);
  const [params, setParams] = useState({ duracaoPadrao: 60, duracaoPrimeira: 90 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [list, stored] = await Promise.all([
        repo.list(STORES.CLINIC).catch(() => []),
        repo.getMeta('parametros').catch(() => null),
      ]);
      setClinic(list[0] ?? null);
      if (stored) setParams(stored);
    })();
  }, []);

  async function save() {
    setBusy(true);
    try {
      if (clinic?.id) await repo.update(STORES.CLINIC, clinic.id, clinic);
      await repo.setMeta('parametros', params);
      toast.success('Configurações salvas.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!clinic) {
    return (
      <Card>
        <EmptyState icon="stethoscope" title="Clínica não configurada" description="Conclua o assistente de configuração inicial." />
      </Card>
    );
  }

  return (
    <div className="bento">
      <Card span={7}>
        <CardHeader title="Identidade" eyebrow="Dados da clínica" />
        <CardBody>
          <div className="entry-form">
            <TextField
              label="Razão social" value={clinic.razaoSocial ?? ''}
              onChange={(e) => setClinic((c) => ({ ...c, razaoSocial: e.target.value }))}
            />
            <TextField
              label="Nome fantasia" value={clinic.nomeFantasia ?? ''}
              onChange={(e) => setClinic((c) => ({ ...c, nomeFantasia: e.target.value }))}
            />
            <FieldRow>
              <TextField
                label="CNPJ" value={clinic.cnpj ?? ''}
                onChange={(e) => setClinic((c) => ({ ...c, cnpj: e.target.value }))}
              />
              <TextField
                label="CRM do responsável técnico"
                value={clinic.responsavelTecnico?.crm ?? ''}
                onChange={(e) => setClinic((c) => ({
                  ...c, responsavelTecnico: { ...c.responsavelTecnico, crm: e.target.value },
                }))}
              />
            </FieldRow>
          </div>
        </CardBody>
      </Card>

      <Card span={5}>
        <CardHeader title="Atendimento" eyebrow="Parâmetros padrão" />
        <CardBody>
          <div className="entry-form">
            <TextField
              label="Duração do retorno" type="number" suffix="min"
              value={params.duracaoPadrao}
              onChange={(e) => setParams((p) => ({ ...p, duracaoPadrao: Number(e.target.value) }))}
            />
            <TextField
              label="Duração da primeira consulta" type="number" suffix="min"
              value={params.duracaoPrimeira}
              onChange={(e) => setParams((p) => ({ ...p, duracaoPrimeira: Number(e.target.value) }))}
            />
          </div>
        </CardBody>
      </Card>

      <Card span={12} className="bento-full">
        <CardHeader
          title="Papel timbrado"
          eyebrow="Documentos clínicos"
          subtitle="Cada unidade cadastrada pode ter seu próprio timbrado. O preview no editor usa o arquivo da unidade em uso."
        />
        <CardBody>
          <div className="letterheads">
            {(clinic.plazas ?? []).map((plaza) => (
              <div key={plaza} className="letterhead-slot">
                <span className="letterhead-slot__label">{PLAZA_LABELS[plaza]}</span>
                <div className="letterhead-slot__preview">
                  <Icon name="file-text" size={22} />
                </div>
                <Button size="sm" icon="upload">Enviar timbrado</Button>
              </div>
            ))}
          </div>
          <p className="form-note">
            <Icon name="info" size={13} />
            O timbrado atual de Campinas está preservado do painel anterior. Fortaleza
            usa o mesmo arquivo até que um próprio seja enviado.
          </p>
        </CardBody>
      </Card>

      <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={save} loading={busy}>Salvar configurações</Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Acessos ═══════════════════════════ */

function AccessTab() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    repo.list(STORES.USERS).then(setUsers).catch(() => setUsers([]));
  }, []);

  const matrix = useMemo(() => NAVIGATION.map((item) => ({
    resource: item.resource,
    label: item.label,
    levels: Object.values(ROLES).map((role) => ({ role, level: levelFor(role, item.resource) })),
  })), []);

  return (
    <div className="bento">
      <Card span={12} className="bento-full" variant="flush">
        <CardHeader title="Usuários" subtitle={`${users.length} contas ativas`} />
        <CardBody>
          {users.length ? (
            <ul className="team">
              {users.map((user) => (
                <li key={user.id}>
                  <Avatar name={user.nome} src={user.foto} size={36} />
                  <span className="team__text">
                    <strong>{user.nome}</strong>
                    <span>{user.email}</span>
                  </span>
                  <Chip tone="neutral">{ROLE_LABELS[user.role] ?? user.role}</Chip>
                  <span className="team__plazas">
                    {(user.plazas ?? []).map((p) => (
                      <Chip key={p} tone="info">{PLAZA_LABELS[p]?.split(' / ')[0]}</Chip>
                    ))}
                  </span>
                  <StatusDot
                    tone={user.mfaAtivo ? 'success' : 'danger'}
                    label={user.mfaAtivo ? 'MFA ativo' : 'MFA pendente'}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="users" title="Nenhum usuário cadastrado" compact />
          )}
        </CardBody>
      </Card>

      <Card span={12} className="bento-full">
        <CardHeader
          title="Matriz de permissões"
          eyebrow="RBAC"
          subtitle="Negação por padrão: o que não está explicitamente liberado, está bloqueado."
        />
        <CardBody>
          <div className="table-wrap">
            <table className="table matrix">
              <thead>
                <tr>
                  <th scope="col">Recurso</th>
                  {Object.values(ROLES).map((role) => (
                    <th key={role} scope="col" style={{ textAlign: 'center' }}>{ROLE_LABELS[role]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.resource}>
                    <th scope="row">{row.label}</th>
                    {row.levels.map(({ role, level }) => (
                      <td key={role} style={{ textAlign: 'center' }}>
                        <AccessMark level={level} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="form-note">
            <Icon name="shield" size={13} />
            Esta matriz é aplicada no servidor, nas políticas Row Level Security do
            banco. A interface apenas reflete o que o banco já decide — esconder um
            botão nunca é a fronteira de segurança.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function AccessMark({ level }) {
  if (level >= ACCESS.FULL) return <Icon name="check" size={15} className="matrix__full" title="Acesso total" />;
  if (level >= ACCESS.WRITE) return <Icon name="edit" size={14} className="matrix__write" title="Leitura e escrita" />;
  if (level >= ACCESS.READ) return <Icon name="eye" size={14} className="matrix__read" title="Somente leitura" />;
  return <Icon name="minus" size={13} className="matrix__none" title="Sem acesso" />;
}

/* ═══════════════════════════ Integrações ═══════════════════════════ */

const INTEGRATIONS = [
  {
    id: 'supabase',
    nome: 'Servidor (Supabase)',
    icon: 'database',
    descricao: 'Banco de dados com Row Level Security, autenticação com MFA e armazenamento cifrado de anexos.',
    env: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  },
  {
    id: 'birdid',
    nome: 'Bird ID (Soluti)',
    icon: 'signature',
    descricao: 'Assinatura digital em nuvem com certificado ICP-Brasil.',
    bff: 'sign-document',
  },
  {
    id: 'vidaas',
    nome: 'VIDaaS (Valid)',
    icon: 'signature',
    descricao: 'Alternativa de assinatura digital em nuvem.',
    bff: 'sign-document',
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp Cloud API',
    icon: 'whatsapp',
    descricao: 'Confirmações e lembretes por modelo aprovado pela Meta.',
    bff: 'send-whatsapp',
  },
  {
    id: 'email',
    nome: 'E-mail transacional',
    icon: 'mail',
    descricao: 'Envio de documentos por link autenticado e comunicações administrativas.',
    bff: 'send-email',
  },
];

function IntegrationsTab() {
  const { isServerMode } = useSession();

  return (
    <>
      <div className="security-banner">
        <Icon name="lock" size={18} />
        <div>
          <strong>Credenciais não aparecem nesta tela — por desenho.</strong>
          <p>
            Chaves de API, segredos e PINs vivem apenas no servidor da clínica, nas
            Edge Functions que falam com cada provedor. O navegador envia o resumo
            criptográfico do documento e recebe o comprovante da assinatura; a
            credencial nunca passa por aqui. No painel anterior, o segredo do Bird ID
            e o CPF do médico estavam no JavaScript entregue a qualquer visitante.
          </p>
        </div>
      </div>

      <div style={{ height: 'var(--gutter)' }} />

      <div className="bento">
        {INTEGRATIONS.map((integration) => {
          const configured = integration.id === 'supabase' ? isServerMode : isServerMode;
          return (
            <Card key={integration.id} span={6}>
              <CardHeader
                title={integration.nome}
                actions={
                  <StatusDot
                    tone={configured ? 'success' : 'warning'}
                    label={configured ? 'Conectado' : 'Não configurado'}
                  />
                }
              />
              <CardBody>
                <p className="integration__desc">{integration.descricao}</p>
                {integration.env ? (
                  <ul className="integration__env">
                    {integration.env.map((key) => (
                      <li key={key}>
                        <code>{key}</code>
                        <Chip tone={configured ? 'success' : 'neutral'}>
                          {configured ? 'definida' : 'ausente'}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="integration__bff">
                    <Icon name="shield" size={12} />
                    Configurado na Edge Function <code>{integration.bff}</code>, no servidor.
                  </p>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ═══════════════════════════ LGPD ═══════════════════════════ */

function LgpdTab() {
  const toast = useToast();
  const [consents, setConsents] = useState([]);
  const [patients, setPatients] = useState([]);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        repo.list(STORES.CONSENTS).catch(() => []),
        repo.list(STORES.PATIENTS).catch(() => []),
      ]);
      setConsents(c);
      setPatients(p);

      const entries = await Promise.all(
        Object.values(STORES).map(async (store) => [store, await repo.count(store).catch(() => 0)]),
      );
      setCounts(Object.fromEntries(entries));
    })();
  }, []);

  const byPurpose = useMemo(() => {
    const map = new Map();
    for (const consent of consents) {
      if (consent.revogadoEm) continue;
      map.set(consent.finalidade, (map.get(consent.finalidade) ?? 0) + 1);
    }
    return map;
  }, [consents]);

  const revoked = consents.filter((c) => c.revogadoEm);

  return (
    <div className="bento">
      <Card span={7}>
        <CardHeader
          title="Inventário de dados"
          eyebrow="ROPA"
          subtitle="Volume de registros por categoria — base do Registro de Operações de Tratamento."
        />
        <CardBody>
          <ul className="inventory">
            {[
              { store: STORES.PATIENTS, label: 'Pacientes (dado sensível de criança)', retention: RETENTION_YEARS.clinical },
              { store: STORES.GUARDIANS, label: 'Responsáveis legais', retention: RETENTION_YEARS.clinical },
              { store: STORES.NOTES, label: 'Evoluções clínicas', retention: RETENTION_YEARS.clinical },
              { store: STORES.DOCUMENTS, label: 'Documentos emitidos', retention: RETENTION_YEARS.clinical },
              { store: STORES.ATTACHMENTS, label: 'Exames e anexos', retention: RETENTION_YEARS.clinical },
              { store: STORES.ENTRIES, label: 'Lançamentos financeiros', retention: RETENTION_YEARS.financial },
              { store: STORES.MESSAGES, label: 'Mensagens', retention: RETENTION_YEARS.communication },
              { store: STORES.AUDIT, label: 'Log de auditoria', retention: RETENTION_YEARS.audit },
            ].map((row) => (
              <li key={row.store}>
                <span className="inventory__label">{row.label}</span>
                <span className="inventory__count num">{counts[row.store] ?? 0}</span>
                <Chip tone="neutral">guarda {row.retention} anos</Chip>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card span={5}>
        <CardHeader title="Consentimentos" eyebrow="Por finalidade" />
        <CardBody>
          {byPurpose.size ? (
            <ul className="inventory">
              {Array.from(byPurpose.entries()).map(([purpose, count]) => (
                <li key={purpose}>
                  <span className="inventory__label">{CONSENT_PURPOSE_LABELS[purpose] ?? purpose}</span>
                  <span className="inventory__count num">{count}</span>
                </li>
              ))}
              {revoked.length ? (
                <li>
                  <span className="inventory__label">Revogados</span>
                  <span className="inventory__count num">{revoked.length}</span>
                </li>
              ) : null}
            </ul>
          ) : (
            <EmptyState
              icon="shield"
              title="Nenhum consentimento registrado"
              description="Os consentimentos são registrados no prontuário de cada criança."
              compact
            />
          )}
        </CardBody>
      </Card>

      <Card span={12} className="bento-full">
        <CardHeader title="Direitos do titular" eyebrow="Art. 18 da LGPD" />
        <CardBody>
          <div className="rights">
            {[
              { icon: 'eye', title: 'Acesso', desc: 'O responsável pode pedir cópia completa do prontuário da criança.' },
              { icon: 'download', title: 'Portabilidade', desc: 'Exportação em PDF e JSON estruturado, com identidade verificada.' },
              { icon: 'edit', title: 'Correção', desc: 'Dados cadastrais se corrigem; prontuário se corrige por adendo.' },
              { icon: 'trash', title: 'Eliminação', desc: 'Limitada pela guarda legal de 20 anos do prontuário (Res. CFM 1.821/2007).' },
              { icon: 'x', title: 'Revogação', desc: 'Consentimento de comunicação pode ser revogado a qualquer momento.' },
              { icon: 'info', title: 'Informação', desc: 'Com quem os dados são compartilhados e por quê.' },
            ].map((right) => (
              <article key={right.title} className="right-card">
                <span className="right-card__icon"><Icon name={right.icon} size={16} /></span>
                <strong>{right.title}</strong>
                <p>{right.desc}</p>
              </article>
            ))}
          </div>

          <p className="form-note">
            <Icon name="shield" size={13} />
            Toda solicitação de titular deve ser registrada e respondida em até 15 dias.
            O atendimento ao pedido gera evento de auditoria com a identidade de quem
            solicitou e de quem atendeu.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
