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
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// "Co-trimoxazol", "A.A.S." e "anti inflamatório" são o mesmo termo sem hífen, ponto e espaço depois de "anti".
// O texto é conferido nas duas formas: a original (a sigla "SMX-TMP" ainda separa "SMX") e a compactada.
const squash = (text) => text.replace(/\banti[\s-]+/g, 'anti').replace(/[-.]/g, '');
const forms = (value) => {
  const original = plain(value);
  const compact = squash(original);
  return compact === original ? [original] : [original, compact];
};

// Cada lista é uma família: a alergia a qualquer termo avisa para todos.
// Marcas conferidas em bula (bula.com.br, bulas.med.br, sites de farmácia) em 26/10/2026; as acrescentadas em
// 28/10/2026 estão listadas em docs/redesign-paciente/alergias-tabela-e-fontes.md com o que falta conferir.
// Combinações que levam dipirona na fórmula entram: Dorflex, Lisador, Buscopan Composto, Neosaldina, Cefaliv,
// Sedalgina e Doralgina.
const DIPIRONA = ['dipirona', 'metamizol', 'metamizole', 'novalgina', 'anador', 'neosaldina', 'dorflex', 'lisador', 'buscopan composto', 'magnopyrol', 'conmel', 'cefaliv', 'sedalgina', 'doralgina'];
const PENICILINA = ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina', 'oxacilina', 'piperacilina', 'amoxil', 'amox', 'clavulan', 'augmentin', 'clavulin', 'benzetacil', 'unasyn', 'tazocin'];
const CEFALOSPORINA = ['cefalosporina', 'cefalexina', 'cefazolina', 'cefuroxima', 'ceftriaxona', 'cefadroxila', 'cefepima', 'cefaclor', 'cefixima', 'cefotaxima', 'ceftazidima', 'keflex', 'rocefin', 'zinnat'];
// Anticonvulsivantes aromáticos: reagem entre si (40 a 80% nos estudos). A lamotrigina reage menos, mas entra.
const AROMATICOS = ['carbamazepina', 'tegretol', 'oxcarbazepina', 'trileptal', 'fenitoina', 'hidantal', 'epelin', 'fenobarbital', 'gardenal', 'primidona', 'lamotrigina', 'lamictal', 'lamitor', 'zonisamida', 'felbamato'];

const FAMILIES = [
  DIPIRONA,
  PENICILINA,
  // Sulfonamidas ANTIBIÓTICAS. A trimetoprima não é sulfa: fica de fora (ver COMBINED). Sulfato, sulfito e
  // enxofre não são sulfa, e nenhum destes termos casa com eles.
  ['sulfa', 'sulfonamida', 'sulfametoxazol', 'smx', 'cotrimoxazol', 'bactrim', 'sulfadiazina'],
  AROMATICOS,
  CEFALOSPORINA,
];

// Inibidores fortes da COX-1: quem reage a um tende a reagir aos outros (reação cruzada). Nem todo
// paciente é assim (a reação "seletiva" a um só AINE existe, e a da dipirona costuma ser seletiva), mas a
// ficha não guarda o tipo da reação: avisa.
const COX1 = ['aas', 'aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'melhoral', 'somalgin', 'cafiaspirina',
  'ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'cetorolaco', 'piroxicam', 'advil', 'alivium', 'dalsy', 'cataflam', 'voltaren', 'naprosyn',
  'indometacina', 'tenoxicam', 'mefenamico', 'ponstan', 'profenid', 'buscofem'];

// Quando a alergia cita um dos termos de `when`, os medicamentos de `drugs` também avisam. Só nesse sentido.
const COMBINED = [
  // Associações que CONTÊM o componente em que o paciente reagiu.
  { when: ['trimetoprima'], drugs: ['bactrim', 'cotrimoxazol'] },
  // E o sentido inverso: quem reagiu ao cotrimoxazol deve evitar os dois componentes, a trimetoprima isolada
  // inclusive (decisão do dono, 28/10/2026). A alergia só a "sulfa" continua sem avisar a trimetoprima.
  { when: ['bactrim', 'cotrimoxazol', 'smxtmp', 'smx tmp'], drugs: ['trimetoprima'] },
  // Penicilina → cefalosporinas de cadeia lateral parecida (amoxicilina–cefadroxila, ampicilina–cefalexina e
  // cefaclor). Cefazolina, ceftriaxona e cefuroxima têm cadeia diferente e não entram (Drug Allergy Practice Parameter, 2022).
  { when: ['penicilina', 'amoxicilina', 'ampicilina'], drugs: ['cefalexina', 'cefadroxila', 'cefaclor', 'keflex'] },
];
// Classe citada na alergia → fármacos que ela alcança. Celecoxibe e etoricoxibe (COX-2) avisam: a maioria
// os tolera, mas só depois de desafio supervisionado.
const CLASSES = [
  // Os da linha COX1 (inclusive as marcas) mais os preferenciais COX-2 e a nimesulida.
  { when: ['aine', 'aines', 'ainh', 'ainhs', 'antiinflamatorio', 'antinflamatorio'], drugs: [...COX1, 'nimesulida', 'meloxicam', 'etoricoxibe', 'celecoxibe'] },
  // "Betalactâmicos" reúne penicilinas, cefalosporinas e carbapenêmicos.
  { when: ['betalactamico'], drugs: [...PENICILINA, ...CEFALOSPORINA, 'meropenem', 'imipenem', 'ertapenem', 'carbapenem'] },
  { when: ['anticonvulsivante'], drugs: AROMATICOS },
  // A dipirona é uma pirazolona.
  { when: ['pirazolona'], drugs: DIPIRONA },
  ...COMBINED,
];

