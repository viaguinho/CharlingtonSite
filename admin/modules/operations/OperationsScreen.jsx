import { useEffect, useMemo, useState, useCallback } from 'react';
import * as repo from '../../data/repository.js';
import { STORES } from '../../data/schema.js';
import { useSession } from '../../core/session.jsx';
import { ROLES, ROLE_LABELS, PLAZAS, PLAZA_LABELS } from '../../core/rbac.js';
import { PageHeader } from '../../components/Shell.jsx';
import { Card, CardHeader, CardBody, EmptyState, Metric, MetricStrip } from '../../components/Card.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Button, Chip, Avatar, StatusDot, IconButton } from '../../components/primitives.jsx';
import { Tabs } from '../../components/Tabs.jsx';
import { Sheet, ConfirmDialog, useToast } from '../../components/Overlay.jsx';
import { TextField, Select, TextArea, Checkbox, FieldRow } from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { date, money, relative } from '../../core/format.js';

/**
 * Operações da clínica: insumos, salas, equipe e profissionais parceiros.
 * É o que mantém a porta aberta — menos glamouroso que o prontuário, e a
 * primeira coisa que trava o atendimento quando falha.
 */
export default function OperationsScreen() {
  const { plaza, user } = useSession();
  const [tab, setTab] = useState('insumos');

  return (
    <>
      <PageHeader
        eyebrow="Rotina"
        title="Operações"
        description={`Estoque, salas, equipe e profissionais parceiros${(user?.plazas?.length ?? 1) > 1 ? ' das duas unidades' : plaza ? ` — ${PLAZA_LABELS[plaza]}` : ''}.`}
        toolbar={
          <Tabs
            variant="segment"
            value={tab}
            onChange={setTab}
            ariaLabel="Seções de operações"
            items={[
              { value: 'insumos', label: 'Insumos', icon: 'package' },
              { value: 'salas', label: 'Salas', icon: 'door' },
              { value: 'equipe', label: 'Equipe', icon: 'users' },
            ]}
          />
        }
      />

      {tab === 'insumos' ? <SuppliesTab plaza={plaza} /> : null}
      {tab === 'salas' ? <RoomsTab plaza={plaza} /> : null}
      {tab === 'equipe' ? <TeamTab plaza={plaza} /> : null}
    </>
  );
}

/* ═══════════════════════════ Insumos ═══════════════════════════ */

