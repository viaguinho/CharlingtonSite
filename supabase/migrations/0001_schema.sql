-- ============================================================================
-- Gestão Clínica — Dr. Charlington M. Cavalcante
-- Migration 0001 · Esquema
--
-- Rodar no SQL Editor do Supabase, em ordem: 0001 → 0002 → 0003.
--
-- Convenções:
--   · toda tabela tem id uuid, praca, autoria, versão e exclusão lógica;
--   · exclusão é sempre lógica (excluido_em) — prontuário tem guarda legal de
--     20 anos (Res. CFM 1.821/2007) e não pode ser apagado;
--   · o isolamento entre Campinas e Fortaleza é imposto pelas políticas RLS
--     da migration 0002, não pela aplicação.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ————————————————————————————— Tipos —————————————————————————————

create type praca_t as enum ('campinas', 'fortaleza');
create type papel_t as enum ('doctor', 'reception', 'finance', 'admin');
create type paciente_status_t as enum ('ativo', 'inativo', 'alta');
create type agendamento_tipo_t as enum ('primeira', 'retorno', 'teleconsulta', 'procedimento', 'laudo');
create type agendamento_status_t as enum (
  'agendado', 'confirmado', 'aguardando', 'em_atendimento', 'concluido', 'faltou', 'cancelado'
);
create type documento_status_t as enum (
  'rascunho', 'aguardando_assinatura', 'assinado', 'entregue', 'substituido'
);
create type lancamento_tipo_t as enum ('receita', 'despesa');
create type lancamento_status_t as enum ('pendente', 'pago', 'vencido', 'cancelado');
create type canal_t as enum ('whatsapp', 'email');

-- ———————————————————————— Colunas comuns ————————————————————————

create or replace function envelope_columns() returns text language sql immutable as $$
  select '' -- documental: as colunas abaixo são repetidas em cada tabela
$$;

-- ————————————————————————————— Clínica —————————————————————————————

