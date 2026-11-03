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
  .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')   // espaço de largura zero (texto colado de PDF) não pode anular a busca
  .toLowerCase().replace(/\s+/g, ' ').trim();

// "Co-trimoxazol", "A.A.S.", "anti inflamatório" e "beta lactâmico" são o mesmo termo sem hífen, ponto e espaço
// depois de "anti" e "beta". O texto é conferido em três formas: a original (a sigla "SMX-TMP" ainda separa
// "SMX"), a compactada e a com hífen, barra e "+" trocados por espaço ("SMX/TMP" e "SMX+TMP" viram "smx tmp").
const squash = (text) => text.replace(/\b(anti|beta)[\s-]+/g, '$1').replace(/[-.]/g, '');
const forms = (value) => {
  const original = plain(value);
  const spaced = original.replace(/[-/+&]+/g, ' ').replace(/\s+/g, ' ').trim();
  return [...new Set([original, squash(original), spaced])];
};

// Cada lista é uma família: a alergia a qualquer termo avisa para todos.
// Marcas conferidas em bula (bula.com.br, bulas.med.br, sites de farmácia) em 26/10/2026; as acrescentadas em
// 28/10/2026 estão listadas em docs/redesign-paciente/alergias-tabela-e-fontes.md com o que falta conferir.
// Combinações que levam dipirona na fórmula entram: Dorflex, Lisador, Buscopan Composto, Neosaldina, Cefaliv,
// Sedalgina e Doralgina.
const DIPIRONA = ['dipirona', 'metamizol', 'metamizole', 'novalgina', 'anador', 'neosaldina', 'dorflex', 'lisador', 'buscopan composto', 'magnopyrol', 'conmel', 'cefaliv', 'sedalgina', 'doralgina'];
const PENICILINA = ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina', 'oxacilina', 'piperacilina', 'amoxil', 'amox', 'clavulan', 'augmentin', 'clavulin', 'benzetacil', 'unasyn', 'tazocin'];
const CEFALOSPORINA = ['cefalosporina', 'cefalexina', 'cefazolina', 'cefuroxima', 'ceftriaxona', 'cefadroxila', 'cefepima', 'cefaclor', 'cefixima', 'cefotaxima', 'ceftazidima', 'cefpodoxima', 'cefalotina', 'cefprozil', 'cefdinir', 'cefoxitina', 'cefradina', 'keflex', 'rocefin', 'zinnat', 'cefamox'];
// Anticonvulsivantes aromáticos: reagem entre si (40 a 80% nos estudos). A lamotrigina reage menos, mas entra.
const AROMATICOS = ['carbamazepina', 'tegretol', 'oxcarbazepina', 'trileptal', 'fenitoina', 'hidantal', 'epelin', 'fenobarbital', 'gardenal', 'primidona', 'lamotrigina', 'lamictal', 'lamitor', 'zonisamida', 'felbamato'];

// Formulário da neuropediatria: o mesmo fármaco sob sal, forma e marca. A alergia a qualquer um avisa para os outros.
// Marcas bem conhecidas; a revisão médica da lista está em docs/redesign-paciente/alergias-tabela-e-fontes.md.
const VALPROATO = ['valpro', 'depakene', 'depakote', 'valpakine'];   // "valpro" cobre valproato, valproico e divalproato
const METILFENIDATO = ['metilfenidato', 'ritalina', 'concerta'];
const RISPERIDONA = ['risperidona', 'risperdal'];
const CLOBAZAM = ['clobazam', 'frisium', 'urbanil'];
const LEVETIRACETAM = ['levetiracetam', 'keppra'];
const TOPIRAMATO = ['topiramato', 'topamax'];
const GABAPENTINA = ['gabapentina', 'neurontin'];
const CLONAZEPAM = ['clonazepam', 'rivotril'];
const DIAZEPAM = ['diazepam', 'valium'];
const VIGABATRINA = ['vigabatrina', 'sabril'];
const LACOSAMIDA = ['lacosamida', 'vimpat'];
const ARIPIPRAZOL = ['aripiprazol', 'abilify'];
const ATOMOXETINA = ['atomoxetina', 'strattera'];

