/**
 * Esquema de dados do painel.
 *
 * Este arquivo define ESTRUTURAS, nunca REGISTROS. Não existe nenhum paciente,
 * agendamento, valor ou nome de exemplo aqui — o sistema nasce vazio e é
 * preenchido pelo assistente de configuração inicial e pelo uso real.
 *
 * Toda entidade carrega o envelope comum: id, praça, autoria e versão.
 * A exclusão é sempre lógica: prontuário não se apaga (Res. CFM 1.821/2007,
 * guarda mínima de 20 anos).
 */

import { uuid } from '../core/crypto.js';

export const STORES = {
  CLINIC: 'clinica',
  USERS: 'usuarios',
  PATIENTS: 'pacientes',
  GUARDIANS: 'responsaveis',
  PROFESSIONALS: 'profissionais',
  APPOINTMENTS: 'agendamentos',
  ENCOUNTERS: 'atendimentos',
  NOTES: 'evolucoes',
  SCALES: 'escalas',
  MILESTONES: 'marcos',
  MEDICATIONS: 'medicacoes',
  ANAMNESIS: 'anamneses',
  DOCUMENTS: 'documentos',
  TEMPLATES: 'templates',
  ATTACHMENTS: 'anexos',
  ATTACHMENT_BLOBS: 'anexosBinarios',
  MESSAGES: 'mensagens',
  AUTOMATIONS: 'automacoes',
  ENTRIES: 'lancamentos',
  TRANSFERS: 'repasses',
  SUPPLIES: 'insumos',
  ROOMS: 'salas',
  BLOCKS: 'bloqueios',
  CONSENTS: 'consentimentos',
  AUDIT: 'auditoria',
  META: 'meta',
};

/** Envelope comum a toda entidade persistida. */
export function envelope({ praca = null, userId = null } = {}) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    praca,
    criadoEm: now,
    criadoPor: userId,
    atualizadoEm: now,
    atualizadoPor: userId,
    versao: 1,
    excluidoEm: null,
    excluidoPor: null,
    motivoExclusao: null,
  };
}

export function touch(record, userId) {
  return {
    ...record,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: userId,
    versao: (record.versao ?? 0) + 1,
  };
}

export function softDelete(record, userId, reason) {
  return {
    ...record,
    excluidoEm: new Date().toISOString(),
    excluidoPor: userId,
    motivoExclusao: reason ?? null,
  };
}

export const isActive = (record) => !record?.excluidoEm;

/* ══════════════════════════ Enumerações de domínio ══════════════════════════ */

export const PATIENT_STATUS = {
  ACTIVE: 'ativo',
  INACTIVE: 'inativo',
  DISCHARGED: 'alta',
};

export const PATIENT_STATUS_LABELS = {
  ativo: 'Em acompanhamento',
  inativo: 'Inativo',
  alta: 'Alta',
};

export const APPOINTMENT_TYPES = {
  FIRST: 'primeira',
  RETURN: 'retorno',
  TELE: 'teleconsulta',
  PROCEDURE: 'procedimento',
  REPORT: 'laudo',
};

export const APPOINTMENT_TYPE_LABELS = {
  primeira: 'Primeira consulta',
  retorno: 'Retorno',
  teleconsulta: 'Teleconsulta',
  procedimento: 'Procedimento',
  laudo: 'Emissão de laudo',
};

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'agendado',
  CONFIRMED: 'confirmado',
  CHECKED_IN: 'aguardando',
  IN_PROGRESS: 'em_atendimento',
  DONE: 'concluido',
  NO_SHOW: 'faltou',
  CANCELLED: 'cancelado',
};

export const APPOINTMENT_STATUS_LABELS = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
};

/** Tom visual de cada status — mapeia para os tokens de sinal. */
export const APPOINTMENT_STATUS_TONE = {
  // Agendado é "sem confirmação": o mesmo âmbar do aviso de confirmação.
  agendado: 'warning',
  confirmado: 'info',
  aguardando: 'warning',
  em_atendimento: 'info',
  // Concluído é o estado normal do dia, não um sinal: fica neutro. Verde,
  // âmbar e vermelho ficam para o que pede ação — na semana, onze trilhos
  // verdes de "Concluído" pesavam mais que a única consulta sem desfecho.
  concluido: 'neutral',
  faltou: 'danger',
  cancelado: 'muted',
};

