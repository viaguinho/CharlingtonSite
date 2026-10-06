import { useEffect, useMemo, useState } from 'react';
import * as repo from '../../data/repository.js';
import * as audit from '../../core/audit.js';
import { useSession } from '../../core/session.jsx';
import { ROLE_LABELS, PLAZA_LABELS } from '../../core/rbac.js';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip } from '../../components/Card.jsx';
import { DataTable, TableToolbar } from '../../components/DataTable.jsx';
import { Button, Chip, StatusDot } from '../../components/primitives.jsx';
import { TextField, Select } from '../../components/Field.jsx';
import { useToast } from '../../components/Overlay.jsx';
import Icon from '../../components/Icon.jsx';
import { dateTime, relative } from '../../core/format.js';

/**
 * Auditoria.
 *
 * Cada registro carrega o hash do anterior. Alterar ou apagar uma linha
 * quebra a cadeia a partir dali — e a verificação de integridade encontra
 * exatamente onde. Não impede adulteração; impede adulteração silenciosa,
 * que é o que a LGPD (art. 37) e o CFM exigem.
 */

const ACTION_LABELS = {
  LOGIN: 'Entrada no sistema',
  LOGIN_FAIL: 'Tentativa de entrada falhou',
  LOGOUT: 'Saída',
  SESSION_EXPIRED: 'Sessão expirada por inatividade',
  STEP_UP: 'Reautenticação para ação sensível',
  CREATE: 'Criação',
  READ: 'Leitura',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
  SIGN: 'Assinatura de documento',
  PRINT: 'Impressão',
  SEND: 'Envio',
  EXPORT: 'Exportação de dados',
  IMPORT: 'Importação',
  PERMISSION_CHANGE: 'Alteração de permissão',
  CONSENT_GIVEN: 'Consentimento concedido',
  CONSENT_REVOKED: 'Consentimento revogado',
  INTEGRITY_CHECK: 'Verificação de integridade',
};

/** Toda store nova (schema.js) precisa entrar aqui no singular e com acento. */
const ENTITY_LABELS = {
  clinica: 'Clínica',
  usuarios: 'Usuário',
  pacientes: 'Paciente',
  responsaveis: 'Responsável',
  profissionais: 'Profissional',
  agendamentos: 'Agendamento',
  atendimentos: 'Atendimento',
  evolucoes: 'Evolução clínica',
  escalas: 'Escala',
  marcos: 'Marco do desenvolvimento',
  medicacoes: 'Medicação',
  anamneses: 'Anamnese',
  documentos: 'Documento',
  templates: 'Modelo de documento',
  anexos: 'Arquivo de anexo',
  anexosBinarios: 'Anexo binário',
  mensagens: 'Mensagem',
  automacoes: 'Automação',
  lancamentos: 'Lançamento financeiro',
  repasses: 'Repasse',
  insumos: 'Insumo',
  salas: 'Sala',
  bloqueios: 'Bloqueio de agenda',
  consentimentos: 'Consentimento',
  auditoria: 'Log de auditoria',
  meta: 'Configuração interna',
};

