/**
 * Adapter Supabase — modo servidor.
 *
 * Implementa a mesma interface do `idbAdapter`, de modo que trocar de modo
 * não exige alterar uma linha de interface.
 *
 * A diferença essencial não é técnica, é de segurança: aqui o isolamento por
 * praça e as permissões por papel são aplicados por políticas Row Level
 * Security NO POSTGRES (supabase/migrations/0002_rls.sql). O cliente envia a
 * consulta; o banco decide o que ele pode ver. Nenhum filtro esquecido na
 * aplicação é capaz de vazar dado de outra praça.
 *
 * O `anon key` é público por desenho — ele não concede acesso a nada; quem
 * concede é o JWT da sessão autenticada avaliado pelas políticas RLS.
 * Segredos de verdade (Bird ID, WhatsApp, SMTP) vivem apenas nas Edge
 * Functions, que são o BFF deste projeto.
 */

import { createClient } from '@supabase/supabase-js';
import { STORES } from './schema.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(URL, ANON_KEY, {
      auth: {
        // Sessão em memória + refresh automático. O token nunca vai para
        // localStorage, onde um XSS o alcançaria.
        persistSession: true,
        storageKey: 'charlington.auth',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: { headers: { 'x-application': 'charlington-admin' } },
    })
  : null;

/** Nome da entidade → tabela no Postgres. */
const TABLES = {
  [STORES.CLINIC]: 'clinica',
  [STORES.USERS]: 'usuarios',
  [STORES.PATIENTS]: 'pacientes',
  [STORES.GUARDIANS]: 'responsaveis',
  [STORES.PROFESSIONALS]: 'profissionais',
  [STORES.APPOINTMENTS]: 'agendamentos',
  [STORES.ENCOUNTERS]: 'atendimentos',
  [STORES.NOTES]: 'evolucoes',
  [STORES.SCALES]: 'escalas',
  [STORES.MILESTONES]: 'marcos',
  [STORES.MEDICATIONS]: 'medicacoes',
  [STORES.ANAMNESIS]: 'anamneses',
  [STORES.DOCUMENTS]: 'documentos',
  [STORES.TEMPLATES]: 'templates',
  [STORES.ATTACHMENTS]: 'anexos',
  [STORES.MESSAGES]: 'mensagens',
  [STORES.AUTOMATIONS]: 'automacoes',
  [STORES.ENTRIES]: 'lancamentos',
  [STORES.TRANSFERS]: 'repasses',
  [STORES.SUPPLIES]: 'insumos',
  [STORES.ROOMS]: 'salas',
  [STORES.BLOCKS]: 'bloqueios',
  [STORES.CONSENTS]: 'consentimentos',
  [STORES.AUDIT]: 'auditoria',
  [STORES.META]: 'meta',
};

const BUCKET = 'anexos';

function table(store) {
  const name = TABLES[store];
  if (!name) throw new Error(`Entidade sem tabela mapeada: ${store}`);
  return supabase.from(name);
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export const supabaseAdapter = {
  id: 'supabase',

  async ready() {
    if (!supabase) throw new Error('Supabase não configurado.');
    const { error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return true;
  },

  async get(store, id) {
    const { data, error } = await table(store).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async list(store, { where = {}, includeDeleted = false, order, limit } = {}) {
    let query = table(store).select('*');
    for (const [field, value] of Object.entries(where)) {
      query = Array.isArray(value) ? query.in(field, value) : query.eq(field, value);
    }
    if (!includeDeleted) query = query.is('excluido_em', null);
    if (order) query = query.order(order.field, { ascending: order.ascending !== false });
    if (limit) query = query.limit(limit);
    return unwrap(await query);
  },

  async put(store, record) {
    return unwrap(await table(store).upsert(record).select().single());
  },

  async putMany(store, records) {
    return unwrap(await table(store).upsert(records).select());
  },

  async destroy(store, id) {
    unwrap(await table(store).delete().eq('id', id));
  },

  async count(store) {
    const { count, error } = await table(store).select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  /* —————————————————————— Anexos no Storage —————————————————————— */

  async putBlob(id, arrayBuffer, contentType = 'application/octet-stream') {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(id, arrayBuffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    return id;
  },

  async getBlob(id) {
    const { data, error } = await supabase.storage.from(BUCKET).download(id);
    if (error) throw new Error(error.message);
    return data.arrayBuffer();
  },

  async destroyBlob(id) {
    const { error } = await supabase.storage.from(BUCKET).remove([id]);
    if (error) throw new Error(error.message);
  },

  /**
   * URL temporária para visualizar um anexo. Expira em 60 segundos por padrão —
   * tempo suficiente para abrir, curto demais para vazar por histórico ou log
   * de proxy.
   */
  async signedUrl(id, expiresIn = 60) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(id, expiresIn);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  /* —————————————————————— Auditoria —————————————————————— */

  async appendAudit(entry) {
    return unwrap(await table(STORES.AUDIT).insert(entry).select().single());
  },

  async lastAuditEntry() {
    const { data, error } = await table(STORES.AUDIT)
      .select('*').order('timestamp', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async allAudit() {
    return unwrap(await table(STORES.AUDIT).select('*').order('timestamp', { ascending: true }));
  },

  /* —————————————————————— Metadados —————————————————————— */

  async getMeta(key) {
    const { data, error } = await table(STORES.META).select('value').eq('id', key).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value ?? null;
  },

  async setMeta(key, value) {
    unwrap(await table(STORES.META).upsert({ id: key, value }));
    return value;
  },

  /* ——————————————— BFF: Edge Functions ———————————————
     Único caminho para integrações que exigem segredo. O navegador envia
     apenas o que é seu (hash do documento, PIN digitado agora); a credencial
     do provedor nunca sai do servidor. */

  async invoke(functionName, payload) {
    const { data, error } = await supabase.functions.invoke(functionName, { body: payload });
    if (error) throw new Error(error.message);
    return data;
  },

  async wipe() {
    throw new Error('Limpeza total não é permitida no modo servidor.');
  },
};
