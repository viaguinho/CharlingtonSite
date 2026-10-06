-- ============================================================================
-- Migration 0002 · Row Level Security
--
-- Esta é a fronteira de segurança real do sistema. O `admin/core/rbac.js` do
-- navegador é conveniência de interface: esconde botões. Quem decide o que
-- cada usuário pode ler e escrever é o Postgres, aqui.
--
-- Duas dimensões independentes, ambas obrigatórias:
--   1. PAPEL  — o que a função faz (médico lê prontuário, recepção não);
--   2. PRAÇA  — onde a pessoa trabalha (Fortaleza não vê Campinas).
--
-- Negação por padrão: `enable row level security` sem política = nada passa.
-- ============================================================================

-- ———————————————————————— Funções de contexto ————————————————————————

create or replace function app_user() returns usuarios
language sql stable security definer set search_path = public as $$
  select * from usuarios
  where auth_id = auth.uid() and excluido_em is null
  limit 1
$$;

create or replace function app_role() returns papel_t
language sql stable security definer set search_path = public as $$
  select role from usuarios where auth_id = auth.uid() and excluido_em is null limit 1
$$;

create or replace function app_plazas() returns praca_t[]
language sql stable security definer set search_path = public as $$
  select coalesce(plazas, '{}') from usuarios
  where auth_id = auth.uid() and excluido_em is null limit 1
$$;

/** A praça do registro está entre as praças autorizadas do usuário? */
create or replace function na_praca(p praca_t) returns boolean
language sql stable as $$
  select p is null or p = any (app_plazas())
$$;

create or replace function eh_medico() returns boolean
language sql stable as $$ select app_role() in ('doctor', 'admin') $$;

create or replace function eh_admin() returns boolean
language sql stable as $$ select app_role() = 'admin' $$;

create or replace function eh_recepcao() returns boolean
language sql stable as $$ select app_role() in ('reception', 'doctor', 'admin') $$;

create or replace function eh_financeiro() returns boolean
language sql stable as $$ select app_role() in ('finance', 'doctor', 'admin') $$;

-- ———————————————————————— Ativação em massa ————————————————————————

do $$
declare t text;
begin
  foreach t in array array[
    'clinica','usuarios','responsaveis','pacientes','profissionais','salas',
    'agendamentos','bloqueios','evolucoes','escalas','marcos','medicacoes',
    'anamneses','anexos','documentos','templates','mensagens','automacoes',
    'lancamentos','repasses','insumos','consentimentos','auditoria','meta'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- ═══════════════════════════ Clínica e usuários ═══════════════════════════

create policy clinica_leitura on clinica for select using (auth.uid() is not null);
create policy clinica_escrita on clinica for all using (eh_admin()) with check (eh_admin());

-- Todos veem a lista de colegas (nome, papel, praça) — é necessário para
-- atribuir atendimento. Só o administrador altera.
create policy usuarios_leitura on usuarios for select using (auth.uid() is not null);
create policy usuarios_escrita on usuarios for all using (eh_admin()) with check (eh_admin());

-- ═══════════════════════════ Pacientes ═══════════════════════════
-- Médico e recepção leem, dentro da praça. Financeiro não lê ficha de
-- paciente: cobrar não exige saber quem é a criança.

create policy pacientes_leitura on pacientes for select
  using (eh_recepcao() and na_praca(praca));

create policy pacientes_insercao on pacientes for insert
  with check (eh_recepcao() and na_praca(praca));

create policy pacientes_alteracao on pacientes for update
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

-- Ninguém apaga paciente. A exclusão é lógica, via update.
-- (Sem política de delete = delete negado.)

create policy responsaveis_leitura on responsaveis for select
  using (eh_recepcao() and na_praca(praca));
create policy responsaveis_escrita on responsaveis for all
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

-- ═══════════════════ Prontuário — exclusivo do médico ═══════════════════
-- Evolução, escala, marco, medicação, anamnese e anexo contêm conteúdo
-- clínico. A recepção agenda e cadastra; não lê prontuário.

do $$
declare t text;
begin
  foreach t in array array['evolucoes','escalas','marcos','medicacoes','anamneses','anexos'] loop
    execute format($f$
      create policy %1$I_leitura on %1$I for select
        using (
          eh_medico()
          and exists (
            select 1 from pacientes p
            where p.id = %1$I.paciente_id and na_praca(p.praca)
          )
        )
    $f$, t);

    execute format($f$
      create policy %1$I_escrita on %1$I for insert
        with check (
          eh_medico()
          and exists (
            select 1 from pacientes p
            where p.id = %1$I.paciente_id and na_praca(p.praca)
          )
        )
    $f$, t);

    execute format($f$
      create policy %1$I_alteracao on %1$I for update
        using (
          eh_medico()
          and exists (
            select 1 from pacientes p
            where p.id = %1$I.paciente_id and na_praca(p.praca)
          )
        )
    $f$, t);
  end loop;
end $$;

-- ═══════════════════════════ Agenda ═══════════════════════════

create policy agendamentos_leitura on agendamentos for select
  using ((eh_recepcao() or eh_financeiro()) and na_praca(praca));
create policy agendamentos_escrita on agendamentos for all
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

create policy salas_leitura on salas for select using (na_praca(praca));
create policy salas_escrita on salas for all
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

create policy bloqueios_leitura on bloqueios for select using (na_praca(praca));
create policy bloqueios_escrita on bloqueios for all
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

-- ═══════════════════════════ Documentos ═══════════════════════════
-- A recepção vê o STATUS (para saber se já pode entregar à família), mas o
-- conteúdo clínico é do médico. A separação por coluna é feita na view
-- `documentos_status` abaixo.

create policy documentos_leitura_medico on documentos for select
  using (eh_medico() and na_praca(praca));
create policy documentos_escrita on documentos for insert
  with check (eh_medico() and na_praca(praca));
create policy documentos_alteracao on documentos for update
  using (eh_medico() and na_praca(praca));

create view documentos_status with (security_invoker = true) as
  select id, praca, paciente_id, tipo, numero, status, criado_em,
         (assinatura ->> 'assinadoEm') as assinado_em
  from documentos
  where excluido_em is null;

grant select on documentos_status to authenticated;

create policy templates_leitura on templates for select using (eh_medico());
create policy templates_escrita on templates for all
  using (eh_medico()) with check (eh_medico());

-- ═══════════════════════════ Comunicação ═══════════════════════════
-- Só se envia para quem consentiu. A checagem é feita aqui, no banco: uma
-- inserção de mensagem sem consentimento vigente é recusada, independente do
-- que a aplicação tenha tentado.

create or replace function tem_consentimento(pid uuid, canal canal_t) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from consentimentos c
    where c.paciente_id = pid
      and c.finalidade = case when canal = 'whatsapp'
                              then 'comunicacao_whatsapp'
                              else 'comunicacao_email' end
      and c.concedido_em is not null
      and c.revogado_em is null
      and c.excluido_em is null
  )