export default function AuditScreen() {
  const { can } = useSession();
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [integrity, setIntegrity] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await repo.allAudit().catch(() => []);
      setEntries(list.reverse());
      setLoading(false);
    })();
  }, []);

  // O log cresce sem limite (722 eventos em três meses de base): a tabela
  // mostra os mais recentes e o leitor pede mais quando precisa.
  const PAGE = 100;
  const [shown, setShown] = useState(PAGE);
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => action === 'all' || e.acao === action)
      .filter((e) => !q || `${e.usuarioId ?? ''} ${e.acao} ${e.entidade ?? ''} ${e.detalhe ?? ''}`.toLowerCase().includes(q));
  }, [entries, query, action]);
  useEffect(() => { setShown(PAGE); }, [query, action]);
  const rows = matched.slice(0, shown);

  const risky = matched.filter((e) => e.risco);

  async function verify() {
    setVerifying(true);
    try {
      const result = await audit.verifyChain();
      setIntegrity(result);
      if (result.valid) toast.success(`Cadeia íntegra — ${result.checked} registros verificados.`);
      else toast.error('A cadeia de auditoria foi rompida. Veja os detalhes abaixo.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setVerifying(false);
    }
  }

  const columns = [
    {
      key: 'timestamp', label: 'Quando', width: 190, sortable: true,
      render: (row) => (
        <span className="table__primary-text">
          <strong style={{ fontWeight: 'var(--w-regular)' }}>{new Date(row.timestamp).toLocaleString('pt-BR')}</strong>
          <span>{relative(row.timestamp)}</span>
        </span>
      ),
    },
    {
      key: 'acao', label: 'Operação',
      render: (row) => (
        <span className="audit-action">
          {row.risco ? <Icon name="alert-triangle" size={13} className="audit-action__risk" /> : null}
          {ACTION_LABELS[row.acao] ?? row.acao}
          {row.entidade ? <Chip tone="neutral">{ENTITY_LABELS[row.entidade] ?? 'Registro do sistema'}</Chip> : null}
        </span>
      ),
    },
    {
      key: 'papel', label: 'Quem', width: 180, hideBelow: 900,
      render: (row) => (
        <span className="table__primary-text">
          <strong style={{ fontWeight: 'var(--w-regular)' }}>{ROLE_LABELS[row.papel] ?? row.papel ?? 'sistema'}</strong>
          <span>{PLAZA_LABELS[row.praca] ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'detalhe', label: 'Detalhe', hideBelow: 1200,
      render: (row) => {
        let text = row.camposAlterados?.length ? row.camposAlterados.join(', ') : row.detalhe;
        if (!text) {
          text = row.entidade && row.entidadeId 
            ? `${ENTITY_LABELS[row.entidade]?.toLowerCase() ?? 'registro'} ${row.entidadeId.slice(0, 6)}…`
            : '—';
        }
        return (
          <span className="muted small">
            {text}
          </span>
        );
      },
    },
    {
      key: 'hash', label: 'Elo', width: 110, align: 'right', hideBelow: 1200,
      render: (row) => <code className="audit-hash">{row.hash?.slice(0, 8) ?? '—'}</code>,
    },
  ];

  if (!can.read('audit')) {
    return (
      <Card>
        <EmptyState icon="lock" title="Acesso restrito" description="O log de auditoria é visível apenas para administradores." />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Governança"
        title="Auditoria"
        description="Registro imutável e encadeado de tudo o que acontece no painel — inclusive de quem leu qual prontuário."
        actions={
          <Button icon="shield" onClick={verify} loading={verifying}>Verificar integridade</Button>
        }
      />

      <MetricStrip>
        <Metric
          featured
          label={query || action !== 'all' ? 'Eventos no recorte' : 'Eventos registrados'}
          value={matched.length}
          target={matched.length > rows.length
            ? `mostrando os ${rows.length} mais recentes`
            : `${rows.length === 1 ? 'o único' : 'todos'} na tela`}
        />
        <Metric
          label="Eventos de risco"
          value={risky.length}
          tone={risky.length ? 'accent' : undefined}
          target="exclusão, exportação, alteração de permissão e falha de entrada"
        />
        <Metric
          label="Integridade"
          value={integrity ? (integrity.valid ? 'Íntegra' : 'Rompida') : 'Não verificada'}
        />
      </MetricStrip>

      <div style={{ height: 'var(--gutter)' }} />

      {integrity ? (
        <>
          <div className={`integrity ${integrity.valid ? 'is-valid' : 'is-broken'}`}>
            <Icon name={integrity.valid ? 'shield' : 'alert-triangle'} size={18} />
            <div>
              <strong>
                {integrity.valid
                  ? `Cadeia íntegra — ${integrity.checked} registros verificados`
                  : 'A cadeia de auditoria foi rompida'}
              </strong>
              <p>
                {integrity.valid
                  ? 'Nenhum registro foi alterado ou removido desde a gravação. Cada entrada confere com o hash do registro anterior.'
                  : `${integrity.reason} Primeiro registro afetado: ${integrity.brokenAt ? dateTime(integrity.brokenAt.timestamp) : '—'}. Preserve o estado atual e acione o responsável técnico.`}
              </p>
            </div>
          </div>
          <div style={{ height: 'var(--gutter)' }} />
        </>
      ) : null}

      <Card variant="flush">
        <TableToolbar>
          <TextField
            icon="search"
            placeholder="Buscar por operação, entidade ou detalhe…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar no log"
            className="patients__search"
          />
          <span className="spacer" />
          <Select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filtrar por operação"
            options={[
              { value: 'all', label: 'Todas as operações' },
              ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          density="compact"
          caption="Log de auditoria"
          emptyState={
            <EmptyState
              icon="shield"
              title={query || action !== 'all' ? 'Nenhum evento encontrado' : 'Nenhum evento registrado'}
              description={query || action !== 'all'
                ? (action !== 'all' && !query && matched.length === 0
                  ? `Nenhum evento de «${ACTION_LABELS[action]}». O log tem ${entries.length} eventos de outras operações.`
                  : 'Ajuste a busca ou o filtro.')
                : 'O log começa a se preencher a partir do primeiro acesso ao sistema.'}
            />
          }
        />
        {matched.length > rows.length ? (
          <div className="card-subsection">
            <p className="chart__note">
              Mostrando os {rows.length} eventos mais recentes de {matched.length}.{' '}
              <button type="button" className="link-button" onClick={() => setShown((n) => n + PAGE)}>
                Ver mais {Math.min(PAGE, matched.length - rows.length)}
              </button>
            </p>
          </div>
        ) : null}
      </Card>

      <p className="audit-note">
        <Icon name="info" size={13} />
        Valores de campos sensíveis (CPF, evolução clínica, dados bancários) nunca
        entram no log — apenas o nome do campo que foi alterado. O log registra o
        que aconteceu, não reproduz o conteúdo do prontuário.
      </p>
    </>
  );
}
