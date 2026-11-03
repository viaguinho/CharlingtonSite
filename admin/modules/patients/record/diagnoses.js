/**
 * Diagnósticos da ficha, sempre como lista de { code, description }. O jsonb não tem esquema: já apareceram texto
 * solto ("G40.9"), lista de textos, objeto com `codigo`, objeto com `cid`, chave que o esquema não conhece e número.
 * Um formato inesperado não pode derrubar o cabeçalho nem a coluna (é ali que a alergia aparece), e nunca vira
 * "nenhum diagnóstico".
 */
const CODE_KEYS = ['codigo', 'cid', 'code', 'cid10'];
const TEXT_KEYS = ['descricao', 'nome', 'texto', 'name', 'description'];
const CID_START = /^[A-Za-z]\d{2}/;

/** "G40.9 Epilepsia, não especificada; F90.0 TDAH": corta em ; e quebra de linha, e em vírgula só entre códigos. */
function splitText(text) {
  return text.split(/[;\n]+/).flatMap((part) => {
    const pieces = part.split(',').map((x) => x.trim()).filter(Boolean);
    return pieces.length > 1 && pieces.every((x) => CID_START.test(x)) ? pieces : [part.trim()];
  });
}

const usable = (value) => (typeof value === 'string' && value.trim()) || typeof value === 'number';

export function diagnosesOf(patient) {
  const raw = patient?.clinico?.diagnosticos;
  if (raw == null || raw === '' || raw === false) return [];
  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? splitText(raw) : [raw];
  const seen = new Set();
  const list = [];
  for (const item of items) {
    let code = '';
    let description = null;
    if (typeof item === 'string' || typeof item === 'number') {
      const text = String(item).trim();
      // Texto com o código na frente ("G40.9 Epilepsia"): o código é o chip e o resto é a descrição.
      const split = /^([A-Za-z]\d{2}(?:\.\w+)?)\s+(.+)$/.exec(text);
      if (split) { code = split[1]; description = split[2]; } else code = text;
    } else if (item && typeof item === 'object') {
      const pick = (keys) => keys.map((key) => item[key]).find(usable);
      code = String(pick(CODE_KEYS) ?? '').trim();
      description = String(pick(TEXT_KEYS) ?? '').trim() || null;
      // Chave que o esquema não conhece: o primeiro texto ou número do objeto vale como o código.
      if (!code && !description) {
        const any = Object.values(item).find(usable);
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