const FAMILIES = [
  DIPIRONA,
  PENICILINA,
  // Sulfonamidas ANTIBIÓTICAS (e as arilaminas afins: sulfacetamida, sulfadoxina, sulfassalazina). A trimetoprima
  // não é sulfa: fica de fora (ver COMBINED). Sulfato, sulfito e enxofre não são sulfa, e nenhum destes termos casa com eles.
  ['sulfa', 'sulfonamida', 'sulfametoxazol', 'smx', 'smz', 'cotrimoxazol', 'bactrim', 'infectrin', 'assepium', 'sulfadiazina',
    'sulfacetamida', 'sulfadoxina', 'sulfassalazina', 'sulfasalazina'],
  AROMATICOS,
  CEFALOSPORINA,
  VALPROATO, METILFENIDATO, RISPERIDONA, CLOBAZAM, LEVETIRACETAM, TOPIRAMATO, GABAPENTINA, CLONAZEPAM, DIAZEPAM,
  VIGABATRINA, LACOSAMIDA, ARIPIPRAZOL, ATOMOXETINA,
];

// Inibidores fortes da COX-1: quem reage a um tende a reagir aos outros (reação cruzada). Nem todo
// paciente é assim (a reação "seletiva" a um só AINE existe, e a da dipirona costuma ser seletiva), mas a
// ficha não guarda o tipo da reação: avisa.
const COX1 = ['aas', 'aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'melhoral', 'somalgin', 'cafiaspirina',
  'ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'cetorolaco', 'piroxicam', 'advil', 'alivium', 'dalsy', 'cataflam', 'voltaren', 'naprosyn',
  'indometacina', 'tenoxicam', 'mefenamico', 'ponstan', 'profenid', 'buscofem',
  'flanax', 'toragesic', 'feldene', 'tilatil', 'tandrilax', 'torsilax', 'sonrisal', 'alka seltzer', 'ecasil'];

// Quando a alergia cita um dos termos de `when`, os medicamentos de `drugs` também avisam. Só nesse sentido.
// `whenAll`: cada grupo precisa casar com um de seus termos ("sulfametoxazol-trimetoprima" escrito com hífen).
// "TMP" e "SMX/SMZ" são as siglas de uso corrente; "smx tmp" cobre "SMX/TMP", "SMX+TMP" e "SMX-TMP" (forma com espaço).
const COTRIMOXAZOL = ['bactrim', 'cotrimoxazol', 'infectrin', 'assepium', 'smxtmp', 'smztmp', 'tmpsmx', 'tmpsmz', 'smx tmp', 'smz tmp', 'tmp smx', 'tmp smz'];
const COMBINED = [
  // Associações que CONTÊM o componente em que o paciente reagiu.
  { when: ['trimetoprima', 'tmp'], drugs: ['bactrim', 'cotrimoxazol', 'infectrin', 'assepium', 'tmp'] },
  // E o sentido inverso: quem reagiu ao cotrimoxazol deve evitar os dois componentes, a trimetoprima isolada
  // inclusive (decisão do dono, 28/10/2026). A alergia só a "sulfa" continua sem avisar a trimetoprima.
  { when: COTRIMOXAZOL, drugs: ['trimetoprima', 'tmp'] },
  { whenAll: [['sulfametoxazol', 'smx', 'smz'], ['trimetoprima', 'tmp']], drugs: ['trimetoprima', 'tmp'] },
  // Penicilina → cefalosporinas de cadeia lateral parecida (amoxicilina–cefadroxila, ampicilina–cefalexina e
  // cefaclor). Cefazolina, ceftriaxona e cefuroxima têm cadeia diferente e não entram (Drug Allergy Practice Parameter, 2022).
  // As marcas das três penicilinas valem como o genérico.
  { when: ['penicilina', 'amoxicilina', 'ampicilina', 'amoxil', 'amox', 'augmentin', 'clavulin', 'clavulan', 'benzetacil', 'benzilpenicilina', 'unasyn'],
    drugs: ['cefalexina', 'cefadroxila', 'cefaclor', 'keflex', 'cefamox'] },
];
// Classe citada na alergia → fármacos que ela alcança. Celecoxibe e etoricoxibe (COX-2) avisam: a maioria
// os tolera, mas só depois de desafio supervisionado.
const CLASSES = [
  // Os da linha COX1 (inclusive as marcas) mais os preferenciais COX-2 e a nimesulida.
  { when: ['aine', 'aines', 'ainh', 'ainhs', 'antiinflamatorio', 'antinflamatorio'], drugs: [...COX1, 'nimesulida', 'nisulid', 'meloxicam', 'etoricoxibe', 'arcoxia', 'celecoxibe', 'celebra'] },
  // "Betalactâmicos" reúne penicilinas, cefalosporinas e carbapenêmicos.
  { when: ['betalactamico'], drugs: [...PENICILINA, ...CEFALOSPORINA, 'meropenem', 'imipenem', 'ertapenem', 'carbapenem'] },
  { when: ['anticonvulsivante', 'antiepileptico'], drugs: AROMATICOS },
  // A dipirona é uma pirazolona.
  { when: ['pirazolona'], drugs: DIPIRONA },
  ...COMBINED,
];

