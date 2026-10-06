/**
 * Validação de domínio brasileiro e clínico.
 * Cada validador devolve `null` quando válido ou uma mensagem em português
 * quando inválido — o formulário exibe a mensagem diretamente.
 */

/** Dígitos verificadores reais do CPF, não apenas contagem de caracteres. */
export function validateCPF(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return null;                       // vazio é tratado por `required`
  if (d.length !== 11) return 'CPF deve ter 11 dígitos.';
  if (/^(\d)\1{10}$/.test(d)) return 'CPF inválido.';

  const check = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  if (check(9) !== Number(d[9]) || check(10) !== Number(d[10])) return 'CPF inválido.';
  return null;
}

/** Cartão Nacional de Saúde — algoritmo de peso 15..1, módulo 11. */
export function validateCNS(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 15) return 'CNS deve ter 15 dígitos.';
  if (!/^[1-2789]/.test(d)) return 'CNS inválido.';

  let sum = 0;
  for (let i = 0; i < 15; i += 1) sum += Number(d[i]) * (15 - i);
  if (sum % 11 !== 0) return 'CNS inválido.';
  return null;
}

export function validateCNPJ(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 14) return 'CNPJ deve ter 14 dígitos.';
  if (/^(\d)\1{13}$/.test(d)) return 'CNPJ inválido.';

  const calc = (len) => {
    const weights = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  if (calc(12) !== Number(d[12]) || calc(13) !== Number(d[13])) return 'CNPJ inválido.';
  return null;
}

export function validateEmail(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'E-mail inválido.';
  return null;
}

/** Celular ou fixo brasileiro, com DDD. */
export function validatePhone(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 10 && d.length !== 11) return 'Telefone deve ter DDD + número.';
  if (Number(d.slice(0, 2)) < 11) return 'DDD inválido.';
  if (d.length === 11 && d[2] !== '9') return 'Celular deve começar com 9 após o DDD.';
  return null;
}

/** Data de nascimento: não pode ser futura nem implausível para pediatria. */
export function validateBirthDate(value) {
  if (!value) return null;
  // Mesma ancoragem ao meio-dia local usada em core/format.js: sem ela, uma
  // data digitada hoje seria lida como "amanhã" e recusada como futura.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return 'Data inválida.';
  const now = new Date();
  if (d > now) return 'A data de nascimento não pode estar no futuro.';
  const years = (now - d) / 31_536_000_000;
  if (years > 120) return 'Data de nascimento implausível.';
  return null;
}

/** CID-10: letra + 2 dígitos, opcionalmente ponto + 1 dígito. Ex.: F84.0 */
export function validateCID10(value) {
  const v = String(value ?? '').trim().toUpperCase();
  if (!v) return null;
  if (!/^[A-TV-Z]\d{2}(\.\d)?$/.test(v)) return 'Código CID-10 inválido (ex.: F84.0).';
  return null;
}

/** CRM: números + UF. Ex.: 173176-SP */
export function validateCRM(value) {
  const v = String(value ?? '').trim().toUpperCase();
  if (!v) return null;
  if (!/^\d{4,7}[-/\s]?[A-Z]{2}$/.test(v)) return 'CRM inválido (ex.: 173176-SP).';
  return null;
}

export function required(value, label = 'Campo') {
  if (value == null) return `${label} é obrigatório.`;
  if (typeof value === 'string' && !value.trim()) return `${label} é obrigatório.`;
  if (Array.isArray(value) && !value.length) return `${label} é obrigatório.`;
  return null;
}

export function minLength(value, min, label = 'Campo') {
  const v = String(value ?? '');
  if (v && v.length < min) return `${label} deve ter ao menos ${min} caracteres.`;
  return null;
}

/**
 * Política de senha. Comprimento pesa mais do que complexidade artificial —
 * 12 caracteres é o piso recomendado pelo NIST SP 800-63B, e a verificação
 * contra listas de senhas vazadas acontece no servidor.
 */
export function validatePassword(value) {
  const v = String(value ?? '');
  if (!v) return null;
  if (v.length < 12) return 'A senha deve ter ao menos 12 caracteres.';
  if (/^(.)\1+$/.test(v)) return 'A senha não pode ser um único caractere repetido.';
  if (/^(?:123456|senha|password|qwerty|abc123)/i.test(v)) return 'Essa senha é previsível demais.';
  return null;
}

/**
 * Executa um mapa de validadores sobre um objeto.
 * `rules` = { campo: [fn, fn, ...] } → devolve { campo: 'mensagem' } ou {}.
 */
export function validate(values, rules) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules)) {
    for (const check of checks) {
      const message = check(values[field], values);
      if (message) { errors[field] = message; break; }
    }
  }
  return errors;
}

export const isValid = (errors) => Object.keys(errors).length === 0;
