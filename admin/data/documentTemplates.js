/**
 * Modelos de documento clínico.
 *
 * Distinção deliberada entre dois tipos de texto:
 *
 *  1. ESTRUTURA E FRASEOLOGIA LEGAL — "Atesto, para os devidos fins de
 *     direito, que...". É linguagem administrativa padronizada, não decisão
 *     clínica. O sistema entrega pronta, com variáveis.
 *
 *  2. CONTEÚDO CLÍNICO — qual medicamento, qual dose, qual conduta. O sistema
 *     NÃO entrega isso pronto. A responsabilidade técnica é do médico, e um
 *     software que sugere prescrição de partida está criando risco sem
 *     nenhum ganho. O médico cria seus próprios modelos em
 *     Documentos › Modelos, e eles ficam salvos por praça.
 *
 * Variáveis disponíveis são resolvidas na emissão — ver `resolveVariables`.
 */

import { DOCUMENT_TYPES } from './schema.js';

export const VARIABLES = [
  { token: '{{paciente.nome}}', label: 'Nome do paciente' },
  { token: '{{paciente.idade}}', label: 'Idade (anos e meses)' },
  { token: '{{paciente.dataNascimento}}', label: 'Data de nascimento' },
  { token: '{{paciente.cpf}}', label: 'CPF do paciente' },
  { token: '{{responsavel.nome}}', label: 'Nome do responsável' },
  { token: '{{responsavel.cpf}}', label: 'CPF do responsável' },
  { token: '{{responsavel.parentesco}}', label: 'Parentesco' },
  { token: '{{data.extenso}}', label: 'Data por extenso' },
  { token: '{{data.curta}}', label: 'Data (dd/mm/aaaa)' },
  { token: '{{consulta.horaInicio}}', label: 'Hora de início da consulta' },
  { token: '{{consulta.horaFim}}', label: 'Hora de término da consulta' },
  { token: '{{medico.nome}}', label: 'Nome do médico' },
  { token: '{{medico.crm}}', label: 'CRM' },
  { token: '{{clinica.cidade}}', label: 'Cidade da unidade' },
];

/**
 * Esqueletos por tipo de documento. `corpo` traz apenas a moldura legal;
 * onde há decisão clínica, há um marcador para o médico preencher.
 */
