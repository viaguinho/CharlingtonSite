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
  .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
  .replace(/[\u2010-\u2015\u2212]/g, '-')                   // travessão e hífen tipográfico valem como hífen   // espaço de largura zero (texto colado de PDF) não pode anular a busca
  .toLowerCase().replace(/\s+/g, ' ').trim();

// "Co-trimoxazol", "A.A.S.", "anti inflamatório" e "beta lactâmico" são o mesmo termo sem hífen, ponto e espaço
// depois de "anti" e "beta". O texto é conferido em três formas: a original (a sigla "SMX-TMP" ainda separa
// "SMX"), a compactada e a com hífen, barra e "+" trocados por espaço ("SMX/TMP" e "SMX+TMP" viram "smx tmp").
const squash = (text) => text.replace(/\b(anti|beta|co)[\s-]+(?=\w)/g, '$1').replace(/[-.]/g, '');
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
const PENICILINA = ['penicilina', 'amoxi', 'amoxicilina', 'ampicilina', 'benzilpenicilina', 'oxacilina', 'piperacilina', 'amoxil', 'amox', 'clavulan', 'augmentin', 'clavulin', 'benzetacil', 'unasyn', 'tazocin'];
const CEFALOSPORINA = ['cefalosporina', 'cefalexina', 'cefazolina', 'cefuroxima', 'ceftriaxona', 'cefadroxila', 'cefepima', 'cefaclor', 'cefixima', 'cefotaxima', 'ceftazidima', 'cefpodoxima', 'cefalotina', 'cefprozil', 'cefdinir', 'cefoxitina', 'cefradina', 'keflex', 'rocefin', 'zinnat', 'cefamox'];
// Anticonvulsivantes aromáticos: reagem entre si (40 a 80% nos estudos). A lamotrigina reage menos, mas entra.
const AROMATICOS = ['carbamazepina', 'tegretol', 'cbz', 'oxcarbazepina', 'trileptal', 'oxc', 'fenitoina', 'hidantoina', 'dfh', 'hidantal', 'epelin', 'fenobarbital', 'gardenal', 'primidona', 'lamotrigina', 'lamictal', 'lamitor', 'ltg', 'zonisamida', 'felbamato'];

// Formulário da neuropediatria: o mesmo fármaco sob sal, forma e marca. A alergia a qualquer um avisa para os outros.
// Marcas bem conhecidas; a revisão médica da lista está em docs/redesign-paciente/alergias-tabela-e-fontes.md.
const VALPROATO = ['valpro', 'vpa', 'depakene', 'depakote', 'valpakine'];   // "valpro" cobre valproato, valproico e divalproato
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
// Fármacos com marca própria na tabela que ficavam só dentro de uma classe: a alergia ao genérico avisa a marca e vice-versa.
const LISDEXANFETAMINA = ['lisdexanfetamina', 'venvanse'];
const ONDANSETRONA = ['ondansetrona', 'vonau'];
const HIDROXIZINA = ['hidroxizina', 'hixizine'];
const NIMESULIDA = ['nimesulida', 'nisulid'];
const CELECOXIBE = ['celecoxibe', 'celebra'];
const ETORICOXIBE = ['etoricoxibe', 'arcoxia'];
const MELOXICAM = ['meloxicam', 'movatec'];
const MIDAZOLAM = ['midazolam', 'dormonid'];
const PARACETAMOL = ['paracetamol', 'tylenol', 'acetaminofeno', 'acetaminofen'];
const AZITROMICINA = ['azitromicina', 'zitromax'];
const BENZODIAZEPINICOS = ['diazepam', 'valium', 'clonazepam', 'rivotril', 'clobazam', 'frisium', 'urbanil', 'midazolam', 'dormonid', 'lorazepam', 'alprazolam'];

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
  VIGABATRINA, LACOSAMIDA, ARIPIPRAZOL, ATOMOXETINA, NIMESULIDA, CELECOXIBE, ETORICOXIBE, MELOXICAM, MIDAZOLAM,
  PARACETAMOL, AZITROMICINA, LISDEXANFETAMINA, ONDANSETRONA, HIDROXIZINA,
];

