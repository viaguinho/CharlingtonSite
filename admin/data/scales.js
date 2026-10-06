/**
 * Instrumentos de rastreio e avaliação em neuropediatria.
 *
 * O que está aqui: identificação do instrumento, faixa etária, domínio,
 * amplitude do escore e as faixas de corte publicadas.
 *
 * O que NÃO está aqui, deliberadamente: o texto dos itens. Vários desses
 * instrumentos são protegidos por direito autoral ou exigem licença de uso
 * (CARS-2, Conners, ASQ-3, Denver II). Reproduzir os itens dentro do sistema
 * criaria um problema jurídico para a clínica sem ganho clínico — o
 * profissional aplica o instrumento no material licenciado e registra aqui o
 * escore, a interpretação e a data.
 *
 * Para os instrumentos de uso livre (M-CHAT-R/F e SNAP-IV), o sistema aceita
 * registro item a item se a clínica quiser configurá-lo em Configurações.
 */

export const SCALE_DOMAINS = {
  AUTISM: 'espectro_autista',
  ADHD: 'atencao_hiperatividade',
  DEVELOPMENT: 'desenvolvimento_global',
  BEHAVIOR: 'comportamento',
  SLEEP: 'sono',
};

export const SCALE_DOMAIN_LABELS = {
  espectro_autista: 'Espectro autista',
  atencao_hiperatividade: 'Atenção e hiperatividade',
  desenvolvimento_global: 'Desenvolvimento global',
  comportamento: 'Comportamento',
  sono: 'Sono',
};

/**
 * `bands` define as faixas de interpretação: cada faixa tem o limite inferior
 * (`from`), o rótulo e o tom visual. A régua do prontuário usa exatamente
 * esses cortes para posicionar o marcador.
 */
