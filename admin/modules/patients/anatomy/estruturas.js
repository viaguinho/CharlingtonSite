/**
 * Estruturas do busto anatômico — contrato entre o modelo (busto.glb) e a tela.
 *
 * Cada nó do GLB tem o nome do `id` desta tabela (com `_e`/`_d` para os
 * lados). Os textos de "O que faz" são para o médico explicar à família:
 * frases simples, corretas e sem promessa diagnóstica. O dono revisa.
 *
 * `exames` lista os valores de `origem` de anexo que têm relação real com a
 * estrutura. O sistema não sabe a região de um exame, então a ligação é só
 * por tipo: EEG ↔ córtex, giros límbicos e hipocampo; RM/TC ↔ encéfalo.
 * Crânio, mandíbula, coluna, medula, coração e artérias não ganham relação
 * até existir localização anatômica do exame. `resumo` (≤ 2 linhas) vai no
 * popover; `funcao` é o texto completo de "Saiba mais".
 *
 * Sem dependência de three.js: o fallback sem WebGL usa este arquivo sozinho.
 */

export const CAMADAS = [
  { id: 'cerebro', nome: 'Cérebro', icone: 'brain' },
  { id: 'cranio', nome: 'Crânio', icone: 'skull' },
  { id: 'vasos', nome: 'Vasos', icone: 'droplet' },
  { id: 'coluna', nome: 'Coluna e medula', icone: 'spine' },
  { id: 'coracao', nome: 'Coração', icone: 'heart-pulse' },
];

const EEG = 'exame_neurofisiologico';
const IMG = 'exame_imagem';

/** Rótulos de origem para "Relacionado ao paciente": [singular, plural, rótulo da linha]. */
export const ORIGENS_EXAME = {
  [EEG]: ['exame neurofisiológico', 'exames neurofisiológicos', 'Neurofisiológicos'],
  [IMG]: ['exame de imagem', 'exames de imagem', 'Exames de imagem'],
};

const LADO = {
  e: { m: 'esquerdo', f: 'esquerda', mp: 'esquerdos', fp: 'esquerdas', nome: 'Lado esquerdo' },
  d: { m: 'direito', f: 'direita', mp: 'direitos', fp: 'direitas', nome: 'Lado direito' },
};

/*
 * Base de cada estrutura. `par: true` gera `<id>_e` e `<id>_d`.
 * `genero` concorda o lado com o nome: m, f, mp (masc. plural), fp.
 */