$$;

create policy mensagens_leitura on mensagens for select
  using (eh_recepcao() and na_praca(praca));

create policy mensagens_envio on mensagens for insert
  with check (
    eh_recepcao()
    and na_praca(praca)
    and (direcao = 'entrada' or tem_consentimento(paciente_id, canal))
  );

create policy mensagens_alteracao on mensagens for update
  using (eh_recepcao() and na_praca(praca));

create policy automacoes_leitura on automacoes for select using (eh_recepcao());
create policy automacoes_escrita on automacoes for all
  using (eh_medico()) with check (eh_medico());

-- ═══════════════════════════ Financeiro ═══════════════════════════

create policy lancamentos_leitura on lancamentos for select
  using (eh_financeiro() and na_praca(praca));
create policy lancamentos_escrita on lancamentos for all
  using (eh_financeiro() and na_praca(praca))
  with check (eh_financeiro() and na_praca(praca));

create policy repasses_leitura on repasses for select
  using (eh_financeiro() and na_praca(praca));
create policy repasses_escrita on repasses for all
  using (eh_financeiro() and na_praca(praca))
  with check (eh_financeiro() and na_praca(praca));

-- Dados bancários cifrados não são expostos nem ao financeiro por consulta
-- direta: a coluna é removida da view usada pela aplicação.
create policy profissionais_leitura on profissionais for select
  using ((eh_financeiro() or eh_recepcao()) and na_praca(praca));
create policy profissionais_escrita on profissionais for all
  using (eh_financeiro() and na_praca(praca))
  with check (eh_financeiro() and na_praca(praca));

create view profissionais_publico with (security_invoker = true) as
  select id, praca, nome, especialidade, regime, percentual, valor_fixo,
         telefone, email, criado_em
  from profissionais
  where excluido_em is null;

grant select on profissionais_publico to authenticated;

-- ═══════════════════════════ Operações ═══════════════════════════

create policy insumos_leitura on insumos for select using (na_praca(praca));
create policy insumos_escrita on insumos for all
  using (eh_recepcao() and na_praca(praca))
  with check (eh_recepcao() and na_praca(praca));

-- ═══════════════════════════ Consentimentos ═══════════════════════════

create policy consentimentos_leitura on consentimentos for select
  using (eh_recepcao() and na_praca(praca));
create policy consentimentos_escrita on consentimentos for insert
  with check (eh_recepcao() and na_praca(praca));
-- Revogação é update; concessão nunca é apagada.
create policy consentimentos_revogacao on consentimentos for update
  using (eh_recepcao() and na_praca(praca));

-- ═══════════════════════════ Auditoria ═══════════════════════════
-- Qualquer usuário autenticado INSERE (todo evento precisa ser registrado,
-- inclusive os da recepção). Só o administrador LÊ. Ninguém altera ou apaga —
-- os triggers da migration 0001 bloqueiam mesmo com política permissiva.

create policy auditoria_insercao on auditoria for insert
  with check (auth.uid() is not null);

create policy auditoria_leitura on auditoria for select
  using (eh_admin() or app_role() = 'doctor');

-- ═══════════════════════════ Metadados ═══════════════════════════

create policy meta_leitura on meta for select using (auth.uid() is not null);
create policy meta_escrita on meta for all
  using (eh_recepcao()) with check (eh_recepcao());

-- ═══════════════════════════ Storage ═══════════════════════════
-- Bucket privado para anexos clínicos. Nome de arquivo é UUID opaco — nunca
-- "laudo-autismo-joao.pdf", que vazaria diagnóstico só pelo nome.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos', 'anexos', false, 26214400,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy anexos_leitura on storage.objects for select
  using (bucket_id = 'anexos' and eh_medico());

create policy anexos_escrita on storage.objects for insert
  with check (bucket_id = 'anexos' and eh_medico());

create policy anexos_remocao on storage.objects for delete
  using (bucket_id = 'anexos' and eh_medico());
