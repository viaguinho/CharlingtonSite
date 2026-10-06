/**
 * Log de auditoria append-only com encadeamento por hash.
 *
 * Cada registro carrega o hash do registro anterior. Alterar ou remover
 * qualquer entrada quebra a cadeia a partir dali, e a quebra é detectável
 * por `verifyChain()`. Isso não impede a adulteração — impede a adulteração
 * SILENCIOSA, que é o que a LGPD (art. 37) e o CFM exigem.
 *
 * Leitura de prontuário é evento auditável: o CFM exige saber quem viu o quê.
 */

import { hashObject, uuid } from './crypto.js';

export const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  STEP_UP: 'STEP_UP',
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SIGN: 'SIGN',
  PRINT: 'PRINT',
  SEND: 'SEND',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  CONSENT_GIVEN: 'CONSENT_GIVEN',
  CONSENT_REVOKED: 'CONSENT_REVOKED',
  INTEGRITY_CHECK: 'INTEGRITY_CHECK',
};

/** Ações que disparam alerta ativo para o administrador. */
const RISK_ACTIONS = new Set([
  ACTIONS.EXPORT,
  ACTIONS.DELETE,
  ACTIONS.PERMISSION_CHANGE,
  ACTIONS.LOGIN_FAIL,
]);

/** Campos cujo VALOR nunca entra no log — só o nome do campo alterado. */
const SENSITIVE_FIELDS = new Set([
  'cpf', 'cns', 'senha', 'password', 'pin', 'token',
  'contaBancaria', 'agencia', 'chavePix',
  'conteudo', 'subjetivo', 'objetivo', 'avaliacao', 'plano',
  'queixaPrincipal', 'observacoes',
]);

let repository = null;
let lastHash = null;
let sessionContext = { userId: null, role: null, plaza: null, sessionId: null };

/** Injeta o repositório. Chamado uma vez na inicialização do app. */
export function configure(repo) {
  repository = repo;
}

export function setContext(context) {
  sessionContext = { ...sessionContext, ...context };
}

export function clearContext() {
  sessionContext = { userId: null, role: null, plaza: null, sessionId: null };
  lastHash = null;
}

/** Remove valores sensíveis, preservando a lista de campos tocados. */
function sanitizeChanges(changes) {
  if (!changes) return null;
  if (Array.isArray(changes)) return changes.filter((f) => typeof f === 'string');
  return Object.keys(changes).map((field) =>
    SENSITIVE_FIELDS.has(field) ? `${field} (valor omitido)` : field,
  );
}

/**
 * Registra um evento. Nunca lança para o chamador: falhar ao auditar não pode
 * derrubar a operação clínica, mas precisa ser visível no console e, quando
 * houver servidor, reportado.
 */
export async function log({ action, entity, entityId, changes, detail, plaza }) {
  if (!repository) return null;

  try {
    if (lastHash === null) {
      const last = await repository.lastAuditEntry();
      lastHash = last?.hash ?? 'GENESIS';
    }

    const entry = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      usuarioId: sessionContext.userId,
      papel: sessionContext.role,
      praca: plaza ?? sessionContext.plaza,
      sessaoId: sessionContext.sessionId,
      acao: action,
      entidade: entity ?? null,
      entidadeId: entityId ?? null,
      camposAlterados: sanitizeChanges(changes),
      detalhe: detail ?? null,
      userAgent: navigator.userAgent,
      risco: RISK_ACTIONS.has(action),
      hashAnterior: lastHash,
    };

    entry.hash = await hashObject({ ...entry, hash: undefined });
    lastHash = entry.hash;

    await repository.appendAudit(entry);
    return entry;
  } catch (error) {
    console.error('[auditoria] falha ao registrar evento', action, error);
    return null;
  }
}

/* Atalhos semânticos — deixam a chamada legível no ponto de uso. */
export const logCreate = (entity, entityId, detail) => log({ action: ACTIONS.CREATE, entity, entityId, detail });
export const logRead   = (entity, entityId, detail) => log({ action: ACTIONS.READ, entity, entityId, detail });
export const logUpdate = (entity, entityId, changes) => log({ action: ACTIONS.UPDATE, entity, entityId, changes });
export const logDelete = (entity, entityId, detail) => log({ action: ACTIONS.DELETE, entity, entityId, detail });
export const logSign   = (entityId, detail) => log({ action: ACTIONS.SIGN, entity: 'documentoClinico', entityId, detail });
export const logExport = (detail) => log({ action: ACTIONS.EXPORT, detail });

/**
 * Verifica a integridade da cadeia inteira.
 * Devolve { valid, checked, brokenAt } — `brokenAt` é o primeiro registro
 * cujo hash não confere ou cujo elo com o anterior foi rompido.
 */
export async function verifyChain() {
  if (!repository) return { valid: false, checked: 0, brokenAt: null, reason: 'Repositório indisponível.' };

  const entries = await repository.allAudit();
  let previous = 'GENESIS';

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];

    if (entry.hashAnterior !== previous) {
      return { valid: false, checked: i, brokenAt: entry, reason: 'Elo com o registro anterior não confere.' };
    }

    const recomputed = await hashObject({ ...entry, hash: undefined });
    if (recomputed !== entry.hash) {
      return { valid: false, checked: i, brokenAt: entry, reason: 'Conteúdo do registro foi alterado após a gravação.' };
    }

    previous = entry.hash;
  }

  await log({ action: ACTIONS.INTEGRITY_CHECK, detail: `${entries.length} registros verificados.` });
  return { valid: true, checked: entries.length, brokenAt: null };
}