// Inibidores fortes da COX-1: quem reage a um tende a reagir aos outros (reação cruzada). Nem todo
// paciente é assim (a reação "seletiva" a um só AINE existe, e a da dipirona costuma ser seletiva), mas a
// ficha não guarda o tipo da reação: avisa.
const COX1 = ['aas', 'aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'melhoral', 'somalgin', 'cafiaspirina',
  'ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'cetorolaco', 'piroxicam', 'advil', 'alivium', 'dalsy', 'cataflam', 'voltaren', 'naprosyn',
  'indometacina', 'tenoxicam', 'mefenamico', 'ponstan', 'profenid', 'buscofem',
  'flanax', 'toragesic', 'feldene', 'tilatil', 'tandrilax', 'torsilax', 'sonrisal', 'alka seltzer', 'ecasil', 'acetil salicilico'];

// Quando a alergia cita um dos termos de `when`, os medicamentos de `drugs` também avisam. Só nesse sentido.
// `whenAll`: cada grupo precisa casar com um de seus termos ("sulfametoxazol-trimetoprima" escrito com hífen).
// "TMP" e "SMX/SMZ" são as siglas de uso corrente; "smx tmp" cobre "SMX/TMP", "SMX+TMP" e "SMX-TMP" (forma com espaço).
const COTRIMOXAZOL = ['bactrim', 'cotrimoxazol', 'infectrin', 'assepium', 'smxtmp', 'smztmp', 'tmpsmx', 'tmpsmz', 'smx tmp', 'smz tmp', 'tmp smx', 'tmp smz'];
const COMBINED = [
  // Associações que CONTÊM o componente em que o paciente reagiu.
  { when: ['trimetoprim', 'tmp'], drugs: ['bactrim', 'cotrimoxazol', 'infectrin', 'assepium', 'trimetoprim', 'tmp'] },
  // E o sentido inverso: quem reagiu ao cotrimoxazol deve evitar os dois componentes, a trimetoprima isolada
  // inclusive (decisão do dono, 28/10/2026). A alergia só a "sulfa" continua sem avisar a trimetoprima.
  { when: COTRIMOXAZOL, drugs: ['trimetoprim', 'tmp'] },
  { whenAll: [['sulfametoxazol', 'smx', 'smz'], ['trimetoprim', 'tmp']], drugs: ['trimetoprim', 'tmp'] },
  // Penicilina → cefalosporinas de cadeia lateral parecida (amoxicilina–cefadroxila, ampicilina–cefalexina e
  // cefaclor). Cefazolina, ceftriaxona e cefuroxima têm cadeia diferente e não entram (Drug Allergy Practice Parameter, 2022).
  // As marcas das três penicilinas valem como o genérico.
  { when: ['penicilina', 'amoxicilina', 'ampicilina', 'amoxil', 'amox', 'augmentin', 'clavulin', 'clavulan', 'benzetacil', 'benzilpenicilina', 'unasyn'],
    drugs: ['cefalexina', 'cefadroxila', 'cefaclor', 'keflex', 'cefamox'] },
  // E o sentido inverso (mesma cadeia R1): cefalexina e cefaclor com a ampicilina; cefadroxila e cefprozil com a
  // amoxicilina. Mais aviso, não menos: a revisão médica confirma (alergias-tabela-e-fontes.md).
  { when: ['cefalexina', 'keflex', 'cefaclor'], drugs: ['ampicilina', 'unasyn'] },
  { when: ['cefadroxila', 'cefamox', 'cefprozil'], drugs: ['amoxicilina', 'amoxil', 'amox', 'amoxi', 'augmentin', 'clavulin', 'clavulan'] },
  { when: ['benzodiazepin'], drugs: BENZODIAZEPINICOS },
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
// Chaves que descrevem a reação, não o alérgeno: nunca viram o nome ("grave" não é uma alergia).
const DESCRIBES_REACTION = new Set(['gravidade', 'severidade', 'severity', 'reacao', 'reacoes', 'sintomas', 'observacao', 'observacoes', 'nota', 'notas', 'data', 'desde', 'status', 'tipo', 'confirmada', 'criadoEm', 'atualizadoEm']);

/** Nome do alérgeno dentro de um objeto, inclusive aninhado ({ medicamento: { nome: 'Dipirona' }, gravidade: 'grave' }). */
function nameFrom(value, depth = 0) {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (!value || typeof value !== 'object' || depth > 3) return null;
  for (const key of OBJECT_KEYS) {
    const found = nameFrom(value[key], depth + 1);
    if (found) return found;
  }
  const rest = Object.entries(value).filter(([key]) => !DESCRIBES_REACTION.has(key));
  for (const [, inner] of rest) {
    const found = nameFrom(inner, depth + 1);
    if (found) return found;
  }
  return null;
}

/** A ficha guarda uma lista de textos; texto solto e objeto também aparecem (jsonb sem esquema). */
function allergyTexts(list) {
  if (list == null || list === '' || list === false) return [];
  const items = Array.isArray(list) ? list : typeof list === 'string' ? splitTopLevel(list) : [list];
  return items.flatMap((item) => {
    if (item == null || item === false) return [];
    if (typeof item === 'object') return [nameFrom(item) ?? 'Alergia em formato ilegível'];
    return [String(item)];
  });
}

/**
 * "Nega alergias, exceto dipirona": o que vale é a exceção. A pílula e os avisos dizem "dipirona", nunca
 * "exceto dipirona" (que de relance lê como o contrário).
 */
function withoutException(text) {
  const match = text.match(/^(.*?)[,;.]?\s*\b(?:exceto|salvo|a nao ser|a não ser)\s+(.+)$/i);
  if (match && isPlainNegation(plain(match[1]))) { const rest = match[2].trim(); return rest.charAt(0).toUpperCase() + rest.slice(1); }
  return text;
}

export function declaredAllergies(list = []) {
  return allergyTexts(list)
    .map((a) => withoutException(a.trim()))
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
  // Sais e prefixos que muitos fármacos compartilham ("ácido valproico" não é "ácido acetilsalicílico").
  'acido', 'sodico', 'sodica', 'sodio', 'cloridrato', 'sulfato', 'fosfato', 'acetato', 'potassico', 'calcico', 'maleato', 'tartarato', 'succinato',
  // Unidade, via e forma: nunca são o nome de um fármaco.
  'horas', 'minutos', 'dias', 'semanas', 'meses', 'gotas', 'febre', 'comprimido', 'comprimidos', 'intramuscular', 'endovenosa',
  'injecao', 'injetavel', 'xarope', 'pomada', 'creme', 'colirio', 'suspensao', 'solucao', 'capsula', 'capsulas', 'topico', 'topica',
  'depois', 'logo', 'mesmo', 'varias', 'varios', 'sempre', 'sozinho', 'junto', 'dose', 'doses', 'tomar', 'tomando', 'usando',
]);
// O que vem depois de ":" ou " - " e o que está entre parênteses é anotação da reação ("Topiramato - rash cutâneo",
// "Dipirona (febre alta)"), não o nome do fármaco: só o início do texto vira termo de busca.
const drugPart = (allergy) => plain(allergy).replace(/\([^)]*\)?/g, ' ').split(/\s[-–]\s|:/)[0];
const significantWords = (allergy) => wordsOf(drugPart(allergy)).filter((w) => w.length > 4 && /^[a-z]+$/.test(w) && !NOT_A_DRUG.has(w) && !isNegator(w));

/** Termos a procurar no medicamento para uma alergia declarada. */
function termsFor(allergy) {
  const af = forms(allergy);
  const terms = new Set(af);
  // O texto pode trazer anotação: "Alergia a topiramato (rash)", "Levetiracetam: irritabilidade grave". Cada palavra
  // que não é reação nem enchimento vale como o nome do fármaco.
  for (const word of significantWords(allergy)) terms.add(word);
  // Alergia a uma combinação ("sulfametoxazol + trimetoprima", "amoxicilina/clavulanato") vale para cada componente.
  for (const form of forms(drugPart(allergy))) {
    for (const part of form.split(/\s*[+/&]\s*|\s+(?:e|com|mais)\s+/)) if (part.length > 2 && !/\s/.test(part)) terms.add(part);   // siglas (smx, tmp); as palavras longas já entram por `significantWords`
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
  if (!medication || typeof medication !== 'object') return [];
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