const BASE = [
  // ——— Cérebro: córtex ———
  {
    id: 'frontal', par: true, genero: 'm', camada: 'cerebro', cor: '--anat-frontal',
    nome: 'Lobo frontal', curto: 'Frontal',
    resumo: 'Planeja, decide, controla impulsos e comanda os movimentos.',
    funcao: 'Ajuda a planejar, tomar decisões, manter a atenção e controlar impulsos. Também comanda os movimentos voluntários e participa da fala.',
    exames: [EEG, IMG],
  },
  {
    id: 'parietal', par: true, genero: 'm', camada: 'cerebro', cor: '--anat-parietal',
    nome: 'Lobo parietal', curto: 'Parietal',
    resumo: 'Reúne tato, dor e temperatura e situa o corpo no espaço.',
    funcao: 'Reúne as sensações do corpo, como tato, dor e temperatura, e ajuda a perceber a posição do corpo no espaço.',
    exames: [EEG, IMG],
  },
  {
    id: 'temporal', par: true, genero: 'm', camada: 'cerebro', cor: '--anat-temporal',
    nome: 'Lobo temporal', curto: 'Temporal',
    resumo: 'Audição, compreensão da linguagem e memória.',
    funcao: 'Participa da audição, da compreensão da linguagem e da memória. Também ajuda a reconhecer rostos e sons conhecidos.',
    exames: [EEG, IMG],
  },
  {
    id: 'occipital', par: true, genero: 'm', camada: 'cerebro', cor: '--anat-occipital',
    nome: 'Lobo occipital', curto: 'Occipital',
    resumo: 'A principal área da visão: formas, cores e movimento.',
    funcao: 'É a principal área da visão: recebe o que os olhos captam e ajuda a reconhecer formas, cores e movimento.',
    exames: [EEG, IMG],
  },
  {
    id: 'insula', par: true, genero: 'f', camada: 'cerebro', cor: '--anat-insula',
    nome: 'Ínsula', curto: 'Ínsula',
    resumo: 'Percebe sinais de dentro do corpo e participa das emoções.',
    funcao: 'Ajuda a perceber sinais de dentro do corpo, como fome, batimentos e desconforto, e participa das emoções e do paladar.',
    exames: [EEG, IMG],
  },
  {
    id: 'limbico', par: true, genero: 'mp', generoCurto: 'm', camada: 'cerebro', cor: '--anat-limbico',
    nome: 'Giros do cíngulo e para-hipocampal', curto: 'Cíngulo',
    resumo: 'Ligam emoção, atenção e memória.',
    funcao: 'Ligam emoção, atenção e memória. Ajudam a dar importância ao que acontece e a guardar lembranças.',
    exames: [EEG, IMG],
  },
  {
    id: 'hipocampo', par: true, genero: 'm', camada: 'cerebro', cor: '--anat-hipocampo',
    nome: 'Hipocampo', curto: 'Hipocampo',
    resumo: 'Forma novas memórias e ajuda na orientação no espaço.',
    funcao: 'É essencial para formar novas memórias e para a orientação no espaço.',
    exames: [EEG, IMG],
  },
  // ——— Cérebro: estruturas profundas ———
  {
    id: 'amigdala', par: true, genero: 'f', camada: 'cerebro', cor: '--anat-amigdala',
    nome: 'Amígdala', curto: 'Amígdala',
    resumo: 'Reconhece o que é importante ou ameaçador; reações emocionais.',
    funcao: 'Ajuda a reconhecer o que é importante ou ameaçador e participa das reações emocionais, como o medo.',
    exames: [IMG],
  },
  {
    id: 'nucleos_base', par: true, genero: 'mp', camada: 'cerebro', cor: '--anat-nucleos',
    nome: 'Núcleos da base', curto: 'Núcleos da base',
    resumo: 'Iniciam e regulam os movimentos; hábitos e motivação.',
    funcao: 'Ajudam a iniciar e regular os movimentos e participam da formação de hábitos e da motivação.',
    exames: [IMG],
  },
  {
    id: 'talamo', par: true, genero: 'mp', generoCurto: 'm', camada: 'cerebro', cor: '--anat-talamo',
    nome: 'Tálamo e hipotálamo', curto: 'Tálamo',
    resumo: 'Leva os sentidos ao córtex; regula sono, fome e hormônios.',
    funcao: 'O tálamo distribui as informações dos sentidos para o córtex. O hipotálamo ajuda a regular sono, fome, temperatura e hormônios.',
    exames: [IMG],
  },
  {
    id: 'corpo_caloso', camada: 'cerebro', cor: '--anat-caloso',
    nome: 'Corpo caloso', curto: 'Corpo caloso',
    resumo: 'A ponte de fibras entre os dois lados do cérebro.',
    funcao: 'É a grande ponte de fibras que liga os dois lados do cérebro e permite que eles trabalhem juntos.',
    exames: [IMG],
  },
  {
    id: 'ventriculos', camada: 'cerebro', cor: '--anat-liquor',
    nome: 'Ventrículos', curto: 'Ventrículos',
    resumo: 'Cavidades com líquor, que protege o cérebro e a medula.',
    funcao: 'São cavidades cheias de líquor, o líquido que protege e ajuda a nutrir o cérebro e a medula.',
    exames: [IMG],
  },
  {
    id: 'cerebelo', camada: 'cerebro', cor: '--anat-cerebelo',
    nome: 'Cerebelo', curto: 'Cerebelo',
    resumo: 'Equilíbrio, postura e precisão dos movimentos.',
    funcao: 'Coordena o equilíbrio, a postura e a precisão dos movimentos, e participa do aprendizado de novas habilidades motoras.',
    exames: [IMG],
  },
  {
    id: 'tronco', camada: 'cerebro', cor: '--anat-tronco',
    nome: 'Tronco encefálico', curto: 'Tronco encefálico',
    resumo: 'Liga cérebro e medula; controla respiração e batimentos.',
    funcao: 'Liga o cérebro à medula e controla funções automáticas, como a respiração, os batimentos e o ciclo de sono e vigília.',
    exames: [IMG],
  },
  {
    id: 'substancia_branca', camada: 'cerebro', cor: null, interativa: false,
    nome: 'Substância branca', curto: 'Substância branca',
    resumo: 'Fibras que conectam as áreas do cérebro.',
    funcao: 'Feixes de fibras que conectam as diferentes áreas do cérebro.',
    exames: [IMG],
  },
  // ——— Ossos ———
  {
    id: 'cranio', camada: 'cranio', cor: '--anat-osso',
    nome: 'Crânio', curto: 'Crânio',
    resumo: 'Protege o cérebro e dá forma ao rosto.',
    funcao: 'Os ossos do crânio protegem o cérebro e dão forma ao rosto.',
    exames: [],
  },
  {
    id: 'mandibula', camada: 'cranio', cor: '--anat-osso',
    nome: 'Mandíbula', curto: 'Mandíbula',
    resumo: 'O osso móvel da face: mastigação e fala.',
    funcao: 'É o osso móvel da face, usado para mastigar e falar. O hioide, logo abaixo, sustenta a língua e ajuda a engolir.',
    exames: [],
  },
  {
    id: 'coluna_cervical', camada: 'coluna', cor: '--anat-osso',
    nome: 'Coluna cervical', curto: 'Coluna cervical',
    resumo: 'Sustenta a cabeça e protege a medula espinhal.',
    funcao: 'As vértebras do pescoço sustentam a cabeça, permitem seus movimentos e protegem a medula espinhal.',
    exames: [],
  },
  {
    id: 'medula', camada: 'coluna', cor: '--anat-medula',
    nome: 'Medula espinhal', curto: 'Medula',
    resumo: 'Leva as mensagens entre o cérebro e o corpo.',
    funcao: 'Leva as mensagens entre o cérebro e o corpo, para os movimentos e as sensações, e comanda reflexos simples.',
    exames: [],
  },
  // ——— Coração e vasos ———
  {
    id: 'coracao', camada: 'coracao', cor: '--anat-coracao',
    nome: 'Coração', curto: 'Coração',
    resumo: 'Bombeia o sangue para o corpo todo, inclusive o cérebro.',
    funcao: 'Bombeia o sangue para todo o corpo, levando oxigênio e nutrientes, inclusive ao cérebro.',
    exames: [],
  },
  {
    id: 'arterias', camada: 'vasos', cor: '--anat-arteria',
    nome: 'Carótidas e vertebrais', curto: 'Artérias',
    resumo: 'Levam o sangue do coração até a cabeça.',
    funcao: 'São as artérias que levam o sangue do coração até a cabeça e o cérebro.',
    exames: [],
  },
  {
    id: 'nervos', camada: 'vasos', cor: '--anat-nervo', opcional: true, // o modelo atual não traz o vago
    nome: 'Nervo vago', curto: 'Nervo vago',
    resumo: 'Liga o cérebro ao coração, aos pulmões e à digestão.',
    funcao: 'Liga o cérebro ao coração, aos pulmões e ao sistema digestivo, e ajuda a regular funções automáticas do corpo.',
    exames: [],
  },
  // ——— Pele ———
  {
    id: 'pele', camada: null, cor: null, interativa: false,
    nome: 'Pele', curto: 'Pele',
    resumo: 'Contorno do corpo, só como referência.',
    funcao: 'Contorno do corpo, mostrado só como referência.',
    exames: [],
  },
];

