-- ============================================================================
-- Migration 0003 · Endurecimento e verificação
--
-- Roda depois de 0001 e 0002. Faz três coisas:
--   1. revoga o acesso amplo que o Supabase concede por padrão;
--   2. cria a verificação de integridade da cadeia de auditoria no banco;
--   3. cria a função de retenção que identifica o que já passou do prazo legal.
--
-- Não insere nenhum registro. O sistema continua vazio até que alguém da
-- clínica cadastre o primeiro dado pelo painel.
-- ============================================================================

-- ———————————————————— 1. Revogar acesso padrão ————————————————————
-- Por padrão o Supabase concede ALL em todas as tabelas para `anon` e
-- `authenticated`. Com RLS ativa isso não vaza dado, mas privilégio que não
-- é usado é privilégio que não deveria existir.

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

-- `authenticated` recebe apenas o necessário; a RLS filtra as linhas.
grant select, insert, update on all tables in schema public to authenticated;

-- Ninguém apaga: exclusão é lógica e prontuário tem guarda de 20 anos.
revoke delete on all tables in schema public from authenticated;

-- Auditoria é somente-inserção até para quem lê.
revoke update, delete on auditoria from authenticated;

alter default privileges in schema public
  grant select, insert, update on tables to authenticated;

-- ———————————————— 2. Integridade da cadeia de auditoria ————————————————
-- Percorre a cadeia e devolve o primeiro elo rompido, se houver. A verificação
-- do navegador (core/audit.js) recalcula os hashes; esta confere a topologia
-- sem precisar decifrar nada.

create or replace function verificar_cadeia_auditoria()
returns table (valido boolean, verificados bigint, rompido_em timestamptz, motivo text)
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  esperado text := 'GENESIS';
  total bigint := 0;
begin
  for r in
    select a."timestamp", a.hash, a.hash_anterior
    from auditoria a
    where a.hash_anterior <> 'SERVER'   -- entradas gravadas pelas Edge Functions
    order by a."timestamp" asc, a.hash asc
  loop
    if r.hash_anterior is distinct from esperado then
      return query select false, total, r."timestamp",
        'O elo com o registro anterior não confere — há registro alterado ou removido.'::text;
      return;
    end if;
    esperado := r.hash;
    total := total + 1;
  end loop;

  return query select true, total, null::timestamptz, null::text;
end;
$$;

grant execute on function verificar_cadeia_auditoria() to authenticated;

-- ———————————————————— 3. Retenção legal ————————————————————
-- Identifica o que já passou do prazo de guarda. Não apaga nada: elimina-se
-- por decisão humana, com registro. Prazos:
--   prontuário 20 anos (Res. CFM 1.821/2007) · financeiro 5 · comunicação 2.

create or replace function itens_fora_do_prazo_de_guarda()
returns table (entidade text, quantidade bigint, prazo_anos integer)
language sql stable security definer set search_path = public as $$
  select 'evolucoes', count(*), 20 from evolucoes
    where criado_em < now() - interval '20 years'
  union all
  select 'documentos', count(*), 20 from documentos
    where criado_em < now() - interval '20 years'
  union all
  select 'anexos', count(*), 20 from anexos
    where criado_em < now() - interval '20 years'
  union all
  select 'lancamentos', count(*), 5 from lancamentos
    where criado_em < now() - interval '5 years'
  union all
  select 'mensagens', count(*), 2 from mensagens
    where criado_em < now() - interval '2 years'
$$;

grant execute on function itens_fora_do_prazo_de_guarda() to authenticated;

-- ———————————————— 4. Relatório de acesso a prontuário ————————————————
-- Exigência da LGPD (art. 18) e do CFM: o responsável pode perguntar quem
-- acessou o prontuário da criança, e a clínica precisa saber responder.

create or replace function acessos_ao_prontuario(p_paciente_id uuid)
returns table (
  quando timestamptz,
  usuario text,
  papel text,
  acao text,
  entidade text
)
language sql stable security definer set search_path = public as $$
  select a."timestamp", u.nome, a.papel, a.acao, a.entidade
  from auditoria a
  left join usuarios u on u.id = a.usuario_id
  where a.entidade_id = p_paciente_id::text
     or (a.entidade in ('evolucoes','documentos','escalas','anexos','anamneses')
         and a.entidade_id in (
           select e.id::text from evolucoes e where e.paciente_id = p_paciente_id
           union select d.id::text from documentos d where d.paciente_id = p_paciente_id
           union select s.id::text from escalas s where s.paciente_id = p_paciente_id
           union select x.id::text from anexos x where x.paciente_id = p_paciente_id
         ))
  order by a."timestamp" desc
$$;

grant execute on function acessos_ao_prontuario(uuid) to authenticated;

-- ———————————————— 5. Sessão: expiração absoluta ————————————————
-- Complementa o timeout de inatividade do cliente. Configure também em
-- Authentication › Sessions: JWT expiry 3600s, refresh token rotation ON,
-- inactivity timeout 900s, time-box 28800s.

comment on schema public is
  'Gestão Clínica — Dr. Charlington M. Cavalcante. RLS obrigatória em todas as tabelas; exclusão sempre lógica; auditoria append-only.';
