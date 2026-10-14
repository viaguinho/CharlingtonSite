import * as repo from '../../data/repository.js';

/* Timbrado próprio de uma unidade: imagem guardada nos metadados da clínica (no cofre local em modo local;
   na tabela de metadados do servidor em modo servidor). Sem ele, vale o papel timbrado de Campinas,
   herdado do painel anterior. Proporção aceita: A4 retrato com tolerância de ±0,05 na razão altura/largura (≈ ±3,5%). */

const key = (plaza) => `timbrado.${plaza}`;
const MAX_BYTES = 6 * 1024 * 1024;
const A4_RATIO = 297 / 210;

export async function loadCustomLetterhead(plaza) {
  if (!plaza) return null;
  try {
    return (await repo.getMeta(key(plaza))) || null;
  } catch {
    return null;
  }
}

export async function clearCustomLetterhead(plaza) {
  await repo.setMeta(key(plaza), null);
}

/** Valida e converte a imagem escolhida. Recusa o que não imprimiria bem numa folha A4. */
export async function saveCustomLetterhead(plaza, file) {
  if (!file) throw new Error('Nenhum arquivo escolhido.');
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Envie uma imagem JPG ou PNG.');
  if (file.size > MAX_BYTES) throw new Error('A imagem passa de 6 MB. Reduza o arquivo e tente de novo.');

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });

  const { width, height } = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('O arquivo não é uma imagem válida.'));
    image.src = dataUrl;
  });
  if (width < 800) throw new Error('A imagem é pequena demais para imprimir (mínimo de 800 px de largura).');
  if (Math.abs(height / width - A4_RATIO) > 0.05) {
    throw new Error('A imagem precisa ter a proporção de uma folha A4 (retrato), com o cabeçalho e o rodapé já impressos. Tolerância de cerca de 3,5%.');
  }

  await repo.setMeta(key(plaza), dataUrl);
  return dataUrl;
}
