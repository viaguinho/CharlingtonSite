/**
 * Controle de acesso baseado em papel (RBAC) + isolamento por praça (RLS).
 *
 * AVISO DE SEGURANÇA — leia antes de confiar neste módulo.
 * Tudo aqui é conveniência de INTERFACE: esconder um botão que o usuário não
 * pode usar, evitar uma navegação que resultaria em erro. A fronteira real de
 * segurança são as políticas Row Level Security no Postgres do Supabase
 * (supabase/migrations/0002_rls.sql). Um atacante que contorne este arquivo
 * ainda esbarra no banco. Nunca mova uma decisão de autorização para cá.
 */

export const ROLES = {
  DOCTOR: 'doctor',
  RECEPTION: 'reception',
  FINANCE: 'finance',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.DOCTOR]: 'Médico',
  [ROLES.RECEPTION]: 'Atendimento',
  [ROLES.FINANCE]: 'Financeiro',
  [ROLES.ADMIN]: 'Administrador',
};

export const PLAZAS = {
  CAMPINAS: 'campinas',
  FORTALEZA: 'fortaleza',
};

export const PLAZA_LABELS = {
  [PLAZAS.CAMPINAS]: 'Campinas / SP',
  [PLAZAS.FORTALEZA]: 'Fortaleza / CE',
};

/** Níveis de acesso, do menor para o maior. */
export const ACCESS = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  FULL: 3,
};

/**
 * Matriz de permissões — deny-by-default.
 * Um recurso ausente para um papel significa ACCESS.NONE.
 * `stepUp: true` exige reautenticação imediatamente antes da ação.
 */
const MATRIX = {
  'overview':            { doctor: ACCESS.READ, reception: ACCESS.READ, finance: ACCESS.READ, admin: ACCESS.READ },

  'patients.list':       { doctor: ACCESS.FULL, reception: ACCESS.WRITE, finance: ACCESS.NONE, admin: ACCESS.FULL },
  'patients.record':     { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.NONE },
  'patients.clinical':   { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.NONE },
  'patients.delete':     { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },

  'agenda':              { doctor: ACCESS.FULL, reception: ACCESS.FULL,  finance: ACCESS.READ, admin: ACCESS.FULL },
  'agenda.blocks':       { doctor: ACCESS.FULL, reception: ACCESS.WRITE, finance: ACCESS.NONE, admin: ACCESS.FULL },

  'documents.issue':     { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.NONE },
  'documents.status':    { doctor: ACCESS.FULL, reception: ACCESS.READ,  finance: ACCESS.NONE, admin: ACCESS.READ },
  'documents.templates': { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.NONE },

  'communication':       { doctor: ACCESS.FULL, reception: ACCESS.FULL,  finance: ACCESS.NONE, admin: ACCESS.FULL },
  'communication.rules': { doctor: ACCESS.FULL, reception: ACCESS.READ,  finance: ACCESS.NONE, admin: ACCESS.FULL },

  'finance':             { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.FULL, admin: ACCESS.FULL },
  'finance.consultValue':{ doctor: ACCESS.FULL, reception: ACCESS.READ,  finance: ACCESS.FULL, admin: ACCESS.FULL },
  'finance.bankData':    { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.FULL, admin: ACCESS.FULL },
  'finance.transfers':   { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.FULL, admin: ACCESS.FULL },

  'operations':          { doctor: ACCESS.READ, reception: ACCESS.FULL,  finance: ACCESS.READ, admin: ACCESS.FULL },
  'operations.team':     { doctor: ACCESS.FULL, reception: ACCESS.READ,  finance: ACCESS.NONE, admin: ACCESS.FULL },

  'reports':             { doctor: ACCESS.FULL, reception: ACCESS.READ,  finance: ACCESS.FULL, admin: ACCESS.FULL },
  'reports.clinical':    { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.NONE },

  'audit':               { doctor: ACCESS.READ, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },
  'settings':            { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },
  'settings.users':      { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },
  'settings.integrations':{doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },
  'settings.lgpd':       { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.NONE, admin: ACCESS.FULL },

  'data.export':         { doctor: ACCESS.FULL, reception: ACCESS.NONE,  finance: ACCESS.WRITE, admin: ACCESS.FULL },
};

/** Ações que exigem reautenticação mesmo com permissão. */
const STEP_UP_ACTIONS = new Set([
  'documents.issue',
  'data.export',
  'settings.users',
  'finance.bankData',
  'patients.delete',
]);

/** Nível de acesso de um papel a um recurso. */
export function levelFor(role, resource) {
  const entry = MATRIX[resource];
  if (!entry) return ACCESS.NONE;
  return entry[role] ?? ACCESS.NONE;
}

export const canRead = (role, resource) => levelFor(role, resource) >= ACCESS.READ;
export const canWrite = (role, resource) => levelFor(role, resource) >= ACCESS.WRITE;
export const canManage = (role, resource) => levelFor(role, resource) >= ACCESS.FULL;

export const needsStepUp = (resource) => STEP_UP_ACTIONS.has(resource);

/**
 * Isolamento por praça. Um usuário de Fortaleza não vê registro de Campinas —
 * nem por filtro esquecido, nem por URL manipulada.
 * `plazas` é a lista de praças autorizadas do usuário; `active` é a praça em
 * contexto. Registros sem praça (configuração global) são visíveis a todos.
 */
export function canAccessPlaza(user, recordPlaza) {
  if (!recordPlaza) return true;
  if (!user?.plazas?.length) return false;
  return user.plazas.includes(recordPlaza);
}

export function filterByPlaza(records, user, activePlaza) {
  if (!Array.isArray(records)) return [];
  return records.filter((r) => {
    if (!canAccessPlaza(user, r.praca)) return false;
    if (activePlaza && activePlaza !== 'all' && r.praca && r.praca !== activePlaza) return false;
    return true;
  });
}

/** Módulos visíveis na navegação para um papel. */
export function visibleModules(role) {
  return NAVIGATION.filter((item) => canRead(role, item.resource));
}

/**
 * Navegação principal. A ordem é a ordem do rail e reflete o fluxo real do
 * dia na clínica: o que se olha primeiro fica em cima.
 */
export const NAVIGATION = [
  { id: 'overview',      path: '/',              label: 'Dashboard',     icon: 'home',           resource: 'overview' },
  { id: 'agenda',        path: '/agenda',        label: 'Agenda',        icon: 'calendar',       resource: 'agenda' },
  { id: 'patients',      path: '/pacientes',     label: 'Pacientes',     icon: 'users',          resource: 'patients.list' },
  { id: 'documents',     path: '/documentos',    label: 'Documentos',    icon: 'file-text',      resource: 'documents.status' },
  { id: 'communication', path: '/comunicacao',   label: 'Comunicação',   icon: 'message-circle', resource: 'communication' },
  { id: 'finance',       path: '/financeiro',    label: 'Financeiro',    icon: 'wallet',         resource: 'finance' },
  { id: 'operations',    path: '/operacoes',     label: 'Operações',     icon: 'package',        resource: 'operations' },
  { id: 'reports',       path: '/relatorios',    label: 'Relatórios',    icon: 'chart-bar',      resource: 'reports' },
  { id: 'audit',         path: '/auditoria',     label: 'Auditoria',     icon: 'shield',         resource: 'audit' },
  { id: 'settings',      path: '/configuracoes', label: 'Configurações', icon: 'settings',       resource: 'settings' },
];