export const DOCUMENT_TYPES = {
  PRESCRIPTION: 'prescricao',
  PRESCRIPTION_B: 'prescricao_especial_b',
  PRESCRIPTION_A: 'prescricao_especial_a',
  ATTENDANCE: 'atestado_comparecimento',
  MEDICAL_CERT: 'atestado_medico',
  COMPANION_CERT: 'declaracao_acompanhante',
  REPORT: 'laudo',
  SCHOOL_REPORT: 'relatorio_escolar',
  INSURANCE_REPORT: 'relatorio_convenio',
  REFERRAL: 'encaminhamento',
  EXAM_REQUEST: 'solicitacao_exames',
};

export const DOCUMENT_TYPE_LABELS = {
  prescricao: 'Prescrição médica',
  prescricao_especial_b: 'Receituário de controle especial (B — azul)',
  prescricao_especial_a: 'Receituário de controle especial (A — amarelo)',
  atestado_comparecimento: 'Atestado de comparecimento',
  atestado_medico: 'Atestado médico',
  declaracao_acompanhante: 'Declaração de acompanhamento',
  laudo: 'Laudo neurológico',
  relatorio_escolar: 'Relatório para a escola',
  relatorio_convenio: 'Relatório para convênio',
  encaminhamento: 'Encaminhamento multidisciplinar',
  solicitacao_exames: 'Solicitação de exames',
};

export const DOCUMENT_STATUS = {
  DRAFT: 'rascunho',
  PENDING: 'aguardando_assinatura',
  SIGNED: 'assinado',
  DELIVERED: 'entregue',
  REPLACED: 'substituido',
};

/** Domínios do desenvolvimento neuropsicomotor. */
export const DEVELOPMENT_DOMAINS = {
  GROSS_MOTOR: 'motor_grosso',
  FINE_MOTOR: 'motor_fino',
  LANGUAGE: 'linguagem',
  SOCIAL: 'social',
  COGNITIVE: 'cognitivo',
  ADAPTIVE: 'adaptativo',
};

export const DEVELOPMENT_DOMAIN_LABELS = {
  motor_grosso: 'Motor grosso',
  motor_fino: 'Motor fino',
  linguagem: 'Linguagem',
  social: 'Social / afetivo',
  cognitivo: 'Cognitivo',
  adaptativo: 'Adaptativo',
};

export const MILESTONE_STATUS = {
  ACHIEVED: 'atingido',
  EMERGING: 'emergente',
  DELAYED: 'atrasado',
  NOT_ASSESSED: 'nao_avaliado',
};

export const MESSAGE_CHANNELS = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
};

export const ENTRY_TYPES = {
  REVENUE: 'receita',
  EXPENSE: 'despesa',
};

export const ENTRY_STATUS = {
  PENDING: 'pendente',
  PAID: 'pago',
  OVERDUE: 'vencido',
  CANCELLED: 'cancelado',
};

export const CONSENT_PURPOSES = {
  CLINICAL: 'tratamento_clinico',
  WHATSAPP: 'comunicacao_whatsapp',
  EMAIL: 'comunicacao_email',
  TELEMEDICINE: 'teleconsulta',
  IMAGE: 'uso_de_imagem',
  RESEARCH: 'pesquisa_academica',
};

export const CONSENT_PURPOSE_LABELS = {
  tratamento_clinico: 'Tratamento clínico (tutela da saúde)',
  comunicacao_whatsapp: 'Comunicação por WhatsApp',
  comunicacao_email: 'Comunicação por e-mail',
  teleconsulta: 'Atendimento por teleconsulta',
  uso_de_imagem: 'Uso de imagem',
  pesquisa_academica: 'Pesquisa acadêmica (dados anonimizados)',
};

/**
 * Base legal do tratamento, conforme LGPD.
 * Dado de saúde de criança combina o art. 11 (dado sensível) com o art. 14
 * (criança e adolescente), que exige consentimento específico e em destaque
 * de ao menos um dos pais ou responsável legal para o que não for tutela
 * da saúde.
 */
export const LEGAL_BASIS = {
  HEALTH_PROTECTION: { id: 'tutela_saude', label: 'Tutela da saúde (art. 11, II, "f")', requiresConsent: false },
  GUARDIAN_CONSENT: { id: 'consentimento_responsavel', label: 'Consentimento do responsável (art. 14, §1º)', requiresConsent: true },
  LEGAL_OBLIGATION: { id: 'obrigacao_legal', label: 'Obrigação legal ou regulatória (art. 7º, II)', requiresConsent: false },
  CONTRACT: { id: 'execucao_contrato', label: 'Execução de contrato (art. 7º, V)', requiresConsent: false },
};