function SuppliesTab({ plaza }) {
  const toast = useToast();
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSupplies(await repo.list(STORES.SUPPLIES, { where: plaza ? { praca: plaza } : {} }).catch(() => []));
    setLoading(false);
  }, [plaza]);

  useEffect(() => { load(); }, [load]);

  const low = supplies.filter((s) => Number(s.estoque) <= Number(s.minimo));
  const [onlyLow, setOnlyLow] = useState(false);
  const expiring = supplies.filter((s) => {
    if (!s.validade) return false;
    const days = (new Date(s.validade) - Date.now()) / 86_400_000;
    return days < 60;
  });

  const columns = [
    {
      key: 'nome', label: 'Insumo', sortable: true,
      render: (row) => (
        <span className="table__primary-text">
          <strong>{row.nome}</strong>
          <span>{row.unidade || 'unidade'}{row.fornecedor ? ` · ${row.fornecedor}` : ''}</span>
        </span>
      ),
    },
    {
      key: 'estoque', label: 'Estoque', width: 220, sortable: true,
      // Sem barra: cada insumo tem unidade e mínimo próprios, e uma coluna de
      // barras sugere uma escala comum que não existe — 3 martelos apareciam
      // "mais cheios" que 12 litros de álcool. A situação é dita em palavras,
      // relativa ao mínimo de cada item.
      render: (row) => {
        const stock = Number(row.estoque) || 0;
        const min = Number(row.minimo) || 0;
        // Uma cor por conceito: "abaixo do mínimo" é âmbar aqui, no aviso e no
        // indicador. Acima do mínimo é o normal e fica neutro.
        const [tone, situation] = stock <= min ? ['warning', 'abaixo do mínimo']
          : stock <= min * 1.5 ? ['neutral', 'perto do mínimo']
          : ['muted', 'acima do mínimo'];
        return (
          <div className="supply-level">
            <span className="supply-level__qty">
              <strong className="num">{stock}</strong> {unitLabel(row.unidade || 'unidade', stock)}
            </span>
            {tone === 'muted'
              ? <span className="supply-level__ok">{situation}</span>
              : <StatusDot tone={tone} label={situation} />}
          </div>
        );
      },
    },
    { key: 'minimo', label: 'Mínimo', width: 90, align: 'right', hideBelow: 900,
      render: (row) => <span className="num">{row.minimo}</span> },
    { key: 'validade', label: 'Validade', width: 130, hideBelow: 1200,
      render: (row) => row.validade
        ? <span title={date(row.validade)}>{relative(row.validade)}</span>
        : <span className="muted">—</span> },
  ];

  return (
    <>
      <MetricStrip>
        <Metric featured label="Abaixo do mínimo" value={low.length} tone={low.length ? 'warning' : undefined}
          target={low.length ? 'Reposição necessária' : 'Estoque em dia'} />
        <Metric label="Itens cadastrados" value={supplies.length} />
        {/* Sem validade cadastrada não há como afirmar "0 vencendo". */}
        <Metric
          label="Vencendo em 60 dias"
          value={supplies.some((s) => s.validade) ? expiring.length : '—'}
          // Sem dado, o estado vazio completo: ícone, frase e a ação que cria o dado.
          target={supplies.some((s) => s.validade) || !supplies.length ? undefined : (
            <span className="metric__empty">
              <Icon name="clock" size={13} />
              Nenhum item com validade.{' '}
              <button type="button" className="link-button" onClick={() => setEditing(supplies[0])}>Cadastrar validade</button>
            </span>
          )}
        />
      </MetricStrip>

      <div style={{ height: 'var(--gutter)' }} />

      {low.length ? (
        <>
          <div className="ops-alert">
            <Icon name="alert-triangle" size={15} />
            <p>
              <strong>{low.length} {low.length === 1 ? 'item abaixo' : 'itens abaixo'} do estoque mínimo:</strong>{' '}
              {low.map((s) => s.nome).join(', ')}.
            </p>
            <Button size="sm" onClick={() => setOnlyLow((v) => !v)}>{onlyLow ? 'Ver todos os itens' : 'Ver só esses'}</Button>
          </div>
          <div style={{ height: 'var(--gutter)' }} />
        </>
      ) : null}

      <Card variant="flush">
        <CardHeader
          title="Estoque"
          subtitle={onlyLow && low.length ? `${low.length} de ${supplies.length} itens · só abaixo do mínimo` : undefined}
          actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setEditing({})}>Novo insumo</Button>}
        />
        <DataTable
          columns={columns}
          rows={onlyLow && low.length ? low : supplies}
          loading={loading}
          density="compact"
          caption="Estoque de insumos"
          onRowClick={setEditing}
          emptyState={
            <EmptyState
              icon="package"
              title="Nenhum insumo cadastrado"
              description="Cadastre o que a clínica consome para receber alerta antes de acabar."
              action={<Button size="sm" icon="plus" onClick={() => setEditing({})}>Cadastrar insumo</Button>}
            />
          }
        />
      </Card>

      <SupplyForm
        supply={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </>
  );
}

function SupplyForm({ supply, onClose, onSaved }) {
  const { plaza, user } = useSession();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  // Mantemos o form durante a animação de saída — ver nota em EntryForm.
  useEffect(() => {
    if (!supply) return;
    setForm({
      id: supply.id ?? null,
      nome: supply.nome ?? '', unidade: supply.unidade ?? '', estoque: supply.estoque ?? 0,
      minimo: supply.minimo ?? 0, validade: supply.validade ?? '', fornecedor: supply.fornecedor ?? '',
    });
  }, [supply]);

  if (!form) return null;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function save() {
    if (!form.nome.trim()) { toast.error('Informe o nome do insumo.'); return; }
    setBusy(true);
    try {
      const { id, ...values } = form;
      const payload = { ...values, estoque: Number(values.estoque), minimo: Number(values.minimo) };
      if (id) await repo.update(STORES.SUPPLIES, id, payload);
      else await repo.create(STORES.SUPPLIES, payload);
      toast.success('Insumo salvo.');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!supply}
      onClose={onClose}
      width={420}
      title={form.id ? 'Editar insumo' : 'Novo insumo'}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Salvar</Button>
        </>
      }
    >
      <div className="entry-form">
        <TextField label="Nome" required autoFocus value={form.nome} onChange={set('nome')} />
        <FieldRow>
          <TextField label="Estoque atual" type="number" min="0" value={form.estoque} onChange={set('estoque')} />
          <TextField label="Estoque mínimo" type="number" min="0" value={form.minimo} onChange={set('minimo')} />
        </FieldRow>
        <FieldRow>
          <TextField label="Unidade" placeholder="caixa, par, frasco" value={form.unidade} onChange={set('unidade')} />
          <TextField label="Validade" type="date" value={form.validade} onChange={set('validade')} />
        </FieldRow>
        <TextField label="Fornecedor" value={form.fornecedor} onChange={set('fornecedor')} />
      </div>
    </Sheet>
  );
}

