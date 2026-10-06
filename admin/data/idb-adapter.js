/**
 * Adapter IndexedDB — modo local-first, com o conteúdo cifrado em repouso.
 *
 * Cada registro é gravado como um envelope:
 *   { id, praca, pacienteId, atualizadoEm, excluidoEm, enc: { iv, data } }
 *
 * Só os campos de índice ficam em claro — todos são identificadores opacos
 * (UUID) ou metadados não sensíveis. Nome, CPF, evolução clínica, valores e
 * qualquer PII/PHI vivem exclusivamente dentro de `enc`, cifrados com
 * AES-256-GCM sob uma chave derivada da senha do usuário que existe apenas
 * em memória. Roubar o arquivo do IndexedDB não entrega nenhum dado clínico.
 */

import { STORES, SCHEMA_VERSION } from './schema.js';
import { encrypt, decrypt, encryptBlob, decryptBlob, getKey, isUnlocked } from '../core/crypto.js';

const DB_NAME = 'CharlingtonClinica';

/** Campos mantidos em claro para permitir consulta por índice. */
const INDEXED_FIELDS = ['praca', 'pacienteId', 'atualizadoEm', 'excluidoEm', 'timestamp', 'inicio', 'status'];

const INDEXES = {
  [STORES.PATIENTS]: ['praca', 'status', 'atualizadoEm'],
  [STORES.GUARDIANS]: ['praca'],
  [STORES.APPOINTMENTS]: ['praca', 'pacienteId', 'inicio', 'status'],
  [STORES.ENCOUNTERS]: ['praca', 'pacienteId'],
  [STORES.NOTES]: ['pacienteId'],
  [STORES.SCALES]: ['pacienteId'],
  [STORES.MILESTONES]: ['pacienteId'],
  [STORES.MEDICATIONS]: ['pacienteId'],
  [STORES.ANAMNESIS]: ['pacienteId'],
  [STORES.DOCUMENTS]: ['praca', 'pacienteId', 'status'],
  [STORES.ATTACHMENTS]: ['pacienteId'],
  [STORES.MESSAGES]: ['pacienteId'],
  [STORES.ENTRIES]: ['praca', 'status'],
  [STORES.TRANSFERS]: ['praca'],
  [STORES.SUPPLIES]: ['praca'],
  [STORES.ROOMS]: ['praca'],
  [STORES.BLOCKS]: ['praca', 'inicio'],
  [STORES.CONSENTS]: ['pacienteId'],
  [STORES.AUDIT]: ['timestamp'],
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      for (const store of Object.values(STORES)) {
        if (db.objectStoreNames.contains(store)) continue;
        const objectStore = db.createObjectStore(store, { keyPath: 'id' });
        for (const field of INDEXES[store] ?? []) {
          objectStore.createIndex(field, field, { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Banco local bloqueado por outra aba aberta.'));
  });

  return dbPromise;
}

function transaction(store, mode = 'readonly') {
  return openDatabase().then((db) => db.transaction(store, mode).objectStore(store));
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* ————————————————————————— Envelope cifrado ————————————————————————— */

async function seal(record) {
  const envelope = { id: record.id };
  for (const field of INDEXED_FIELDS) {
    if (record[field] !== undefined) envelope[field] = record[field];
  }
  envelope.enc = await encrypt(getKey(), record);
  return envelope;
}

async function open(envelope) {
  if (!envelope) return null;
  if (!envelope.enc) return envelope;           // registros não sensíveis (meta)
  try {
    return await decrypt(getKey(), envelope.enc);
  } catch {
    throw new Error('Não foi possível decifrar o registro. A sessão pode ter expirado.');
  }
}

function assertUnlocked() {
  if (!isUnlocked()) {
    throw new Error('Cofre bloqueado. Autentique-se novamente para acessar os dados.');
  }
}

/* ————————————————————————————— Operações ————————————————————————————— */

export const idbAdapter = {
  id: 'indexeddb',

  async ready() {
    await openDatabase();
    return true;
  },

  async get(store, id) {
    assertUnlocked();
    const os = await transaction(store);
    return open(await promisify(os.get(id)));
  },

  async list(store, { where = {}, includeDeleted = false } = {}) {
    assertUnlocked();
    const os = await transaction(store);
    const envelopes = await promisify(os.getAll());

    const records = [];
    for (const envelope of envelopes) {
      // Filtro barato nos campos em claro, antes de pagar o custo de decifrar.
      if (!includeDeleted && envelope.excluidoEm) continue;
      let skip = false;
      for (const [field, value] of Object.entries(where)) {
        if (INDEXED_FIELDS.includes(field) && envelope[field] !== undefined && envelope[field] !== value) {
          skip = true; break;
        }
      }
      if (skip) continue;

      const record = await open(envelope);
      if (!record) continue;
      if (!includeDeleted && record.excluidoEm) continue;

      const matches = Object.entries(where)
        .every(([field, value]) => record[field] === value);
      if (matches) records.push(record);
    }
    return records;
  },

  async put(store, record) {
    assertUnlocked();
    const os = await transaction(store, 'readwrite');
    await promisify(os.put(await seal(record)));
    return record;
  },

  async putMany(store, records) {
    assertUnlocked();
    const os = await transaction(store, 'readwrite');
    for (const record of records) {
      await promisify(os.put(await seal(record)));
    }
    return records;
  },

  /**
   * Remoção física. Usada apenas para dados operacionais sem valor legal
   * (rascunhos, cache). Prontuário, documento e lançamento usam exclusão
   * lógica via `softDelete` no schema — nunca chegam aqui.
   */
  async destroy(store, id) {
    const os = await transaction(store, 'readwrite');
    await promisify(os.delete(id));
  },

  async count(store) {
    const os = await transaction(store);
    return promisify(os.count());
  },

  /* ————————————————————— Anexos binários ————————————————————— */

  async putBlob(id, arrayBuffer) {
    assertUnlocked();
    const sealed = await encryptBlob(getKey(), arrayBuffer);
    const os = await transaction(STORES.ATTACHMENT_BLOBS, 'readwrite');
    await promisify(os.put({ id, iv: sealed.iv, data: sealed.data }));
    return id;
  },

  async getBlob(id) {
    assertUnlocked();
    const os = await transaction(STORES.ATTACHMENT_BLOBS);
    const stored = await promisify(os.get(id));
    if (!stored) return null;
    return decryptBlob(getKey(), stored);
  },

  async destroyBlob(id) {
    const os = await transaction(STORES.ATTACHMENT_BLOBS, 'readwrite');
    await promisify(os.delete(id));
  },

  /* ————————————————————— Auditoria ————————————————————— */

  /**
   * O log de auditoria não é cifrado com a chave da sessão: ele precisa ser
   * legível para verificação de integridade mesmo quando o cofre está
   * bloqueado, e por construção não contém PII (valores sensíveis são
   * substituídos pelo nome do campo em core/audit.js).
   */
  async appendAudit(entry) {
    const os = await transaction(STORES.AUDIT, 'readwrite');
    await promisify(os.add(entry));
    return entry;
  },

  async lastAuditEntry() {
    const os = await transaction(STORES.AUDIT);
    const index = os.index('timestamp');
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async allAudit() {
    const os = await transaction(STORES.AUDIT);
    const entries = await promisify(os.getAll());
    return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  /* ————————————————————— Metadados (em claro) ————————————————————— */

  async getMeta(key) {
    const os = await transaction(STORES.META);
    const row = await promisify(os.get(key));
    return row?.value ?? null;
  },

  async setMeta(key, value) {
    const os = await transaction(STORES.META, 'readwrite');
    await promisify(os.put({ id: key, value }));
    return value;
  },

  /** Apaga tudo. Exige confirmação explícita na UI e gera evento de auditoria. */
  async wipe() {
    const db = await openDatabase();
    const stores = Array.from(db.objectStoreNames);
    const tx = db.transaction(stores, 'readwrite');
    for (const store of stores) tx.objectStore(store).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
};