/**
 * Negação pura: o texto inteiro é feito só de negação e de palavras de enchimento ("Nega alergias
 * medicamentosas", "Nenhuma conhecida", "NKDA", "-"). Qualquer outra palavra ("exceto", "dipirona",
 * "urticária", "látex", "mas") faz o texto valer como alergia: na dúvida, mostrar. Alergia engolida custa um
 * paciente; um falso aviso custa um clique ("Nega alergia a dipirona" aparece como alergia).
 *
 * Verbos que AFIRMAM ("tem", "possui", "apresenta", "relata", "há") não são enchimento. E uma oração que vem
 * DEPOIS da negação sem negação própria e fala em alergia afirma outra ("Sem alergia medicamentosa; alergia
 * alimentar"); a que só fala em "reação" afirma quando é frase à parte (; ou .), não quando é continuação ("e").
 */
const NEGATORS = /^(nega\w*|nenhum\w*|nao|nada|sem|nkda|nka|nd|ausenc\w*|ausente|negativ\w*)$/;
const FILLER = new Set([
  'a', 'o', 'as', 'os', 'ao', 'aos', 'de', 'da', 'das', 'do', 'dos', 'e', 'ou', 'nem', 'em', 'no', 'na', 'por', 'ate',
  'qualquer', 'tipo',
  'alergia', 'alergias', 'alergico', 'alergica', 'reacao', 'reacoes', 'adversa', 'adversas', 'historico',
  'medicamento', 'medicamentos', 'medicamentosa', 'medicamentosas', 'remedio', 'remedios', 'droga', 'drogas',
  'farmaco', 'farmacos', 'alimento', 'alimentos', 'alimentar', 'alimentares', 'ambiental', 'ambientais',
  'conhecido', 'conhecida', 'conhecidos', 'conhecidas', 'conhecimento', 'registrada', 'registrado', 'registradas',
  'registrados', 'informada', 'informado', 'referida', 'referido', 'momento', 'agora', 'atual', 'atualmente', 'paciente',
]);
const isNegator = (w) => NEGATORS.test(w);
const wordsOf = (text) => text.split(/[^a-z0-9]+/).filter(Boolean);

function isPlainNegation(text) {
  const words = wordsOf(text);
  if (!words.length) return true;                       // vazio, "-", "."
  if (/^n ?\/ ?a$/.test(text)) return true;             // "N/A"
  if (!words.some(isNegator) || !words.every((w) => isNegator(w) || FILLER.has(w))) return false;
  let denied = false;
  for (const sentence of text.split(/[;.]+/)) {
    const sentenceWords = wordsOf(sentence);
    if (!sentenceWords.length) continue;
    if (denied && !sentenceWords.some(isNegator) && sentenceWords.some((w) => /^(alerg\w*|reac\w*)$/.test(w))) return false;
    for (const part of sentence.split(/,| e | ou /)) {
      const partWords = wordsOf(part);
      if (!partWords.length) continue;
      if (partWords.some(isNegator)) denied = true;
      else if (denied && partWords.some((w) => /^alerg\w*$/.test(w))) return false;
    }
  }
  return true;
}

/** Divide em `;`, quebra de linha e vírgula, menos dentro de parênteses: "Dipirona (urticária, 2023)" é uma alergia só. */
function splitTopLevel(text) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth += 1;
    else if ((ch === ')' || ch === ']') && depth > 0) depth -= 1;
    if (depth === 0 && /[;\n,]/.test(ch)) { out.push(current); current = ''; } else current += ch;
  }
  out.push(current);
  return out;
}

/** Chaves que o jsonb sem esquema já trouxe para o nome da alergia. */
const OBJECT_KEYS = ['nome', 'descricao', 'alergeno', 'substancia', 'texto', 'name', 'medicamento', 'farmaco', 'principioAtivo', 'droga', 'agente', 'produto', 'item', 'valor', 'label'];

