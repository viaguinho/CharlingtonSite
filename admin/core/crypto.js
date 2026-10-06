/**
 * Criptografia do painel — WebCrypto apenas, sem dependência externa.
 *
 * Duas responsabilidades distintas:
 *
 *  1. Cifrar o armazenamento local (modo local-first). A chave é derivada da
 *     senha do usuário e vive APENAS em memória durante a sessão. Ao bloquear
 *     a tela, sair ou expirar a sessão, a chave é descartada e o IndexedDB
 *     fica ilegível mesmo para quem tenha acesso físico à máquina.
 *
 *  2. Calcular hashes SHA-256 para a cadeia de auditoria e para a assinatura
 *     de documentos clínicos.
 *
 * NÃO é responsabilidade deste módulo tratar senha de autenticação: o hash de
 * senha (Argon2id) acontece no servidor. O navegador nunca vê hash de senha.
 */

const KDF_ITERATIONS = 600_000;   // NIST SP 800-63B para PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12;              // 96 bits, tamanho canônico para AES-GCM

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ————————————————————————————— Codificação ————————————————————————————— */

export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ————————————————————————————————— Hash ————————————————————————————————— */

/** SHA-256 em hexadecimal. Base da cadeia de auditoria e do selo de documento. */
export async function sha256(input) {
  const data = typeof input === 'string' ? enc.encode(input) : input;
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

/**
 * Serialização canônica antes do hash: chaves ordenadas, sem espaços.
 * Sem isso, o mesmo objeto produziria hashes diferentes conforme a ordem de
 * inserção das propriedades — e a cadeia de auditoria seria inverificável.
 */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

export const hashObject = (obj) => sha256(canonicalize(obj));

/* —————————————————————————— Derivação de chave —————————————————————————— */

export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export const newSalt = () => randomBytes(SALT_BYTES);

/**
 * Deriva a chave de cifragem local a partir da senha.
 * `extractable: false` impede que a chave seja exportada por qualquer código
 * que rode na página — inclusive por um XSS que tenha escapado das defesas.
 */
export async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,                              // não exportável
    ['encrypt', 'decrypt'],
  );
}

/* ———————————————————————————— Cifra simétrica ———————————————————————————— */

/** Cifra um valor serializável. Devolve { iv, data } em base64. */
export async function encrypt(key, value) {
  const iv = randomBytes(IV_BYTES);
  const plaintext = enc.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: toBase64(iv), data: toBase64(cipher) };
}

/** Decifra { iv, data }. Lança se a chave estiver errada ou o dado adulterado. */
export async function decrypt(key, envelope) {
  const iv = fromBase64(envelope.iv);
  const cipher = fromBase64(envelope.data);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(dec.decode(plaintext));
}

/** Cifra binário bruto (anexos) sem passar por JSON. */
export async function encryptBlob(key, arrayBuffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  return { iv: toBase64(iv), data: cipher };
}

export async function decryptBlob(key, envelope) {
  const iv = fromBase64(envelope.iv);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, envelope.data);
}

/* ——————————————————————————— Cofre de sessão ———————————————————————————
   A chave derivada nunca sai deste módulo e nunca é escrita em disco,
   localStorage ou sessionStorage. Vive num closure e é zerada ao bloquear. */

let sessionKey = null;
let sessionSalt = null;

export async function unlock(password, saltBase64) {
  const salt = saltBase64 ? fromBase64(saltBase64) : newSalt();
  sessionKey = await deriveKey(password, salt);
  sessionSalt = toBase64(salt);
  return sessionSalt;
}

export function lock() {
  sessionKey = null;
  sessionSalt = null;
}

export const isUnlocked = () => sessionKey !== null;
export const getSalt = () => sessionSalt;

export function getKey() {
  if (!sessionKey) {
    throw new Error('Cofre bloqueado. É necessário autenticar novamente.');
  }
  return sessionKey;
}

/** Identificador opaco. UUID v4 — nunca sequencial, para não permitir enumeração. */
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = toHex(b);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Token de uso único para portal de anamnese e links expiráveis. */
export function token(bytes = 32) {
  return toHex(randomBytes(bytes));
}