function expandir(base) {
  const { par, genero, generoCurto = genero, ...resto } = base;
  const comum = { interativa: true, ...resto, base: base.id };
  if (!par) return [{ ...comum, lado: null, ladoNome: null, ladoCurto: null, nomeBase: base.nome }];
  return ['e', 'd'].map((l) => ({
    ...comum,
    id: `${base.id}_${l}`,
    lado: l === 'e' ? 'esquerdo' : 'direito',
    ladoNome: LADO[l].nome,
    ladoCurto: l === 'e' ? 'Esquerdo' : 'Direito',
    nomeBase: base.nome,
    nome: `${base.nome} ${LADO[l][genero]}`,
    curto: `${base.curto} ${LADO[l][generoCurto]}`,
  }));
}

/** Lista ordenada (ordem de leitura no teclado: de fora para dentro, de cima para baixo). */
export const LISTA_ESTRUTURAS = BASE.flatMap(expandir);

/** Mapa por id. */
export const ESTRUTURAS = Object.fromEntries(LISTA_ESTRUTURAS.map((e) => [e.id, e]));

/** Estruturas que respondem a hover, clique e teclado. */
export const INTERATIVAS = LISTA_ESTRUTURAS.filter((e) => e.interativa);

/**
 * Conta os anexos do paciente relacionados à estrutura, por origem.
 * Devolve só as origens com pelo menos um arquivo: [{ origem, total, rotulo, linha }].
 */
export function examesRelacionados(estrutura, attachments = []) {
  if (!estrutura?.exames?.length || !attachments?.length) return [];
  return estrutura.exames
    .map((origem) => {
      const total = attachments.filter((a) => a?.origem === origem).length;
      const [um, varios, linha] = ORIGENS_EXAME[origem] ?? ['exame', 'exames', 'Exames'];
      return { origem, total, rotulo: `${total} ${total === 1 ? um : varios}`, linha };
    })
    .filter((r) => r.total > 0);
}
