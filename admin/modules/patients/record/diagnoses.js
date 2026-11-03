/**
 * Diagnósticos da ficha, sempre como lista de { code, description }. O jsonb não tem esquema: já apareceram texto
 * solto ("G40.9"), lista de textos, objeto com `codigo` e objeto com `cid`. Um formato inesperado não pode derrubar
 * o cabeçalho nem a coluna, e é ali que a alergia aparece.
 */
const CODE_KEYS = ['codigo', 'cid', 'code', 'cid10'];
const TEXT_KEYS = ['descricao', 'nome', 'texto', 'name', 'description'];

export function diagnosesOf(patient) {
  const raw = patient?.clinico?.diagnosticos;
  if (raw == null || raw === '' || raw === false) return [];
  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[;\n,]+/) : [raw];
  const seen = new Set();
  const list = [];
  for (const item of items) {
    let code = '';
    let description = null;
    if (typeof item === 'string' || typeof item === 'number') {
      code = String(item).trim();
    } else if (item && typeof item === 'object') {
      const pick = (keys) => keys.map((key) => item[key])
        .find((value) => (typeof value === 'string' && value.trim()) || typeof value === 'number');
      code = String(pick(CODE_KEYS) ?? '').trim();
      description = String(pick(TEXT_KEYS) ?? '').trim() || null;
      // Chave que o esquema não conhece: o primeiro texto ou número do objeto vale como o código, nunca como "nenhum".
      if (!code && !description) {
        const any = Object.values(item).find((value) => (typeof value === 'string' && value.trim()) || typeof value === 'number');
        code = any == null ? '' : String(any).trim();
      }
    }
    if (!code && !description) continue;
    const key = code || description;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ code, description });
  }
  return list;
}
