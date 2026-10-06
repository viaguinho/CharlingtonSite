/**
 * Repositório — a única porta de acesso a dados do painel.
 *
 * Nenhum módulo de interface toca IndexedDB, `fetch` ou o cliente Supabase
 * diretamente. Trocar o adapter não pode custar uma linha de UI.
 *
 * Seleção de modo:
 *   VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos → modo servidor
 *   ausentes → modo local-first, com IndexedDB cifrado
 */

import { idbAdapter } from './idb-adapter.js';
import { supabaseAdapter, isSupabaseConfigured } from './supabase-adapter.js';
import { STORES, touch, softDelete, envelope } from './schema.js';
import * as audit from '../core/audit.js';

let adapter = isSupabaseConfigured ? supabaseAdapter : idbAdapter;

export const mode = () => adapter.id;
export const isServerMode = () => adapter.id === 'supabase';

/** Troca de adapter em tempo de execução — usado pelos testes e pela migração. */
export function useAdapter(next) {
  adapter = next;
}

let currentUserId = null;
let currentPlaza = null;

export function setActor(userId, plaza) {
  currentUserId = userId;
  currentPlaza = plaza;
}

/* ——————————————————————————— Leitura ——————————————————————————— */

export const ready = () => adapter.ready();

export async function get(store, id, { silent = false } = {}) {
  const record = await adapter.get(store, id);
  // Leitura de prontuário é evento auditável — exigência do CFM e da LGPD.
  if (!silent && AUDITED_READS.has(store) && record) {
    let detail = null;
    if (store === STORES.PATIENTS) {
      detail = `Prontuário de ${record.nome}`;
    } else if (record.pacienteId) {
      const p = await adapter.get(STORES.PATIENTS, record.pacienteId);
      if (p) {
        const labels = {
          [STORES.NOTES]: 'Evolução clínica',
          [STORES.DOCUMENTS]: 'Documento',
          [STORES.ANAMNESIS]: 'Anamnese',
          [STORES.SCALES]: 'Escala',
        };
        detail = `${labels[store] || 'Registro'} de ${p.nome}`;
      }
    }
    await audit.logRead(store, id, detail);
  }
  return record;
}

export function list(store, options) {
  return adapter.list(store, options);
}

export function count(store) {
  return adapter.count(store);
}

/** Entidades cuja simples leitura precisa ficar registrada. */
const AUDITED_READS = new Set([
  STORES.PATIENTS,
  STORES.NOTES,
  STORES.DOCUMENTS,
  STORES.ANAMNESIS,
  STORES.SCALES,
]);

/* ——————————————————————————— Escrita ——————————————————————————— */

export async function create(store, data, { auditAction, auditDetail } = {}) {
  const record = {
    ...envelope({ praca: data.praca ?? currentPlaza, userId: currentUserId }),
    ...data,
  };
  // O envelope define os campos de controle; os dados do chamador não podem
  // sobrescrever id, autoria ou versão.
  record.id = record.id ?? envelope().id;
  record.criadoPor = currentUserId;
  record.atualizadoPor = currentUserId;

  const saved = await adapter.put(store, record);
  
  let detail = auditDetail ?? null;
  if (!detail) {
    if (store === STORES.PATIENTS) {
      detail = `Prontuário de ${record.nome}`;
    } else if (record.pacienteId) {
      const p = await adapter.get(STORES.PATIENTS, record.pacienteId);
      if (p) {
        const labels = {
          [STORES.NOTES]: 'Evolução clínica',
          [STORES.DOCUMENTS]: 'Documento',
          [STORES.ANAMNESIS]: 'Anamnese',
          [STORES.SCALES]: 'Escala',
          [STORES.APPOINTMENTS]: 'Agendamento',
        };
        detail = `${labels[store] || 'Registro'} de ${p.nome}`;
      }
    }
  }

  await audit.log({
    action: auditAction ?? audit.ACTIONS.CREATE,
    entity: store,
    entityId: record.id,
    detail
  });
  return saved;
}

export async function update(store, id, changes, { auditAction, auditDetail } = {}) {
  const existing = await adapter.get(store, id);
  if (!existing) throw new Error('Registro não encontrado.');
  if (existing.travada) throw new Error('Este registro está travado e não pode ser alterado.');

  const next = touch({ ...existing, ...changes, id }, currentUserId);
  const saved = await adapter.put(store, next);

  let detail = auditDetail ?? null;
  if (!detail) {
    if (store === STORES.PATIENTS) {
      detail = `Prontuário de ${next.nome}`;
    } else if (next.pacienteId) {
      const p = await adapter.get(STORES.PATIENTS, next.pacienteId);
      if (p) {
        const labels = {
          [STORES.NOTES]: 'Evolução clínica',
          [STORES.DOCUMENTS]: 'Documento',
          [STORES.ANAMNESIS]: 'Anamnese',
          [STORES.SCALES]: 'Escala',
          [STORES.APPOINTMENTS]: 'Agendamento',
        };
        detail = `${labels[store] || 'Registro'} de ${p.nome}`;
      }
    }
  }

  await audit.log({
    action: auditAction ?? audit.ACTIONS.UPDATE,
    entity: store,
    entityId: id,
    changes,
    detail
  });
  return saved;
}

/**
 * Exclusão lógica. Prontuário, documento e lançamento financeiro têm prazo
 * legal de guarda e jamais são removidos fisicamente.
 */
export async function remove(store, id, reason) {
  const existing = await adapter.get(store, id);
  if (!existing) throw new Error('Registro não encontrado.');

  const deleted = softDelete(existing, currentUserId, reason);
  await adapter.put(store, deleted);
  await audit.logDelete(store, id, reason);
  return deleted;
}

export async function putMany(store, records) {
  return adapter.putMany(store, records);
}

/* ——————————————————————————— Anexos ——————————————————————————— */

export const putBlob = (id, buffer, contentType) => adapter.putBlob(id, buffer, contentType);
export const getBlob = (id) => adapter.getBlob(id);
export const destroyBlob = (id) => adapter.destroyBlob(id);
export const signedUrl = (id, expires) =>
  adapter.signedUrl ? adapter.signedUrl(id, expires) : null;

/* ——————————————————————————— Auditoria ——————————————————————————— */

export const appendAudit = (entry) => adapter.appendAudit(entry);
export const lastAuditEntry = () => adapter.lastAuditEntry();
export const allAudit = () => adapter.allAudit();

/* ——————————————————————————— Metadados ——————————————————————————— */

export const getMeta = (key) => adapter.getMeta(key);
export const setMeta = (key, value) => adapter.setMeta(key, value);

/* ——————————————————————————— BFF ———————————————————————————
   Chamadas que exigem segredo do lado servidor. Em modo local-first não há
   BFF disponível, e a operação falha com uma mensagem honesta em vez de
   fingir sucesso. */

export async function invoke(functionName, payload) {
  if (!adapter.invoke) {
    throw new Error(
      'Esta operação exige o servidor configurado. ' +
      'Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    );
  }
  return adapter.invoke(functionName, payload);
}

export const wipe = () => adapter.wipe();

/** Registra o repositório no módulo de auditoria — fecha a dependência circular. */
audit.configure({
  appendAudit,
  lastAuditEntry,
  allAudit,
});

export { STORES };
