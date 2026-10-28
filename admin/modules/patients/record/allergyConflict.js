/**
 * Alergia declarada × medicamento. É um lembrete, não um sistema de suporte à
 * decisão: avisa, nunca bloqueia sozinho. Uma só conta para a visão geral, o
 * painel de Medicações, os modais e a prescrição.
 *
 * Duas camadas: o texto literal (princípio ativo ou nome comercial) e as
 * equivalências abaixo, que cobrem o par que mais engana na prática (a alergia
 * a "dipirona" não aparece em "Novalgina").
 *
 * Tabela montada em 26/10/2026 a partir de bulas (composição das marcas) e de
 * literatura de alergia a fármacos (Drug Allergy Practice Parameter 2022, EAACI/ENDA
 * para AINEs, revisões sobre anticonvulsivantes aromáticos). Falso aviso custa um
 * clique; aviso que falta custa um paciente. A decisão final é do médico: ver
 * docs/redesign-paciente/alergias-tabela-e-fontes.md.
 */

const plain = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim();

// Cada linha é uma família: a alergia a qualquer termo avisa para todos.
// Marcas conferidas em bula (bula.com.br, bulas.med.br, sites de farmácia) em 26/10/2026.
const FAMILIES = [
  // Combinações que levam dipirona na fórmula entram: Dorflex, Lisador, Buscopan Composto e Neosaldina.
  ['dipirona', 'metamizol', 'metamizole', 'novalgina', 'anador', 'neosaldina', 'dorflex', 'lisador', 'buscopan composto', 'magnopyrol', 'conmel'],
  ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina', 'oxacilina', 'piperacilina', 'amoxil', 'clavulan', 'augmentin'],
  // Sulfonamidas ANTIBIÓTICAS. A trimetoprima não é sulfa: fica de fora (ver COMBINED). Sulfato, sulfito e
  // enxofre não são sulfa, e nenhum destes termos casa com eles.
  ['sulfa', 'sulfonamida', 'sulfametoxazol', 'cotrimoxazol', 'bactrim', 'sulfadiazina'],
  // Anticonvulsivantes aromáticos: reagem entre si (40 a 80% nos estudos). A lamotrigina reage menos, mas entra.
  ['carbamazepina', 'tegretol', 'oxcarbazepina', 'trileptal', 'fenitoina', 'hidantal', 'fenobarbital', 'gardenal', 'primidona', 'lamotrigina', 'lamictal', 'zonisamida', 'felbamato'],
  ['cefalosporina', 'cefalexina', 'cefazolina', 'cefuroxima', 'ceftriaxona', 'cefadroxila', 'cefepima'],
];

// Inibidores fortes da COX-1: quem reage a um tende a reagir aos outros (reação cruzada). Nem todo
// paciente é assim (a reação "seletiva" a um só AINE existe, e a da dipirona costuma ser seletiva), mas a
// ficha não guarda o tipo da reação: avisa.
const COX1 = ['aas', 'aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'melhoral', 'somalgin', 'cafiaspirina',
  'ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'cetorolaco', 'piroxicam', 'advil', 'alivium', 'dalsy', 'cataflam', 'voltaren', 'naprosyn'];

// Quando a alergia cita um dos termos de `when`, os medicamentos de `drugs` também avisam. Só nesse sentido.
const COMBINED = [
  // Associações que CONTÊM o componente em que o paciente reagiu.
  { when: ['trimetoprima'], drugs: ['bactrim', 'cotrimoxazol'] },
  // E o sentido inverso: quem reagiu ao cotrimoxazol deve evitar os dois componentes, a trimetoprima isolada
  // inclusive (decisão do dono, 28/10/2026). A alergia só a "sulfa" continua sem avisar a trimetoprima.
  { when: ['bactrim', 'cotrimoxazol'], drugs: ['trimetoprima'] },
  // Penicilina → cefalosporinas de cadeia lateral parecida (amoxicilina–cefadroxila, ampicilina–cefalexina e
  // cefaclor). Cefazolina, ceftriaxona e cefuroxima têm cadeia diferente e não entram (Drug Allergy Practice Parameter, 2022).
  { when: ['penicilina', 'amoxicilina', 'ampicilina'], drugs: ['cefalexina', 'cefadroxila', 'cefaclor'] },
];
// Classe citada na alergia → fármacos que ela alcança. Celecoxibe e etoricoxibe (COX-2) avisam: a maioria
// os tolera, mas só depois de desafio supervisionado.
const CLASSES = [
  // Os da linha COX1 (inclusive as marcas) mais os preferenciais COX-2 e a nimesulida.
  { when: ['aine', 'aines', 'anti-inflamatorio', 'antiinflamatorio'], drugs: [...COX1, 'nimesulida', 'meloxicam', 'etoricoxibe', 'celecoxibe'] },
  ...COMBINED,
];

/** "Nega alergias", "nenhuma", "NKDA", "não", "-" ou vazio não são alergia. */
const NEGATION = /^(nega\w*\b.*|nenhum\w*\b.*|nao|nada|nao\s+(tem|possui|refere|apresenta|ha|conhecid\w*)\b.*|sem\s+(alergia\w*|reacoes?|historico)\b.*|nkda|nka|n\/?a|nd|\W*)$/;
// A negação só vale quando é a frase inteira. Uma ressalva ("exceto", "mas", "só a", ";") ou uma segunda
// oração falando de alergia ou reação ("Nega alergia a remédio. Alergia a látex") mantém o texto como alergia.
// Na dúvida, mostra: aviso a mais custa um clique, alergia engolida custa um paciente.
const RESSALVA = /\b(exceto|excecao|salvo|tirando|a\s+nao\s+ser|mas|porem|contudo|todavia|so|somente|apenas|alem)\b|[;:]/;
const SEGUNDA_ORACAO = /[.,;](?!\s*(?:nenhum|nega|nao|sem\b))(?=.*\b(alerg\w*|reag\w*|reac\w*|sensibil\w*|intoleran\w*))/;

export function declaredAllergies(list = []) {
  return (list ?? [])
    .map((a) => String(a ?? '').trim())
    .filter((a) => {
      if (!a) return false;
      const text = plain(a).replace(/[.;,]+$/g, '');
      return !NEGATION.test(text) || RESSALVA.test(text) || SEGUNDA_ORACAO.test(text);
    });
}

/** Sigla curta ("AAS") e "sulfa" só valem como palavra inteira: "sulfato ferroso" não é sulfa. */
const WHOLE = new Set(['sulfa']);
const PLURAL = new Set(['sulfa']); // "sulfas" também é a família; "sulfato" e "sulfito" continuam fora
const contains = (text, term) => (
  term.length > 4 && !WHOLE.has(term) ? text.includes(term)
    : new RegExp(`(^|[^a-z0-9])${term}${PLURAL.has(term) ? 's?' : ''}([^a-z0-9]|$)`).test(text)
);

/** Termos a procurar no medicamento para uma alergia declarada. */
function termsFor(allergy) {
  const a = plain(allergy);
  const terms = new Set([a]);
  for (const family of FAMILIES) {
    if (family.some((t) => contains(a, t) || (a.length > 4 && t.includes(a)))) family.forEach((t) => terms.add(t));
  }
  // Reação cruzada entre inibidores da COX-1.
  if (COX1.some((t) => contains(a, t))) COX1.forEach((t) => terms.add(t));
  for (const cls of CLASSES) {
    if (cls.when.some((t) => contains(a, t))) cls.drugs.forEach((t) => terms.add(t));
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
