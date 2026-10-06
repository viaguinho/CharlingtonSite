import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as repo from '../data/repository.js';
import * as audit from './audit.js';
import * as crypto from './crypto.js';
import { supabase, isSupabaseConfigured } from '../data/supabase-adapter.js';
import { ROLES, canRead, canWrite, canManage, needsStepUp, visibleModules } from './rbac.js';

/**
 * Sessão do painel.
 *
 * Responsabilidades:
 *  - autenticar (Supabase Auth com MFA TOTP, ou modo local cifrado);
 *  - manter o contexto de papel e praça ativa;
 *  - expirar por inatividade e exigir reautenticação em ações sensíveis;
 *  - descartar a chave de cifragem local ao bloquear.
 *
 * O timeout de 15 minutos não é conservadorismo: é um consultório onde a tela
 * fica visível para o acompanhante enquanto o médico atende a criança.
 */

const IDLE_TIMEOUT = 15 * 60 * 1000;
const IDLE_WARNING = 13 * 60 * 1000;
const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000;

const SessionContext = createContext(null);

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export function SessionProvider({ children }) {
  const [status, setStatus] = useState('loading');   // loading | anonymous | mfa | active | locked
  const [user, setUser] = useState(null);
  const [plaza, setPlaza] = useState(null);
  const [idleWarning, setIdleWarning] = useState(false);
  const [stepUpRequest, setStepUpRequest] = useState(null);

  const lastActivity = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const timers = useRef({});

  /* ——————————————————————— Encerramento ——————————————————————— */

  const endSession = useCallback(async (reason) => {
    await audit.log({
      action: reason === 'idle' ? audit.ACTIONS.SESSION_EXPIRED : audit.ACTIONS.LOGOUT,
      detail: reason,
    });
    crypto.lock();
    audit.clearContext();
    repo.setActor(null, null);
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setPlaza(null);
    setIdleWarning(false);
    setStatus(reason === 'idle' ? 'locked' : 'anonymous');
  }, []);

  /* ——————————————————————— Inatividade ——————————————————————— */

  useEffect(() => {
    if (status !== 'active') return undefined;

    const schedule = () => {
      clearTimeout(timers.current.warn);
      clearTimeout(timers.current.idle);
      setIdleWarning(false);
      timers.current.warn = setTimeout(() => setIdleWarning(true), IDLE_WARNING);
      timers.current.idle = setTimeout(() => endSession('idle'), IDLE_TIMEOUT);
    };

    const onActivity = () => {
      lastActivity.current = Date.now();
      if (Date.now() - sessionStart.current > ABSOLUTE_TIMEOUT) {
        endSession('absolute');
        return;
      }
      schedule();
    };

    schedule();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    // Bloqueia ao esconder a aba por mais de dois minutos: a tela do consultório
    // fica exposta enquanto o médico atende.
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 120_000) endSession('idle');
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timers.current.warn);
      clearTimeout(timers.current.idle);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [status, endSession]);

  /* ——————————————————————— Restauração ——————————————————————— */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await repo.ready().catch(() => {});

      if (!isSupabaseConfigured) {
        // Modo local-first: mesmo com o perfil gravado, os dados estão cifrados
        // e exigem a senha para abrir o cofre. Não há "lembrar de mim".
        const bootstrapped = await repo.getMeta('bootstrapped').catch(() => null);
        if (!cancelled) setStatus(bootstrapped ? 'anonymous' : 'setup');
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data?.session) { setStatus('anonymous'); return; }

      // Sessão do Supabase é válida, mas o cofre local continua bloqueado até
      // que a senha seja informada nesta aba.
      setStatus('anonymous');
    })();

    return () => { cancelled = true; };
  }, []);

  /* ——————————————————————— Entrada ——————————————————————— */

  const signIn = useCallback(async ({ email, password }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await audit.log({ action: audit.ACTIONS.LOGIN_FAIL, detail: email });
        throw new Error(traduzErroAuth(error.message));
      }

      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp?.[0];
      if (totp && totp.status === 'verified') {
        // A senha abre o cofre local; o segundo fator ainda precisa ser aceito.
        await crypto.unlock(password, await repo.getMeta('kdfSalt'));
        return { needsMfa: true, factorId: totp.id, session: data.session };
      }

      await completeSignIn(data.user, password);
      return { needsMfa: false, needsMfaEnrollment: true };
    }

    // Modo local: a senha é a chave do cofre. Se ela estiver errada, a
    // decifragem falha — não existe "senha correta" a validar em lugar nenhum.
    const salt = await repo.getMeta('kdfSalt');
    await crypto.unlock(password, salt);
    const profiles = await repo.list(repo.STORES.USERS, { where: { email } }).catch(() => null);
    if (!profiles?.length) {
      crypto.lock();
      await audit.log({ action: audit.ACTIONS.LOGIN_FAIL, detail: email });
      throw new Error('E-mail ou senha incorretos.');
    }
    await completeSignIn(profiles[0], password);
    return { needsMfa: false };
  }, []);

  const verifyMfa = useCallback(async ({ factorId, code, password }) => {
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) throw new Error('Não foi possível iniciar a verificação. Tente novamente.');

    const { data, error } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.data.id, code,
    });
    if (error) {
      await audit.log({ action: audit.ACTIONS.LOGIN_FAIL, detail: 'MFA inválido' });
      throw new Error('Código inválido ou expirado.');
    }
    await completeSignIn(data.user ?? (await supabase.auth.getUser()).data.user, password);
    return true;
  }, []);

  async function completeSignIn(authUser, password) {
    const profile = await loadProfile(authUser);
    const activePlaza = profile.plazas?.[0] ?? null;

    if (!crypto.isUnlocked() && password) {
      const salt = await repo.getMeta('kdfSalt');
      const used = await crypto.unlock(password, salt);
      if (!salt) await repo.setMeta('kdfSalt', used);
    }

    audit.setContext({
      userId: profile.id,
      role: profile.role,
      plaza: activePlaza,
      sessionId: crypto.uuid(),
    });
    repo.setActor(profile.id, activePlaza);

    sessionStart.current = Date.now();
    lastActivity.current = Date.now();

    setUser(profile);
    setPlaza(activePlaza);
    setStatus('active');
    await audit.log({ action: audit.ACTIONS.LOGIN });
  }

  async function loadProfile(authUser) {
    if (!authUser) throw new Error('Usuário não identificado.');
    if (authUser.role && authUser.nome) return authUser;           // modo local

    const rows = await repo.list(repo.STORES.USERS, { where: { authId: authUser.id } }).catch(() => []);
    const row = rows[0];
    return {
      id: row?.id ?? authUser.id,
      authId: authUser.id,
      nome: row?.nome ?? authUser.email,
      email: authUser.email,
      role: row?.role ?? ROLES.DOCTOR,
      plazas: row?.plazas ?? [],
      foto: row?.foto ?? null,
    };
  }

  const signOut = useCallback(() => endSession('user'), [endSession]);

  /* ——————————————————————— Reautenticação ——————————————————————— */

  /**
   * Exige a senha novamente antes de uma ação sensível (emitir documento,
   * exportar dados, alterar permissões). Devolve uma Promise que resolve
   * quando o usuário confirma e rejeita se ele cancelar.
   */
  const requireStepUp = useCallback((resource, description) => {
    if (!needsStepUp(resource)) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      setStepUpRequest({ resource, description, resolve, reject });
    });
  }, []);

  const resolveStepUp = useCallback(async (password) => {
    if (!stepUpRequest) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
        if (error) throw new Error('Senha incorreta.');
      } else {
        const salt = await repo.getMeta('kdfSalt');
        await crypto.unlock(password, salt);
      }
      await audit.log({ action: audit.ACTIONS.STEP_UP, detail: stepUpRequest.resource });
      stepUpRequest.resolve(true);
      setStepUpRequest(null);
    } catch (error) {
      throw error;
    }
  }, [stepUpRequest, user]);

  const cancelStepUp = useCallback(() => {
    stepUpRequest?.reject(new Error('Ação cancelada.'));
    setStepUpRequest(null);
  }, [stepUpRequest]);

  /* ——————————————————————— Praça ativa ——————————————————————— */

  const switchPlaza = useCallback(async (next) => {
    setPlaza(next);
    audit.setContext({ plaza: next });
    repo.setActor(user?.id, next);
    await repo.setMeta('lastPlaza', next);
  }, [user]);

  const value = useMemo(() => ({
    status, user, plaza, idleWarning, stepUpRequest,
    signIn, verifyMfa, signOut,
    requireStepUp, resolveStepUp, cancelStepUp,
    switchPlaza,
    extend: () => { lastActivity.current = Date.now(); setIdleWarning(false); },
    can: {
      read: (resource) => canRead(user?.role, resource),
      write: (resource) => canWrite(user?.role, resource),
      manage: (resource) => canManage(user?.role, resource),
    },
    modules: visibleModules(user?.role),
    isServerMode: isSupabaseConfigured,
  }), [status, user, plaza, idleWarning, stepUpRequest, signIn, verifyMfa,
       signOut, requireStepUp, resolveStepUp, cancelStepUp, switchPlaza]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return context;
}

/** Mensagens do Supabase em inglês não servem para a recepção da clínica. */
function traduzErroAuth(message = '') {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('network')) return 'Sem conexão com o servidor.';
  return 'Não foi possível entrar. Verifique os dados e tente novamente.';
}