/** Prazos de retenção, em anos, por categoria de dado. */
export const RETENTION_YEARS = {
  clinical: 20,      // Res. CFM 1.821/2007
  financial: 5,      // legislação fiscal
  communication: 2,
  audit: 5,
};

/* ═══════════════════════════ Fábricas de registro ═══════════════════════════ */

export function newPatient(ctx = {}) {
  return {
    ...envelope(ctx),
    nome: '',
    nomeSocial: '',
    dataNascimento: '',
    sexo: '',
    cpf: '',
    cns: '',
    fotoId: null,
    status: PATIENT_STATUS.ACTIVE,
    responsaveis: [],
    escola: { instituicao: '', serie: '', professor: '', contato: '', adaptacoes: '' },
    convenio: { operadora: '', plano: '', carteirinha: '', validade: '', particular: true, valorAcordado: null },
    clinico: {
      queixaPrincipal: '',
      gestacaoParto: '',
      antecedentesFamiliares: '',
      alergias: [],
      comorbidades: [],
      diagnosticos: [],
    },
    perfilSensorial: { gatilhos: '', preferencias: '', estrategias: '', toleranciaEspera: '' },
    observacoes: '',
  };
}

export function newGuardian(ctx = {}) {
  return {
    ...envelope(ctx),
    nome: '',
    cpf: '',
    parentesco: '',
    telefone: '',
    email: '',
    endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
    autorizacoes: {
      retirarCrianca: false,
      receberDocumentos: false,
      agendar: false,
      responsavelFinanceiro: false,
    },
  };
}

export function newAppointment(ctx = {}) {
  return {
    ...envelope(ctx),
    pacienteId: null,
    profissionalId: null,
    salaId: null,
    // null, não string vazia: no modo servidor a coluna é timestamptz e uma
    // string vazia é erro de tipo, não "sem valor".
    inicio: null,
    fim: null,
    tipo: APPOINTMENT_TYPES.RETURN,
    status: APPOINTMENT_STATUS.SCHEDULED,
    valor: null,
    origem: '',
    observacoes: '',
    checkInEm: null,
    inicioAtendimento: null,
    fimAtendimento: null,
  };
}

export function newNote(ctx = {}) {
  return {
    ...envelope(ctx),
    pacienteId: null,
    atendimentoId: null,
    subjetivo: '',
    objetivo: '',
    avaliacao: '',
    plano: '',
    cidPrincipal: '',
    cidSecundarios: [],
    assinadaEm: null,
    assinadaPor: null,
    travada: false,
    adendos: [],
  };
}

export function newDocument(ctx = {}) {
  return {
    ...envelope(ctx),
    pacienteId: null,
    atendimentoId: null,
    tipo: DOCUMENT_TYPES.PRESCRIPTION,
    titulo: '',
    conteudo: '',
    itens: [],                 // prescrição estruturada
    numero: null,              // sequencial por praça/ano
    status: DOCUMENT_STATUS.DRAFT,
    timbradoId: null,
    hashConteudo: null,
    assinatura: { provedor: null, id: null, urlVerificacao: null, assinadoEm: null },
    substituiDocumentoId: null,
    entregas: [],
  };
}

export function newEntry(ctx = {}) {
  return {
    ...envelope(ctx),
    tipo: ENTRY_TYPES.REVENUE,
    descricao: '',
    categoria: '',
    centroCusto: '',
    valor: null,
    vencimento: '',
    pagamentoEm: null,
    formaPagamento: '',
    status: ENTRY_STATUS.PENDING,
    atendimentoId: null,
    pacienteId: null,
    profissionalId: null,
    recorrente: false,
    observacoes: '',
  };
}

export function newConsent(ctx = {}) {
  return {
    ...envelope(ctx),
    titularId: null,
    titularTipo: 'paciente',
    responsavelId: null,
    finalidade: CONSENT_PURPOSES.CLINICAL,
    baseLegal: LEGAL_BASIS.HEALTH_PROTECTION.id,
    versaoTexto: '',
    textoApresentado: '',
    concedidoEm: null,
    revogadoEm: null,
    ip: null,
  };
}

/** Versão do esquema — incrementar obriga migração no adapter. */
export const SCHEMA_VERSION = 1;