export const DOCUMENT_SKELETONS = {
  [DOCUMENT_TYPES.PRESCRIPTION]: {
    titulo: 'PRESCRIÇÃO MÉDICA',
    estruturada: true,
    corpo: '',
    instrucao: 'Adicione os itens da prescrição abaixo. Cada linha vira uma entrada numerada no documento.',
  },

  [DOCUMENT_TYPES.PRESCRIPTION_B]: {
    titulo: 'RECEITUÁRIO DE CONTROLE ESPECIAL',
    subtitulo: 'Portaria SVS/MS nº 344/98 — Lista B (notificação azul)',
    estruturada: true,
    duasVias: true,
    exigeIdentificacaoComprador: true,
    corpo: '',
    instrucao: 'Receituário em duas vias: 1ª via retida na farmácia, 2ª via do paciente. A numeração é sequencial e controlada.',
  },

  [DOCUMENT_TYPES.PRESCRIPTION_A]: {
    titulo: 'NOTIFICAÇÃO DE RECEITA',
    subtitulo: 'Portaria SVS/MS nº 344/98 — Lista A (notificação amarela)',
    estruturada: true,
    duasVias: true,
    exigeIdentificacaoComprador: true,
    exigeNotificacaoNumerada: true,
    corpo: '',
    instrucao: 'A notificação amarela é impressa em talonário numerado fornecido pela vigilância sanitária. O sistema registra o número utilizado.',
  },

  [DOCUMENT_TYPES.ATTENDANCE]: {
    titulo: 'ATESTADO DE COMPARECIMENTO',
    corpo:
      'Atesto, para os devidos fins de direito, que {{paciente.nome}}, nascido(a) em ' +
      '{{paciente.dataNascimento}}, acompanhado(a) de seu responsável legal, compareceu a ' +
      'consulta médica nesta data, no período das {{consulta.horaInicio}} às {{consulta.horaFim}}.',
  },

  [DOCUMENT_TYPES.COMPANION_CERT]: {
    titulo: 'DECLARAÇÃO DE ACOMPANHAMENTO',
    corpo:
      'Declaro, para os devidos fins de direito, que {{responsavel.nome}}, portador(a) do CPF ' +
      '{{responsavel.cpf}}, compareceu a esta clínica nesta data acompanhando ' +
      '{{paciente.nome}}, na condição de {{responsavel.parentesco}}, no período das ' +
      '{{consulta.horaInicio}} às {{consulta.horaFim}}.',
  },

  [DOCUMENT_TYPES.MEDICAL_CERT]: {
    titulo: 'ATESTADO MÉDICO',
    exigeAutorizacaoCID: true,
    corpo:
      'Atesto, para os devidos fins de direito, que {{paciente.nome}}, nascido(a) em ' +
      '{{paciente.dataNascimento}}, encontra-se sob meus cuidados médicos e necessita de ' +
      '[período de afastamento / cuidados específicos — preencher].',
    nota: 'O CID só pode constar no atestado com autorização expressa do paciente ou do responsável legal (Código de Ética Médica, art. 73).',
  },

  [DOCUMENT_TYPES.REPORT]: {
    titulo: 'LAUDO NEUROLÓGICO',
    secoes: [
      { id: 'identificacao', label: 'Identificação', auto: true },
      { id: 'historia', label: 'História clínica' },
      { id: 'exame', label: 'Exame neurológico' },
      { id: 'exames', label: 'Exames complementares' },
      { id: 'hipotese', label: 'Hipótese diagnóstica e CID-10' },
      { id: 'conduta', label: 'Conduta e prognóstico' },
    ],
    corpo: '',
  },

  [DOCUMENT_TYPES.SCHOOL_REPORT]: {
    titulo: 'RELATÓRIO PARA A INSTITUIÇÃO DE ENSINO',
    secoes: [
      { id: 'contexto', label: 'Contexto do acompanhamento' },
      { id: 'observado', label: 'O que foi observado' },
      { id: 'adaptacoes', label: 'Adaptações pedagógicas sugeridas' },
      { id: 'articulacao', label: 'Articulação com a equipe escolar' },
    ],
    corpo: '',
    nota: 'Escreva em linguagem acessível a educadores. Inclua apenas o que a escola precisa saber para adaptar — o diagnóstico completo não pertence a este documento.',
  },

  [DOCUMENT_TYPES.INSURANCE_REPORT]: {
    titulo: 'RELATÓRIO MÉDICO',
    secoes: [
      { id: 'identificacao', label: 'Identificação', auto: true },
      { id: 'quadro', label: 'Quadro clínico' },
      { id: 'justificativa', label: 'Justificativa técnica da solicitação' },
      { id: 'cid', label: 'CID-10' },
    ],
    corpo: '',
  },

  [DOCUMENT_TYPES.REFERRAL]: {
    titulo: 'ENCAMINHAMENTO MULTIDISCIPLINAR',
    estruturada: true,
    corpo:
      'Encaminho {{paciente.nome}}, {{paciente.idade}}, para avaliação e acompanhamento ' +
      'com os profissionais indicados abaixo, com os objetivos terapêuticos descritos.',
    instrucao: 'Adicione uma linha por especialidade, com objetivo terapêutico e frequência sugerida.',
  },

  [DOCUMENT_TYPES.EXAM_REQUEST]: {
    titulo: 'SOLICITAÇÃO DE EXAMES',
    estruturada: true,
    corpo:
      'Solicito a realização dos exames listados abaixo para {{paciente.nome}}, ' +
      '{{paciente.idade}}, com a indicação clínica informada.',
    instrucao: 'Adicione uma linha por exame, com a indicação clínica — convênios recusam pedido sem indicação.',
  },
};

/** Documentos que exigem assinatura digital para ter validade. */
export const REQUIRES_SIGNATURE = new Set([
  DOCUMENT_TYPES.PRESCRIPTION,
  DOCUMENT_TYPES.PRESCRIPTION_B,
  DOCUMENT_TYPES.PRESCRIPTION_A,
  DOCUMENT_TYPES.MEDICAL_CERT,
  DOCUMENT_TYPES.REPORT,
  DOCUMENT_TYPES.INSURANCE_REPORT,
]);