/**
 * Negação pura: o texto inteiro é feito só de negação e de palavras de enchimento ("Nega alergias
 * medicamentosas", "Nenhuma conhecida", "NKDA", "-"). Qualquer outra palavra ("exceto", "dipirona",
 * "urticária", "látex", "mas") faz o texto valer como alergia: na dúvida, mostrar. Alergia engolida custa um
 * paciente; um falso aviso custa um clique ("Nega alergia a dipirona" aparece como alergia).
 */
const NEGATORS = /^(nega\w*|nenhum\w*|nao|nada|sem|nkda|nka|nd|ausenc\w*|ausente|negativ\w*)$/;
const FILLER = new Set([
  'a', 'o', 'as', 'os', 'ao', 'aos', 'de', 'da', 'das', 'do', 'dos', 'e', 'ou', 'nem', 'em', 'no', 'na', 'por', 'ate',
  'tem', 'tinha', 'possui', 'refere', 'relata', 'relatada', 'relatado', 'apresenta', 'ha', 'qualquer', 'tipo',
  'alergia', 'alergias', 'alergico', 'alergica', 'reacao', 'reacoes', 'adversa', 'adversas', 'historico',
  'medicamento', 'medicamentos', 'medicamentosa', 'medicamentosas', 'remedio', 'remedios', 'droga', 'drogas',
  'farmaco', 'farmacos', 'alimento', 'alimentos', 'alimentar', 'alimentares', 'ambiental', 'ambientais',
  'conhecido', 'conhecida', 'conhecidos', 'conhecidas', 'conhecimento', 'registrada', 'registrado', 'registradas',
  'registrados', 'informada', 'informado', 'referida', 'referido', 'momento', 'agora', 'atual', 'atualmente', 'paciente',
]);

function isPlainNegation(text) {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return true;                       // vazio, "-", "."
  if (/^n ?\/ ?a$/.test(text)) return true;             // "N/A"
  return words.some((w) => NEGATORS.test(w)) && words.every((w) => NEGATORS.test(w) || FILLER.has(w));
}

/** A ficha guarda uma lista de textos; texto solto e objeto também aparecem (jsonb sem esquema). */
function allergyTexts(list) {
  if (list == null || list === '') return [];
  const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/[;\n,]+/) : [list];
  return items.flatMap((item) => {
    if (item == null) return [];
    if (typeof item === 'object') {
      const named = item.nome ?? item.descricao ?? item.alergeno ?? item.substancia ?? item.texto ?? item.name;
      return [typeof named === 'string' && named.trim() ? named : 'Alergia em formato ilegível'];
    }
    return [String(item)];
  });
}

export function declaredAllergies(list = []) {
  return allergyTexts(list)
    .map((a) => a.trim())
    .filter((a) => a && !isPlainNegation(plain(a)));
}

/** Sigla curta ("AAS") e "sulfa" só valem como palavra inteira: "sulfato ferroso" não é sulfa. */
const WHOLE = new Set(['sulfa']);
const PLURAL = new Set(['sulfa']); // "sulfas" também é a família; "sulfato" e "sulfito" continuam fora
const contains = (text, term) => (
  term.length > 4 && !WHOLE.has(term) ? text.includes(term)
    : new RegExp(`(^|[^a-z0-9])${term}${PLURAL.has(term) ? 's?' : ''}([^a-z0-9]|$)`).test(text)
);
const has = (textForms, term) => textForms.some((form) => contains(form, term));

/** Termos a procurar no medicamento para uma alergia declarada. */
function termsFor(allergy) {
  const af = forms(allergy);
  const terms = new Set(af);
  // Alergia a uma combinação ("sulfametoxazol + trimetoprima", "amoxicilina/clavulanato") vale para cada componente.
  for (const form of af) {
    for (const part of form.split(/\s*[+/&]\s*|\s+(?:e|com|mais)\s+/)) if (part.length > 2) terms.add(part);
  }
  for (const family of FAMILIES) {
    if (family.some((t) => has(af, t) || (af[0].length > 4 && t.includes(af[0])))) family.forEach((t) => terms.add(t));
  }
  // Reação cruzada entre inibidores da COX-1.
  if (COX1.some((t) => has(af, t))) COX1.forEach((t) => terms.add(t));
  for (const cls of CLASSES) {
    if (cls.when.some((t) => has(af, t))) cls.drugs.forEach((t) => terms.add(t));
  }
  return [...terms];
}

/**
 * `medication` pode trazer nome, princípio, concentração, quantidade, posologia e observações: "Paracetamol,
 * se não ceder, dipirona" é prescrição de dipirona. O nome do remédio não é o único lugar onde ele aparece.
 */
export function allergyConflict(medication, allergies = []) {
  const needles = forms([
    medication.principioAtivo, medication.nome, medication.concentracao,
    medication.quantidade, medication.posologia, medication.observacoes,
  ].filter(Boolean).join(' '));
  return declaredAllergies(allergies).filter((allergy) => (
    plain(allergy).length > 2 && termsFor(allergy).some((t) => t.length > 2 && has(needles, t))
  ));
}

/** Para texto livre (adendo, plano, item da prescrição): a mesma conta. */
export function allergyHits(text, allergies = []) {
  return allergyConflict({ nome: text }, allergies);
}