export const SCALES = [
  {
    id: 'mchat-r',
    nome: 'M-CHAT-R/F',
    nomeCompleto: 'Modified Checklist for Autism in Toddlers, Revised with Follow-Up',
    dominio: SCALE_DOMAINS.AUTISM,
    idadeMinMeses: 16,
    idadeMaxMeses: 30,
    escoreMin: 0,
    escoreMax: 20,
    direcao: 'maior_pior',
    aplicadoPor: 'Responsável, com revisão do profissional',
    licencaLivre: true,
    bands: [
      { from: 0, label: 'Baixo risco', tone: 'success', conduta: 'Sem necessidade de ação adicional, salvo preocupação clínica.' },
      { from: 3, label: 'Risco moderado', tone: 'warning', conduta: 'Aplicar a entrevista de seguimento (Follow-Up).' },
      { from: 8, label: 'Risco alto', tone: 'danger', conduta: 'Encaminhar para avaliação diagnóstica e intervenção precoce.' },
    ],
  },
  {
    id: 'snap-iv',
    nome: 'SNAP-IV',
    nomeCompleto: 'Swanson, Nolan and Pelham Rating Scale, versão IV (18 itens)',
    dominio: SCALE_DOMAINS.ADHD,
    idadeMinMeses: 72,
    idadeMaxMeses: 216,
    escoreMin: 0,
    escoreMax: 54,
    direcao: 'maior_pior',
    aplicadoPor: 'Pais e professores',
    licencaLivre: true,
    subescalas: [
      { id: 'desatencao', label: 'Desatenção', escoreMax: 27 },
      { id: 'hiperatividade', label: 'Hiperatividade / impulsividade', escoreMax: 27 },
    ],
    bands: [
      { from: 0, label: 'Dentro do esperado', tone: 'success' },
      { from: 14, label: 'Sintomas significativos', tone: 'warning' },
      { from: 27, label: 'Sintomas acentuados', tone: 'danger' },
    ],
  },
  {
    id: 'vanderbilt',
    nome: 'Vanderbilt',
    nomeCompleto: 'NICHQ Vanderbilt Assessment Scale',
    dominio: SCALE_DOMAINS.ADHD,
    idadeMinMeses: 72,
    idadeMaxMeses: 144,
    escoreMin: 0,
    escoreMax: 54,
    direcao: 'maior_pior',
    aplicadoPor: 'Pais e professores',
    licencaLivre: true,
    bands: [
      { from: 0, label: 'Critérios não atendidos', tone: 'success' },
      { from: 12, label: 'Critérios parcialmente atendidos', tone: 'warning' },
      { from: 24, label: 'Critérios atendidos', tone: 'danger' },
    ],
  },
  {
    id: 'asq-3',
    nome: 'ASQ-3',
    nomeCompleto: 'Ages and Stages Questionnaires, terceira edição',
    dominio: SCALE_DOMAINS.DEVELOPMENT,
    idadeMinMeses: 1,
    idadeMaxMeses: 66,
    escoreMin: 0,
    escoreMax: 60,
    direcao: 'menor_pior',
    aplicadoPor: 'Responsável',
    licencaLivre: false,
    nota: 'Instrumento licenciado. Aplique no material oficial e registre aqui o escore por domínio.',
    subescalas: [
      { id: 'comunicacao', label: 'Comunicação', escoreMax: 60 },
      { id: 'motor_grosso', label: 'Motor grosso', escoreMax: 60 },
      { id: 'motor_fino', label: 'Motor fino', escoreMax: 60 },
      { id: 'resolucao', label: 'Resolução de problemas', escoreMax: 60 },
      { id: 'pessoal_social', label: 'Pessoal-social', escoreMax: 60 },
    ],
    bands: [
      { from: 0, label: 'Abaixo do ponto de corte', tone: 'danger', conduta: 'Encaminhar para avaliação.' },
      { from: 30, label: 'Zona de monitoramento', tone: 'warning', conduta: 'Reaplicar em 2 a 3 meses.' },
      { from: 45, label: 'Dentro do esperado', tone: 'success' },
    ],
  },
  {
    id: 'cars-2',
    nome: 'CARS-2',
    nomeCompleto: 'Childhood Autism Rating Scale, segunda edição',
    dominio: SCALE_DOMAINS.AUTISM,
    idadeMinMeses: 24,
    idadeMaxMeses: 216,
    escoreMin: 15,
    escoreMax: 60,
    direcao: 'maior_pior',
    aplicadoPor: 'Profissional treinado',
    licencaLivre: false,
    nota: 'Instrumento licenciado. Registre aqui apenas o escore total e a classificação.',
    bands: [
      { from: 15, label: 'Ausência de TEA', tone: 'success' },
      { from: 30, label: 'TEA leve a moderado', tone: 'warning' },
      { from: 37, label: 'TEA grave', tone: 'danger' },
    ],
  },
  {
    id: 'conners-3',
    nome: 'Conners 3',
    nomeCompleto: 'Conners Rating Scales, terceira edição',
    dominio: SCALE_DOMAINS.BEHAVIOR,
    idadeMinMeses: 72,
    idadeMaxMeses: 216,
    escoreMin: 30,
    escoreMax: 90,
    direcao: 'maior_pior',
    aplicadoPor: 'Pais, professores e autorrelato',
    licencaLivre: false,
    nota: 'Instrumento licenciado. Registre o escore T obtido no material oficial.',
    bands: [
      { from: 30, label: 'Escore T típico', tone: 'success' },
      { from: 60, label: 'Escore T elevado', tone: 'warning' },
      { from: 70, label: 'Escore T muito elevado', tone: 'danger' },
    ],
  },
  {
    id: 'denver-ii',
    nome: 'Denver II',
    nomeCompleto: 'Teste de Triagem de Desenvolvimento de Denver II',
    dominio: SCALE_DOMAINS.DEVELOPMENT,
    idadeMinMeses: 0,
    idadeMaxMeses: 72,
    escoreMin: 0,
    escoreMax: 100,
    direcao: 'menor_pior',
    aplicadoPor: 'Profissional treinado',
    licencaLivre: false,
    nota: 'Registre o resultado global: normal, questionável ou anormal, com o percentual de itens atingidos.',
    bands: [
      { from: 0, label: 'Anormal', tone: 'danger' },
      { from: 60, label: 'Questionável', tone: 'warning' },
      { from: 80, label: 'Normal', tone: 'success' },
    ],
  },
];

export const findScale = (id) => SCALES.find((s) => s.id === id) ?? null;

/** Faixa de interpretação correspondente a um escore. */
export function interpretScore(scaleId, score) {
  const scale = findScale(scaleId);
  if (!scale || score == null) return null;
  const sorted = [...scale.bands].sort((a, b) => b.from - a.from);
  return sorted.find((band) => Number(score) >= band.from) ?? sorted[sorted.length - 1] ?? null;
}

/** Instrumentos apropriados para a idade da criança, em meses. */
export function scalesForAge(months) {
  if (months == null) return SCALES;
  return SCALES.filter((s) => months >= s.idadeMinMeses && months <= s.idadeMaxMeses);
}
