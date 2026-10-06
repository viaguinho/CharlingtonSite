/**
 * Marcos do desenvolvimento neuropsicomotor.
 *
 * Referência clínica de domínio público, consolidada a partir dos marcos
 * usados na puericultura brasileira (Caderneta da Criança / Ministério da
 * Saúde) e na literatura pediátrica corrente. `idadeEsperada` é a idade em
 * meses em que o marco é esperado na maioria das crianças; `idadeLimite` é a
 * idade a partir da qual a ausência do marco justifica investigação.
 *
 * É referência normativa, não dado de paciente.
 */

import { DEVELOPMENT_DOMAINS as D } from './schema.js';

export const MILESTONES = [
  // ——— 0 a 3 meses ———
  { id: 'sustenta-cabeca', dominio: D.GROSS_MOTOR, marco: 'Sustenta a cabeça', idadeEsperada: 3, idadeLimite: 4 },
  { id: 'segue-objeto', dominio: D.FINE_MOTOR, marco: 'Segue objeto na linha média', idadeEsperada: 2, idadeLimite: 3 },
  { id: 'sorriso-social', dominio: D.SOCIAL, marco: 'Sorriso social', idadeEsperada: 2, idadeLimite: 3 },
  { id: 'reage-som', dominio: D.LANGUAGE, marco: 'Reage a sons', idadeEsperada: 1, idadeLimite: 3 },

  // ——— 4 a 6 meses ———
  { id: 'rola', dominio: D.GROSS_MOTOR, marco: 'Rola da barriga para as costas', idadeEsperada: 5, idadeLimite: 7 },
  { id: 'senta-apoio', dominio: D.GROSS_MOTOR, marco: 'Senta com apoio', idadeEsperada: 6, idadeLimite: 8 },
  { id: 'alcanca-objeto', dominio: D.FINE_MOTOR, marco: 'Alcança e pega objetos', idadeEsperada: 5, idadeLimite: 7 },
  { id: 'balbucia', dominio: D.LANGUAGE, marco: 'Balbucia sons repetidos', idadeEsperada: 6, idadeLimite: 8 },
  { id: 'reconhece-cuidador', dominio: D.SOCIAL, marco: 'Reconhece o cuidador principal', idadeEsperada: 4, idadeLimite: 6 },

  // ——— 7 a 12 meses ———
  { id: 'senta-sem-apoio', dominio: D.GROSS_MOTOR, marco: 'Senta sem apoio', idadeEsperada: 8, idadeLimite: 10 },
  { id: 'engatinha', dominio: D.GROSS_MOTOR, marco: 'Engatinha ou se desloca', idadeEsperada: 9, idadeLimite: 12 },
  { id: 'fica-em-pe', dominio: D.GROSS_MOTOR, marco: 'Fica em pé com apoio', idadeEsperada: 10, idadeLimite: 12 },
  { id: 'pinca', dominio: D.FINE_MOTOR, marco: 'Pinça polegar-indicador', idadeEsperada: 10, idadeLimite: 12 },
  { id: 'primeiras-palavras', dominio: D.LANGUAGE, marco: 'Fala as primeiras palavras com sentido', idadeEsperada: 12, idadeLimite: 15 },
  { id: 'aponta', dominio: D.SOCIAL, marco: 'Aponta para pedir ou mostrar', idadeEsperada: 12, idadeLimite: 15 },
  { id: 'atencao-compartilhada', dominio: D.SOCIAL, marco: 'Atenção compartilhada (olha para onde o adulto aponta)', idadeEsperada: 12, idadeLimite: 15 },
  { id: 'permanencia-objeto', dominio: D.COGNITIVE, marco: 'Permanência do objeto', idadeEsperada: 9, idadeLimite: 12 },

  // ——— 13 a 24 meses ———
  { id: 'anda-sozinho', dominio: D.GROSS_MOTOR, marco: 'Anda sem apoio', idadeEsperada: 13, idadeLimite: 18 },
  { id: 'sobe-escada', dominio: D.GROSS_MOTOR, marco: 'Sobe degraus com apoio', idadeEsperada: 20, idadeLimite: 24 },
  { id: 'rabisca', dominio: D.FINE_MOTOR, marco: 'Rabisca espontaneamente', idadeEsperada: 18, idadeLimite: 24 },
  { id: 'torre-blocos', dominio: D.FINE_MOTOR, marco: 'Empilha 3 ou 4 blocos', idadeEsperada: 21, idadeLimite: 26 },
  { id: 'dez-palavras', dominio: D.LANGUAGE, marco: 'Vocabulário de ao menos 10 palavras', idadeEsperada: 18, idadeLimite: 20 },
  { id: 'duas-palavras', dominio: D.LANGUAGE, marco: 'Combina duas palavras', idadeEsperada: 24, idadeLimite: 27 },
  { id: 'cumpre-ordem', dominio: D.LANGUAGE, marco: 'Cumpre ordem simples sem gesto', idadeEsperada: 18, idadeLimite: 22 },
  { id: 'faz-de-conta', dominio: D.SOCIAL, marco: 'Brincadeira de faz de conta simples', idadeEsperada: 20, idadeLimite: 26 },
  { id: 'come-sozinho', dominio: D.ADAPTIVE, marco: 'Come sozinho com a colher', idadeEsperada: 20, idadeLimite: 26 },

  // ——— 2 a 3 anos ———
  { id: 'corre', dominio: D.GROSS_MOTOR, marco: 'Corre com equilíbrio', idadeEsperada: 26, idadeLimite: 32 },
  { id: 'pula-dois-pes', dominio: D.GROSS_MOTOR, marco: 'Pula com os dois pés', idadeEsperada: 30, idadeLimite: 36 },
  { id: 'frases-tres', dominio: D.LANGUAGE, marco: 'Forma frases de três palavras', idadeEsperada: 30, idadeLimite: 36 },
  { id: 'fala-compreensivel', dominio: D.LANGUAGE, marco: 'Fala compreensível para estranhos em 50% do tempo', idadeEsperada: 30, idadeLimite: 36 },
  { id: 'brinca-com-outras', dominio: D.SOCIAL, marco: 'Brinca junto de outras crianças', idadeEsperada: 30, idadeLimite: 42 },
  { id: 'controle-esfincter', dominio: D.ADAPTIVE, marco: 'Controle esfincteriano diurno', idadeEsperada: 30, idadeLimite: 42 },
  { id: 'nomeia-cores', dominio: D.COGNITIVE, marco: 'Nomeia ao menos uma cor', idadeEsperada: 36, idadeLimite: 42 },

  // ——— 3 a 5 anos ———
  { id: 'pula-um-pe', dominio: D.GROSS_MOTOR, marco: 'Pula em um pé só', idadeEsperada: 48, idadeLimite: 60 },
  { id: 'copia-circulo', dominio: D.FINE_MOTOR, marco: 'Copia um círculo', idadeEsperada: 36, idadeLimite: 48 },
  { id: 'copia-quadrado', dominio: D.FINE_MOTOR, marco: 'Copia um quadrado', idadeEsperada: 54, idadeLimite: 60 },
  { id: 'desenha-pessoa', dominio: D.FINE_MOTOR, marco: 'Desenha figura humana com 3 partes', idadeEsperada: 48, idadeLimite: 60 },
  { id: 'conta-historia', dominio: D.LANGUAGE, marco: 'Conta uma história curta com começo e fim', idadeEsperada: 54, idadeLimite: 66 },
  { id: 'veste-se', dominio: D.ADAPTIVE, marco: 'Veste-se com pouca ajuda', idadeEsperada: 48, idadeLimite: 60 },
  { id: 'conta-ate-dez', dominio: D.COGNITIVE, marco: 'Conta até dez', idadeEsperada: 54, idadeLimite: 66 },
  { id: 'segue-regras', dominio: D.SOCIAL, marco: 'Segue regras em jogo simples', idadeEsperada: 54, idadeLimite: 66 },
];

/** Faixas etárias usadas para agrupar a grade visual. */
export const AGE_BANDS = [
  { id: '0-3', label: '0 a 3 meses', from: 0, to: 3 },
  { id: '4-6', label: '4 a 6 meses', from: 4, to: 6 },
  { id: '7-12', label: '7 a 12 meses', from: 7, to: 12 },
  { id: '13-24', label: '13 a 24 meses', from: 13, to: 24 },
  { id: '25-36', label: '2 a 3 anos', from: 25, to: 36 },
  { id: '37-66', label: '3 a 5 anos', from: 37, to: 66 },
];

export const bandForAge = (months) =>
  AGE_BANDS.find((b) => months >= b.from && months <= b.to) ?? null;

/** Marcos que já deveriam ter sido atingidos na idade informada. */
export function expectedBy(months) {
  if (months == null) return [];
  return MILESTONES.filter((m) => m.idadeLimite <= months);
}
