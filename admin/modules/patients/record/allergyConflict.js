/**
 * Alergia declarada × medicamento. É um lembrete, não um sistema de suporte à
 * decisão: avisa, nunca bloqueia sozinho. Uma só conta para a visão geral, o
 * painel de Medicações, os modais e a prescrição.
 *
 * Duas camadas: o texto literal (princípio ativo ou nome comercial) e as
 * equivalências abaixo, que cobrem o par que mais engana na prática (a alergia
 * a "dipirona" não aparece em "Novalgina").
 *
 * REVISÃO CLÍNICA PENDENTE (dono): a tabela de equivalências foi escrita de
 * forma conservadora, só com sinônimos e marcas de uso corrente. Falso aviso
 * custa um clique; aviso que falta custa um paciente.
 */

const plain = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim();

// Cada linha é uma família: a alergia a qualquer termo avisa para todos.
const FAMILIES = [
  // Combinações que levam dipirona na fórmula entram: quem é alérgico a ela não pode tomá-las.
  ['dipirona', 'metamizol', 'metamizole', 'novalgina', 'anador', 'neosaldina', 'dorflex', 'lisador', 'buscopan composto', 'magnopyrol', 'conmel'],
  ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina', 'oxacilina', 'piperacilina', 'amoxil', 'clavulan', 'augmentin'],
  ['sulfa', 'sulfonamida', 'sulfametoxazol', 'bactrim', 'trimetoprima'],
  ['aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'aas', 'melhoral', 'somalgin', 'cafiaspirina'],
  ['cefalosporina', 'cefalexina', 'cefazolina', 'cefuroxima', 'ceftriaxona', 'cefadroxila', 'cefepima'],
];
// Classe citada na alergia → fármacos que ela alcança.
const CLASSES = [
  { when: ['aine', 'anti-inflamatorio', 'antiinflamatorio'], drugs: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'nimesulida', 'meloxicam', 'piroxicam', 'cetorolaco', 'etoricoxibe', 'celecoxibe'] },
];

/** "Nega alergias", "nenhuma", "NKDA", "-" ou vazio não são alergia. */
const NEGATION = /^(nega\w*\b.*|nenhum\w*\b.*|nao\s+(tem|possui|refere|apresenta|ha|conhecid\w*)\b.*|sem\s+(alergia\w*|reacoes?|historico)\b.*|nkda|nka|n\/?a|nd|\W*)$/;

export function declaredAllergies(list = []) {
  return (list ?? [])
    .map((a) => String(a ?? '').trim())
    .filter((a) => a && !NEGATION.test(plain(a).replace(/[.;,]+$/g, '')));
}

/** Sigla curta ("AAS") só vale como palavra inteira: dentro de outro nome é coincidência. */
const contains = (text, term) => (
  term.length > 4 ? text.includes(term) : new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`).test(text)
);

/** Termos a procurar no medicamento para uma alergia declarada. */
function termsFor(allergy) {
  const a = plain(allergy);
  const terms = new Set([a]);
  for (const family of FAMILIES) {
    if (family.some((t) => contains(a, t) || (a.length > 4 && t.includes(a)))) family.forEach((t) => terms.add(t));
  }
  for (const cls of CLASSES) {
    if (cls.when.some((t) => a.includes(t))) cls.drugs.forEach((t) => terms.add(t));
  }
  return [...terms];
}

export function allergyConflict(medication, allergies = []) {
  const needle = plain(`${medication.principioAtivo ?? ''} ${medication.nome ?? ''}`);
  return declaredAllergies(allergies).filter((allergy) => (
    plain(allergy).length > 2 && termsFor(allergy).some((t) => t.length > 2 && contains(needle, t))
  ));
}

/** Para texto livre (adendo, plano, item da prescrição): a mesma conta. */
export function allergyHits(text, allergies = []) {
  return allergyConflict({ nome: text }, allergies);
}