/** A ficha guarda uma lista de textos; texto solto e objeto também aparecem (jsonb sem esquema). */
function allergyTexts(list) {
  if (list == null || list === '' || list === false) return [];
  const items = Array.isArray(list) ? list : typeof list === 'string' ? splitTopLevel(list) : [list];
  return items.flatMap((item) => {
    if (item == null || item === false) return [];
    if (typeof item === 'object') {
      const named = OBJECT_KEYS.map((key) => item[key]).find((value) => typeof value === 'string' && value.trim());
      const anyText = named ?? Object.values(item).filter((value) => typeof value === 'string' && value.trim()).join(' ');
      return [anyText && anyText.trim() ? anyText : 'Alergia em formato ilegível'];
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

/**
 * Palavras que descrevem a reação, a gravidade ou o contexto, não o fármaco: "Alergia a topiramato (rash)" é uma
 * alergia a topiramato. O resto do texto (≥ 5 letras) vira termo de busca.
 */
const NOT_A_DRUG = new Set([
  'alergia', 'alergias', 'alergico', 'alergica', 'reacao', 'reacoes', 'adversa', 'adversas', 'historico', 'intolerancia',
  'hipersensibilidade', 'sensibilidade', 'suspeita', 'suspeito', 'provavel', 'confirmada', 'confirmado', 'positivo', 'teste',
  'urticaria', 'urticarias', 'anafilaxia', 'anafilatica', 'anafilatico', 'angioedema', 'edema', 'prurido', 'exantema', 'dress',
  'stevens', 'johnson', 'necrolise', 'epidermica', 'toxica', 'broncoespasmo', 'choque', 'vomito', 'vomitos', 'nausea', 'nauseas',
  'diarreia', 'irritabilidade', 'agitacao', 'sonolencia', 'cutaneo', 'cutanea', 'cutaneas', 'cutaneos', 'generalizada',
  'generalizado', 'localizada', 'localizado', 'grave', 'graves', 'leve', 'leves', 'moderada', 'moderado', 'tardia', 'tardio',
  'imediata', 'imediato', 'sistemica', 'sistemico', 'quadro', 'infancia', 'crianca', 'durante', 'apos', 'depois', 'quando',
  'desde', 'tomou', 'usou', 'uso', 'medicacao', 'medicacoes', 'medicamento', 'medicamentos', 'medicamentosa', 'medicamentosas',
  'tratamento', 'remedio', 'remedios', 'droga', 'drogas', 'farmaco', 'farmacos', 'paciente', 'conhecida', 'conhecido',
  'referida', 'referido', 'relatada', 'relatado', 'declarada', 'declarado', 'registrada', 'registrado',
]);
const significantWords = (allergy) => wordsOf(plain(allergy)).filter((w) => w.length > 4 && /^[a-z]+$/.test(w) && !NOT_A_DRUG.has(w) && !isNegator(w));

/** Termos a procurar no medicamento para uma alergia declarada. */
function termsFor(allergy) {
  const af = forms(allergy);
  const terms = new Set(af);
  // O texto pode trazer anotação: "Alergia a topiramato (rash)", "Levetiracetam: irritabilidade grave". Cada palavra
  // que não é reação nem enchimento vale como o nome do fármaco.
  for (const word of significantWords(allergy)) terms.add(word);
  // Alergia a uma combinação ("sulfametoxazol + trimetoprima", "amoxicilina/clavulanato") vale para cada componente.
  for (const form of af) {
    for (const part of form.split(/\s*[+/&]\s*|\s+(?:e|com|mais)\s+/)) if (part.length > 2) terms.add(part);
  }
  // A família é conferida contra o texto e contra as palavras do fármaco ("Alergia a amoxicilina (urticária)").
  const named = [...af, ...significantWords(allergy)];
  for (const family of FAMILIES) {
    if (family.some((t) => has(named, t) || (af[0].length > 4 && t.includes(af[0])))) family.forEach((t) => terms.add(t));
  }
  // Reação cruzada entre inibidores da COX-1.
  if (COX1.some((t) => has(named, t))) COX1.forEach((t) => terms.add(t));
  for (const cls of CLASSES) {
    const hit = cls.when?.some((t) => has(named, t)) || cls.whenAll?.every((group) => group.some((t) => has(named, t)));
    if (hit) cls.drugs.forEach((t) => terms.add(t));
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
