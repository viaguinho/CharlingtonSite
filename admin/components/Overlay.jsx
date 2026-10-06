import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { Button, IconButton } from './primitives.jsx';
import { PasswordField } from './Field.jsx';
import { useSession } from '../core/session.jsx';

/* ═══════════════════════ Foco preso e devolvido ═══════════════════════
   Um modal que não prende o foco é inacessível, e um que não o devolve ao
   gatilho deixa quem navega por teclado perdido no fim da página.        */

function useFocusTrap(active, onEscape) {
  const ref = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    previouslyFocused.current = document.activeElement;

    const node = ref.current;
    const focusables = () => Array.from(
      node?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [],
    );

    focusables()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onEscape?.(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [active, onEscape]);

  return ref;
}

/* ═══════════════════════════════ Modal ═══════════════════════════════ */

export function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissable = true }) {
  const ref = useFocusTrap(open, dismissable ? onClose : undefined);
  if (!open) return null;

  return createPortal(
    <div className="overlay" role="presentation">
      <div className="overlay__backdrop" onClick={dismissable ? onClose : undefined} />
      <div
        ref={ref}
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal__header">
          <div className="modal__heading">
            <h2 className="modal__title">{title}</h2>
            {description ? <p className="modal__description">{description}</p> : null}
          </div>
          {dismissable ? <IconButton name="x" label="Fechar" onClick={onClose} /> : null}
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ═══════════════════════ Gaveta lateral ═══════════════════════ */

export function Sheet({ open, onClose, title, description, width = 460, footer, children }) {
  const ref = useFocusTrap(open, onClose);
  if (!open) return null;

  return createPortal(
    <div className="overlay" role="presentation">
      <div className="overlay__backdrop" onClick={onClose} />
      <aside
        ref={ref}
        className="sheet"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="sheet__header">
          <div className="modal__heading">
            <h2 className="modal__title">{title}</h2>
            {description ? <p className="modal__description">{description}</p> : null}
          </div>
          <IconButton name="x" label="Fechar" onClick={onClose} />
        </header>
        <div className="sheet__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}

/* ═══════════════════════ Confirmação destrutiva ═══════════════════════ */

export function ConfirmDialog({
  open, onCancel, onConfirm, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'danger', loading,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm__message">{message}</p>
    </Modal>
  );
}

/* ═══════════════════════════════ Toasts ═══════════════════════════════ */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    const entry = { id, tone: 'neutral', duration: 5000, ...toast };
    setToasts((list) => [...list, entry]);
    if (entry.duration) setTimeout(() => dismiss(id), entry.duration);
    return id;
  }, [dismiss]);

  // A API precisa ser estável entre renders. Se ela mudasse a cada toast,
  // todo `useCallback` que a tem como dependência seria recriado, disparando
  // recargas em cascata — e uma recarga que passa por um estado de
  // carregamento desmonta o que estiver aberto por cima, como um modal de
  // emissão de documento com texto já digitado.
  const api = useMemo(() => ({
    push,
    dismiss,
    success: (message, options) => push({ tone: 'success', message, ...options }),
    error: (message, options) => push({ tone: 'danger', message, duration: 8000, ...options }),
    info: (message, options) => push({ tone: 'info', message, ...options }),
    warning: (message, options) => push({ tone: 'warning', message, ...options }),
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <Icon name={TOAST_ICONS[toast.tone] ?? 'info'} size={16} />
              <div className="toast__text">
                {toast.title ? <strong>{toast.title}</strong> : null}
                <span>{toast.message}</span>
              </div>
              {toast.action ? (
                <button type="button" className="toast__action" onClick={() => { toast.action.onClick(); dismiss(toast.id); }}>
                  {toast.action.label}
                </button>
              ) : null}
              <IconButton name="x" label="Dispensar" size="sm" onClick={() => dismiss(toast.id)} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

const TOAST_ICONS = {
  success: 'check',
  danger: 'alert-triangle',
  warning: 'alert-triangle',
  info: 'info',
  neutral: 'info',
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}

/* ═══════════════════ Reautenticação para ação sensível ═══════════════════ */

export function StepUpDialog() {
  const { stepUpRequest, resolveStepUp, cancelStepUp } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPassword(''); setError(null); }, [stepUpRequest]);

  if (!stepUpRequest) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resolveStepUp(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={cancelStepUp}
      title="Confirme sua identidade"
      description={stepUpRequest.description ?? 'Esta ação exige que você digite sua senha novamente.'}
      size="sm"
      dismissable={!busy}
      footer={
        <>
          <Button onClick={cancelStepUp} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={submit} loading={busy}>Confirmar</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <PasswordField
          label="Senha"
          value={password}
          error={error}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </form>
    </Modal>
  );
}

/* ═══════════════════ Aviso de sessão prestes a expirar ═══════════════════ */

export function IdleWarning() {
  const { idleWarning, extend, signOut } = useSession();
  if (!idleWarning) return null;

  return (
    <Modal
      open
      onClose={extend}
      title="Sua sessão vai expirar"
      description="Por segurança, o painel se bloqueia após 15 minutos sem atividade."
      size="sm"
      footer={
        <>
          <Button onClick={signOut}>Sair agora</Button>
          <Button variant="primary" onClick={extend}>Continuar trabalhando</Button>
        </>
      }
    >
      <p className="confirm__message">
        Ninguém deve conseguir ler a tela do consultório enquanto você atende.
        Clique em continuar para manter a sessão aberta.
      </p>
    </Modal>
  );
}
