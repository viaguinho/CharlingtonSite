import * as repo from '../../data/repository.js';
import { STORES } from '../../data/schema.js';

/**
 * Tudo o que os Relatórios leem, de uma unidade (ou de todas, com `plaza`
 * nulo). A tela e o "Criar relatório" usam o mesmo carregamento: o PDF de
 * outra unidade é calculado sobre os mesmos tipos de registro da tela.
 */
export async function loadReportData(plaza) {
  const where = plaza ? { praca: plaza } : {};
  const safe = (promise) => promise.catch(() => []);
  const [appointments, patients, notes, entries, documents, consents, medications] = await Promise.all([
    safe(repo.list(STORES.APPOINTMENTS, { where })),
    safe(repo.list(STORES.PATIENTS, { where })),
    safe(repo.list(STORES.NOTES)),
    safe(repo.list(STORES.ENTRIES, { where })),
    safe(repo.list(STORES.DOCUMENTS, { where })),
    safe(repo.list(STORES.CONSENTS, { where })),
    safe(repo.list(STORES.MEDICATIONS)),
  ]);
  return { appointments, patients, notes, entries, documents, consents, medications };
}

export const EMPTY_DATA = { appointments: [], patients: [], notes: [], entries: [], documents: [], consents: [], medications: [] };