create table clinica (
  id              uuid primary key default gen_random_uuid(),
  razao_social    text not null,
  nome_fantasia   text,
  cnpj            text,
  plazas          praca_t[] not null default '{campinas}',
  responsavel_tecnico jsonb not null default '{}'::jsonb,
  timbrados       jsonb not null default '{}'::jsonb,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ————————————————————————————— Usuários —————————————————————————————
-- A senha vive em auth.users (Supabase Auth, hash Argon2id). Esta tabela
-- guarda apenas o perfil de aplicação.

create table usuarios (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users (id) on delete set null,
  nome          text not null,
  email         text not null unique,
  role          papel_t not null default 'reception',
  plazas        praca_t[] not null default '{}',
  crm           text,
  foto          text,
  mfa_ativo     boolean not null default false,
  status        text not null default 'ativo',
  ultimo_acesso timestamptz,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Responsáveis ————————————————————————————

create table responsaveis (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  nome          text not null,
  cpf           text,
  parentesco    text,
  telefone      text,
  email         text,
  endereco      jsonb not null default '{}'::jsonb,
  autorizacoes  jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ————————————————————————————— Pacientes —————————————————————————————

create table pacientes (
  id               uuid primary key default gen_random_uuid(),
  praca            praca_t not null,
  nome             text not null,
  nome_social      text,
  data_nascimento  date,
  sexo             text,
  cpf              text,
  cns              text,
  foto_id          text,
  status           paciente_status_t not null default 'ativo',
  responsaveis     uuid[] not null default '{}',
  escola           jsonb not null default '{}'::jsonb,
  convenio         jsonb not null default '{}'::jsonb,
  clinico          jsonb not null default '{}'::jsonb,
  perfil_sensorial jsonb not null default '{}'::jsonb,
  observacoes      text,
  criado_em        timestamptz not null default now(),
  criado_por       uuid,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid,
  versao           integer not null default 1,
  excluido_em      timestamptz,
  excluido_por     uuid,
  motivo_exclusao  text
);

create index on pacientes (praca) where excluido_em is null;
create index on pacientes (status) where excluido_em is null;
-- `to_tsvector(text, text)` é STABLE, não IMMUTABLE: com a configuração
-- passada como string, o nome é resolvido em tempo de execução e o Postgres
-- recusa a expressão num índice. O cast para `regconfig` fixa a configuração
-- na definição do índice e a função passa a ser IMMUTABLE.
create index pacientes_busca_idx on pacientes using gin (
  to_tsvector('portuguese'::regconfig, coalesce(nome, '') || ' ' || coalesce(nome_social, ''))
);

-- ———————————————————————————— Profissionais ————————————————————————————
-- Dados bancários ficam em coluna própria, cifrada em nível de campo pela
-- Edge Function antes de gravar. O cliente nunca recebe o valor em claro.

create table profissionais (
  id             uuid primary key default gen_random_uuid(),
  praca          praca_t,
  nome           text not null,
  especialidade  text,
  regime         text not null default 'percentual',
  percentual     numeric(5,2),
  valor_fixo     numeric(12,2),
  telefone       text,
  email          text,
  dados_bancarios_cifrados bytea,
  criado_em      timestamptz not null default now(),
  criado_por     uuid,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  versao         integer not null default 1,
  excluido_em    timestamptz,
  excluido_por   uuid,
  motivo_exclusao text
);

-- ————————————————————————————— Salas —————————————————————————————

create table salas (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t not null,
  nome          text not null,
  recursos      text[] not null default '{}',
  status        text not null default 'disponivel',
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Agendamentos ————————————————————————————

create table agendamentos (
  id                 uuid primary key default gen_random_uuid(),
  praca              praca_t not null,
  paciente_id        uuid references pacientes (id),
  profissional_id    uuid,
  sala_id            uuid references salas (id),
  inicio             timestamptz not null,
  fim                timestamptz,
  tipo               agendamento_tipo_t not null default 'retorno',
  status             agendamento_status_t not null default 'agendado',
  valor              numeric(12,2),
  origem             text,
  observacoes        text,
  check_in_em        timestamptz,
  inicio_atendimento timestamptz,
  fim_atendimento    timestamptz,
  criado_em          timestamptz not null default now(),
  criado_por         uuid,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid,
  versao             integer not null default 1,
  excluido_em        timestamptz,
  excluido_por       uuid,
  motivo_exclusao    text
);

create index on agendamentos (praca, inicio) where excluido_em is null;
create index on agendamentos (paciente_id) where excluido_em is null;

-- Uma sala não pode ter dois atendimentos sobrepostos.
--
-- `inicio + interval '1 hour'` NÃO serve aqui: somar intervalo a timestamptz é
-- STABLE, não IMMUTABLE — o resultado depende do fuso da sessão por causa do
-- horário de verão — e o Postgres recusa a expressão num índice. A saída é
-- exigir `fim` e usar os dois extremos diretamente, o que também elimina o
-- caso silencioso em que um agendamento sem fim escapava da verificação de
-- conflito.
create extension if not exists btree_gist;

alter table agendamentos
  alter column fim set not null,
  add constraint agendamentos_fim_depois_do_inicio check (fim > inicio);

alter table agendamentos add constraint agendamentos_sem_sobreposicao
  exclude using gist (
    sala_id with =,
    tstzrange(inicio, fim) with &&
  ) where (excluido_em is null and status <> 'cancelado' and sala_id is not null);

create table bloqueios (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t not null,
  motivo        text not null,
  inicio        timestamptz not null,
  fim           timestamptz not null,
  recorrencia   jsonb,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Prontuário ————————————————————————————

create table evolucoes (
  id              uuid primary key default gen_random_uuid(),
  praca           praca_t,
  paciente_id     uuid not null references pacientes (id),
  atendimento_id  uuid references agendamentos (id),
  subjetivo       text,
  objetivo        text,
  avaliacao       text,
  plano           text,
  cid_principal   text,
  cid_secundarios text[] not null default '{}',
  assinada_em     timestamptz,
  assinada_por    uuid,
  travada         boolean not null default false,
  adendos         jsonb not null default '[]'::jsonb,
  criado_em       timestamptz not null default now(),
  criado_por      uuid,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid,
  versao          integer not null default 1,
  excluido_em     timestamptz,
  excluido_por    uuid,
  motivo_exclusao text
);

create index on evolucoes (paciente_id) where excluido_em is null;

-- Evolução assinada é imutável: só `adendos` pode mudar, e nunca para menos.
create or replace function evolucao_imutavel() returns trigger language plpgsql as $$
begin
  if old.travada and old.assinada_em is not null then
    if new.subjetivo is distinct from old.subjetivo
       or new.objetivo is distinct from old.objetivo
       or new.avaliacao is distinct from old.avaliacao
       or new.plano is distinct from old.plano
       or new.cid_principal is distinct from old.cid_principal
       or new.assinada_em is distinct from old.assinada_em then
      raise exception 'Evolução assinada não pode ser alterada. Registre um adendo.';
    end if;
    if jsonb_array_length(new.adendos) < jsonb_array_length(old.adendos) then
      raise exception 'Adendos não podem ser removidos.';
    end if;
  end if;
  return new;
end;
$$;

create trigger evolucao_imutavel_trg before update on evolucoes
  for each row execute function evolucao_imutavel();

create table escalas (
  id              uuid primary key default gen_random_uuid(),
  praca           praca_t,
  paciente_id     uuid not null references pacientes (id),
  instrumento_id  text not null,
  instrumento     text not null,
  escore          numeric(6,2),
  escore_maximo   numeric(6,2),
  interpretacao   text,
  risco           text,
  aplicada_em     date,
  aplicada_por_nome text,
  observacoes     text,
  criado_em       timestamptz not null default now(),
  criado_por      uuid,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid,
  versao          integer not null default 1,
  excluido_em     timestamptz,
  excluido_por    uuid,
  motivo_exclusao text
);

create table marcos (
  id              uuid primary key default gen_random_uuid(),
  praca           praca_t,
  paciente_id     uuid not null references pacientes (id),
  marco_id        text not null,
  marco           text not null,
  dominio         text not null,
  idade_esperada  integer,
  status          text not null default 'nao_avaliado',
  observado_em    timestamptz,
  criado_em       timestamptz not null default now(),
  criado_por      uuid,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid,
  versao          integer not null default 1,
  excluido_em     timestamptz,
  excluido_por    uuid,
  motivo_exclusao text,
  unique (paciente_id, marco_id)
);

create table medicacoes (
  id                uuid primary key default gen_random_uuid(),
  praca             praca_t,
  paciente_id       uuid not null references pacientes (id),
  principio_ativo   text,
  nome              text,
  concentracao      text,
  posologia         text not null,
  iniciada_em       date,
  suspensa_em       timestamptz,
  motivo_suspensao  text,
  observacoes       text,
  criado_em         timestamptz not null default now(),
  criado_por        uuid,
  atualizado_em     timestamptz not null default now(),
  atualizado_por    uuid,
  versao            integer not null default 1,
  excluido_em       timestamptz,
  excluido_por      uuid,
  motivo_exclusao   text
);

create table anamneses (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  paciente_id   uuid not null references pacientes (id),
  token         text not null unique,
  expira_em     timestamptz not null,
  respostas     jsonb,
  preenchido_em timestamptz,
  ip_preenchimento inet,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

create table anexos (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  paciente_id   uuid not null references pacientes (id),
  blob_id       text not null,
  titulo        text not null,
  nome_arquivo  text,
  content_type  text,
  tamanho       bigint,
  origem        text,
  realizado_em  date,
  observacoes   text,
  hash          text,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Documentos ————————————————————————————

create table documentos (
  id                     uuid primary key default gen_random_uuid(),
  praca                  praca_t not null,
  paciente_id            uuid not null references pacientes (id),
  atendimento_id         uuid references agendamentos (id),
  tipo                   text not null,
  titulo                 text,
  conteudo               text,
  itens                  jsonb not null default '[]'::jsonb,
  numero                 text,
  status                 documento_status_t not null default 'rascunho',
  timbrado_id            text,
  hash_conteudo          text,
  assinatura             jsonb not null default '{}'::jsonb,
  substitui_documento_id uuid references documentos (id),
  entregas               jsonb not null default '[]'::jsonb,
  criado_em              timestamptz not null default now(),
  criado_por             uuid,
  atualizado_em          timestamptz not null default now(),
  atualizado_por         uuid,
  versao                 integer not null default 1,
  excluido_em            timestamptz,
  excluido_por           uuid,
  motivo_exclusao        text,
  unique (praca, numero)
);

create index on documentos (paciente_id) where excluido_em is null;
create index on documentos (praca, status) where excluido_em is null;

-- Documento assinado é imutável: só o status pode avançar para entregue ou
-- substituído.
create or replace function documento_imutavel() returns trigger language plpgsql as $$
begin
  if old.status in ('assinado', 'entregue') then
    if new.conteudo is distinct from old.conteudo
       or new.itens is distinct from old.itens
       or new.hash_conteudo is distinct from old.hash_conteudo
       or new.assinatura is distinct from old.assinatura then
      raise exception 'Documento assinado não pode ser alterado. Emita um substituto.';
    end if;
  end if;
  return new;
end;
$$;

create trigger documento_imutavel_trg before update on documentos
  for each row execute function documento_imutavel();

create table templates (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  nome          text not null,
  tipo          text not null,
  conteudo      text,
  itens         jsonb not null default '[]'::jsonb,
  favorito      boolean not null default false,
  origem        text,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Comunicação ————————————————————————————

create table mensagens (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  paciente_id   uuid references pacientes (id),
  responsavel_id uuid references responsaveis (id),
  canal         canal_t not null,
  direcao       text not null default 'saida',
  template      text,
  assunto       text,
  corpo         text,
  status        text,
  enviada_em    timestamptz,
  provider_id   text,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

create table automacoes (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t,
  template_id   text not null,
  ativa         boolean not null default false,
  parametros    jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Financeiro ————————————————————————————

create table lancamentos (
  id              uuid primary key default gen_random_uuid(),
  praca           praca_t not null,
  tipo            lancamento_tipo_t not null,
  descricao       text not null,
  categoria       text,
  centro_custo    text,
  valor           numeric(12,2) not null,
  vencimento      date,
  pagamento_em    timestamptz,
  forma_pagamento text,
  status          lancamento_status_t not null default 'pendente',
  atendimento_id  uuid references agendamentos (id),
  paciente_id     uuid references pacientes (id),
  profissional_id uuid references profissionais (id),
  recorrente      boolean not null default false,
  observacoes     text,
  criado_em       timestamptz not null default now(),
  criado_por      uuid,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid,
  versao          integer not null default 1,
  excluido_em     timestamptz,
  excluido_por    uuid,
  motivo_exclusao text
);

create index on lancamentos (praca, status) where excluido_em is null;
create index on lancamentos (vencimento) where excluido_em is null;

create table repasses (
  id              uuid primary key default gen_random_uuid(),
  praca           praca_t not null,
  profissional_id uuid not null references profissionais (id),
  competencia     date not null,
  base            numeric(12,2) not null,
  percentual      numeric(5,2),
  valor           numeric(12,2) not null,
  status          text not null default 'aberto',
  pago_em         timestamptz,
  criado_em       timestamptz not null default now(),
  criado_por      uuid,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid,
  versao          integer not null default 1,
  excluido_em     timestamptz,
  excluido_por    uuid,
  motivo_exclusao text,
  unique (profissional_id, competencia)
);

-- ———————————————————————————— Operações ————————————————————————————

create table insumos (
  id            uuid primary key default gen_random_uuid(),
  praca         praca_t not null,
  nome          text not null,
  unidade       text,
  estoque       integer not null default 0,
  minimo        integer not null default 0,
  validade      date,
  fornecedor    text,
  criado_em     timestamptz not null default now(),
  criado_por    uuid,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  versao        integer not null default 1,
  excluido_em   timestamptz,
  excluido_por  uuid,
  motivo_exclusao text
);

-- ———————————————————————————— Consentimentos ————————————————————————————

create table consentimentos (
  id               uuid primary key default gen_random_uuid(),
  praca            praca_t,
  paciente_id      uuid not null references pacientes (id),
  titular_id       uuid,
  titular_tipo     text not null default 'paciente',
  responsavel_id   uuid references responsaveis (id),
  finalidade       text not null,
  base_legal       text not null,
  versao_texto     text not null,
  texto_apresentado text not null,
  concedido_em     timestamptz,
  revogado_em      timestamptz,
  ip               inet,
  criado_em        timestamptz not null default now(),
  criado_por       uuid,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid,
  versao           integer not null default 1,
  excluido_em      timestamptz,
  excluido_por     uuid,
  motivo_exclusao  text
);

create index on consentimentos (paciente_id, finalidade);

-- ———————————————————————————— Auditoria ————————————————————————————
-- Append-only, encadeada por hash. Sem update, sem delete — nem para o
-- administrador. A única operação permitida é insert.

create table auditoria (
  id                uuid primary key default gen_random_uuid(),
  "timestamp"       timestamptz not null default now(),
  usuario_id        uuid,
  papel             text,
  praca             text,
  sessao_id         text,
  acao              text not null,
  entidade          text,
  entidade_id       text,
  campos_alterados  text[],
  detalhe           text,
  ip                inet,
  user_agent        text,
  risco             boolean not null default false,
  hash_anterior     text not null,
  hash              text not null unique
);

create index on auditoria ("timestamp" desc);
create index on auditoria (usuario_id, "timestamp" desc);
create index on auditoria (entidade, entidade_id);

create or replace function auditoria_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'O log de auditoria é somente-inserção. Alterar ou remover registros não é permitido.';
end;
$$;

create trigger auditoria_no_update before update on auditoria
  for each row execute function auditoria_append_only();
create trigger auditoria_no_delete before delete on auditoria
  for each row execute function auditoria_append_only();

-- ———————————————————————————— Metadados ————————————————————————————

create table meta (
  id    text primary key,
  value jsonb
);

-- ———————————————————————— Atualização automática ————————————————————————

create or replace function touch_row() returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  new.versao := coalesce(old.versao, 0) + 1;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','responsaveis','pacientes','profissionais','salas','agendamentos',
    'bloqueios','evolucoes','escalas','marcos','medicacoes','anamneses','anexos',
    'documentos','templates','mensagens','automacoes','lancamentos','repasses',
    'insumos','consentimentos'
  ] loop
    execute format(
      'create trigger %I_touch before update on %I for each row execute function touch_row()',
      t, t
    );
  end loop;
end $$;