/* ═══════════════════════════ Salas ═══════════════════════════ */

function RoomsTab({ plaza }) {
  const { user } = useSession();
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setRooms(await repo.list(STORES.ROOMS, { where: plaza ? { praca: plaza } : {} }).catch(() => []));
  }, [plaza]);

  useEffect(() => { load(); }, [load]);

  const available = rooms.filter((r) => r.status === 'disponivel').length;
  const maintenance = rooms.filter((r) => r.status === 'manutencao');

  return (
    <>
      <MetricStrip>
        <Metric
          featured
          label="Salas disponíveis"
          value={available}
          denominator={rooms.length || null}
          target={maintenance.length ? `${maintenance.map((r) => r.nome).join(', ')} em manutenção — fora da agenda` : 'Todas em uso normal'}
        />
        <Metric label="Em manutenção" value={maintenance.length} tone={maintenance.length ? 'warning' : undefined} />
      </MetricStrip>

      {maintenance.length ? (
        <>
          <div style={{ height: 'var(--gutter)' }} />
          <div className="ops-alert" role="status">
            <Icon name="alert-triangle" size={15} />
            <p>
              <strong>{maintenance.map((r) => r.nome).join(', ')} em manutenção.</strong>{' '}
              Enquanto estiver assim, a agenda não oferece horário nessa sala.
            </p>
            <Button size="sm" onClick={() => setEditing(maintenance[0])}>Atualizar situação</Button>
          </div>
        </>
      ) : null}

      <div style={{ height: 'var(--gutter)' }} />

      <Card variant="flush">
        <CardHeader
          title="Salas e recursos"
          subtitle={rooms.length ? `${rooms.length} salas` : undefined}
          actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setEditing({})}>Nova sala</Button>}
        />
        <CardBody>
          {rooms.length ? (
            <div className="rooms">
              {rooms.map((room) => (
                <article key={room.id} className="room-card">
                  <span className="room-card__icon"><Icon name="door" size={18} /></span>
                  <div className="room-card__text">
                    <strong>{room.nome}</strong>
                    <span>{PLAZA_LABELS[room.praca] ?? '—'}</span>
                  </div>
                  <StatusDot
                    tone={room.status === 'disponivel' ? 'success' : room.status === 'manutencao' ? 'warning' : 'neutral'}
                    label={room.status === 'disponivel' ? 'Disponível' : room.status === 'manutencao' ? 'Manutenção' : 'Ocupada'}
                  />
                  <IconButton name="edit" label={`Editar ${room.nome}`} onClick={() => setEditing(room)} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="door"
              title="Nenhuma sala cadastrada"
              description="A agenda precisa de ao menos uma sala por unidade para alocar os atendimentos."
              action={<Button size="sm" icon="plus" onClick={() => setEditing({})}>Cadastrar sala</Button>}
            />
          )}
        </CardBody>
      </Card>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        width={400}
        title={editing?.id ? 'Editar sala' : 'Nova sala'}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!editing.nome?.trim()) { toast.error('Informe o nome da sala.'); return; }
                const payload = { nome: editing.nome.trim(), status: editing.status ?? 'disponivel', recursos: [] };
                if (editing.id) await repo.update(STORES.ROOMS, editing.id, payload);
                else await repo.create(STORES.ROOMS, payload);
                toast.success('Sala salva.');
                setEditing(null);
                load();
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="entry-form">
            <TextField
              label="Nome da sala" required autoFocus
              value={editing.nome ?? ''}
              onChange={(e) => setEditing((r) => ({ ...r, nome: e.target.value }))}
            />
            <Select
              label="Situação"
              value={editing.status ?? 'disponivel'}
              onChange={(e) => setEditing((r) => ({ ...r, status: e.target.value }))}
              options={[
                { value: 'disponivel', label: 'Disponível' },
                { value: 'ocupada', label: 'Ocupada' },
                { value: 'manutencao', label: 'Em manutenção' },
              ]}
            />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

/* ═══════════════════════════ Equipe ═══════════════════════════ */

function TeamTab({ plaza }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [u, p] = await Promise.all([
      repo.list(STORES.USERS).catch(() => []),
      repo.list(STORES.PROFESSIONALS, { where: plaza ? { praca: plaza } : {} }).catch(() => []),
    ]);
    setUsers(u);
    setProfessionals(p);
  }, [plaza]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="bento">
        <Card span={6} variant="flush">
          <CardHeader title="Usuários do sistema" subtitle={`${users.length} ${users.length === 1 ? 'conta' : 'contas'}`} />
          <CardBody>
            {users.length ? (
              <ul className="team">
                {users.map((member) => (
                  <li key={member.id}>
                    <Avatar name={member.nome} src={member.foto} size={36} />
                    <span className="team__text">
                      <strong>{member.nome}</strong>
                      <span>{member.email}</span>
                    </span>
                    <Chip tone="neutral">{ROLE_LABELS[member.role] ?? member.role}</Chip>
                    <StatusDot
                      tone={member.mfaAtivo ? 'success' : 'warning'}
                      label={member.mfaAtivo ? 'MFA ativo' : 'Sem MFA'}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="users" title="Nenhum usuário" compact />
            )}
          </CardBody>
        </Card>

        <Card span={6} variant="flush">
          <CardHeader
            title="Profissionais parceiros"
            subtitle="Terapeutas com repasse"
            actions={<Button size="sm" variant="primary" icon="plus" onClick={() => setEditing({})}>Cadastrar</Button>}
          />
          <CardBody>
            {professionals.length ? (
              <ul className="team">
                {professionals.map((professional) => (
                  <li key={professional.id}>
                    <Avatar name={professional.nome} size={36} tone="ink" />
                    <span className="team__text">
                      <strong>{professional.nome}</strong>
                      <span>{professional.especialidade}</span>
                    </span>
                    <Chip tone="info">
                      {professional.regime === 'percentual' ? `${professional.percentual}%` : money(professional.valorFixo)}
                    </Chip>
                    <IconButton name="edit" label={`Editar ${professional.nome}`} onClick={() => setEditing(professional)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="stethoscope"
                title="Nenhum profissional parceiro"
                description="Terapeutas ocupacionais, fonoaudiólogos e psicólogos com repasse são cadastrados aqui."
                compact
              />
            )}
          </CardBody>
        </Card>
      </div>

      <ProfessionalForm
        professional={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </>
  );
}

function ProfessionalForm({ professional, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  // Mantemos o form durante a animação de saída — ver nota em EntryForm.
  useEffect(() => {
    if (!professional) return;
    setForm({
      id: professional.id ?? null,
      nome: professional.nome ?? '', especialidade: professional.especialidade ?? '',
      regime: professional.regime ?? 'percentual', percentual: professional.percentual ?? 50,
      valorFixo: professional.valorFixo ?? '', telefone: professional.telefone ?? '',
      email: professional.email ?? '',
    });
  }, [professional]);

  if (!form) return null;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function save() {
    if (!form.nome.trim()) { toast.error('Informe o nome.'); return; }
    setBusy(true);
    try {
      const { id, ...values } = form;
      if (id) await repo.update(STORES.PROFESSIONALS, id, values);
      else await repo.create(STORES.PROFESSIONALS, values);
      toast.success('Profissional salvo.');
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!professional}
      onClose={onClose}
      width={420}
      title={form.id ? 'Editar profissional' : 'Novo profissional'}
      description="Dados bancários são cadastrados separadamente e exigem reautenticação para serem vistos."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={busy}>Salvar</Button>
        </>
      }
    >
      <div className="entry-form">
        <TextField label="Nome" required autoFocus value={form.nome} onChange={set('nome')} />
        <TextField label="Especialidade" placeholder="Terapia ocupacional, fonoaudiologia…"
          value={form.especialidade} onChange={set('especialidade')} />
        <Select
          label="Regime de repasse" value={form.regime} onChange={set('regime')}
          options={[
            { value: 'percentual', label: 'Percentual sobre o atendimento' },
            { value: 'fixo', label: 'Valor fixo por sessão' },
          ]}
        />
        {form.regime === 'percentual' ? (
          <TextField label="Percentual" type="number" min="0" max="100" suffix="%"
            value={form.percentual} onChange={set('percentual')} />
        ) : (
          <TextField label="Valor por sessão" type="number" min="0" step="0.01" suffix="R$"
            value={form.valorFixo} onChange={set('valorFixo')} />
        )}
        <FieldRow>
          <TextField label="Telefone" value={form.telefone} onChange={set('telefone')} />
          <TextField label="E-mail" type="email" value={form.email} onChange={set('email')} />
        </FieldRow>
      </div>
    </Sheet>
  );
}

/** "2 rolos", "1 caixa", "12 litros" — a unidade concorda com a quantidade. */
function unitLabel(unit, quantity) {
  if (quantity === 1 || /s$/i.test(unit) || /\s/.test(unit)) return unit;
  return /[aeiou]$/i.test(unit) ? `${unit}s` : unit;
}