/**
 * Modelos clínicos herdados do painel anterior.
 *
 * NÃO entram em uso automaticamente. Ficam disponíveis em
 * Documentos › Modelos › Importar, onde o médico revisa cada um e decide se
 * vira modelo ativo. Nenhum conteúdo clínico é ativado sem aprovação humana.
 */
export const LEGACY_TEMPLATES = [
  {
    id: 'legacy-receita-sensorial',
    tipo: DOCUMENT_TYPES.PRESCRIPTION,
    nome: 'Risperidona + terapia sensorial',
    origem: 'Painel anterior',
    itens: [
      { principio: 'Risperidona', concentracao: '1 mg/mL', posologia: 'Tomar 0,5 mL pela manhã e 0,5 mL à noite' },
      { principio: 'Terapia ocupacional', concentracao: '', posologia: 'Foco em integração sensorial — 2× por semana' },
      { principio: 'Fonoaudiologia', concentracao: '', posologia: 'Foco em linguagem e comunicação — 2× por semana' },
    ],
  },
  {
    id: 'legacy-receita-tdah',
    tipo: DOCUMENT_TYPES.PRESCRIPTION,
    nome: 'Tratamento de TDAH',
    origem: 'Painel anterior',
    itens: [
      { principio: 'Cloridrato de metilfenidato', concentracao: '10 mg', posologia: 'Tomar 1 comprimido pela manhã' },
      { principio: 'Psicoterapia cognitivo-comportamental', concentracao: '', posologia: '1× por semana' },
      { principio: 'Orientação e adaptação escolar', concentracao: '', posologia: 'Reuniões mensais com a equipe pedagógica' },
    ],
  },
  {
    id: 'legacy-encaminhamento',
    tipo: DOCUMENT_TYPES.REFERRAL,
    nome: 'Encaminhamento multidisciplinar geral',
    origem: 'Painel anterior',
    itens: [
      { principio: 'Terapia ocupacional', concentracao: '', posologia: 'Integração sensorial' },
      { principio: 'Psicologia', concentracao: '', posologia: 'Abordagem comportamental (ABA)' },
      { principio: 'Fonoaudiologia', concentracao: '', posologia: 'Comunicação alternativa e linguagem' },
    ],
  },
];

/* ═══════════════════════ Resolução de variáveis ═══════════════════════ */

import { age, date, dateLong, time, cpf as formatCpf } from '../core/format.js';

export function resolveVariables(text, context = {}) {
  const { patient, guardian, appointment, doctor, clinic, now = new Date() } = context;

  const map = {
    '{{paciente.nome}}': patient?.nomeSocial || patient?.nome || '',
    '{{paciente.idade}}': patient?.dataNascimento ? age(patient.dataNascimento).label : '',
    '{{paciente.dataNascimento}}': patient?.dataNascimento ? date(patient.dataNascimento) : '',
    '{{paciente.cpf}}': patient?.cpf ? formatCpf(patient.cpf) : '',
    '{{responsavel.nome}}': guardian?.nome ?? '',
    '{{responsavel.cpf}}': guardian?.cpf ? formatCpf(guardian.cpf) : '',
    '{{responsavel.parentesco}}': guardian?.parentesco ?? '',
    '{{data.extenso}}': dateLong(now),
    '{{data.curta}}': date(now),
    '{{consulta.horaInicio}}': appointment?.inicio ? time(appointment.inicio) : '____',
    '{{consulta.horaFim}}': appointment?.fim ? time(appointment.fim) : '____',
    '{{medico.nome}}': doctor?.nome ?? '',
    '{{medico.crm}}': doctor?.crm ?? '',
    '{{clinica.cidade}}': clinic?.cidade ?? '',
  };

  return Object.entries(map).reduce(
    (result, [token, value]) => result.split(token).join(value),
    String(text ?? ''),
  );
}

/** Variáveis que ficaram sem valor — a UI avisa antes de emitir. */
export function unresolvedVariables(text) {
  return Array.from(String(text ?? '').matchAll(/\{\{[^}]+\}\}/g)).map((m) => m[0]);
}
