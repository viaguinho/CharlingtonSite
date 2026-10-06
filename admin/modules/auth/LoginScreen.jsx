import { useState } from 'react';
import { useSession } from '../../core/session.jsx';
import { Button } from '../../components/primitives.jsx';
import Icon from '../../components/Icon.jsx';
import { ShaderBackground } from '@/components/ui/blue-waves';
import { User, Lock, ArrowRight, Eye, EyeOff, Database, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';

/**
 * Entrada no painel.
 *
 * Duas etapas: credencial e segundo fator. A segunda etapa só aparece se o
 * usuário tiver TOTP ativo — e ativar TOTP é obrigatório no primeiro acesso
 * (o fluxo de matrícula vive em MfaEnrollment).
 *
 * A tela não revela se um e-mail existe: erro de credencial e erro de conta
 * inexistente têm exatamente a mesma mensagem. Enumerar contas de uma clínica
 * é o primeiro passo de um ataque direcionado.
 */
export function LoginScreen() {
  const { signIn, verifyMfa, isServerMode } = useSession();

  const [step, setStep] = useState('credentials');
  const [form, setForm] = useState({ email: '', password: '', code: '' });
  const [factorId, setFactorId] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    setError(null);
  };

  async function submitCredentials(event) {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn({ email: form.email.trim(), password: form.password });
      if (result?.needsMfa) {
        setFactorId(result.factorId);
        setStep('mfa');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(event) {
    event.preventDefault();
    if (form.code.replace(/\D/g, '').length !== 6) {
      setError('O código tem 6 dígitos.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyMfa({ factorId, code: form.code.replace(/\D/g, ''), password: form.password });
    } catch (err) {
      setError(err.message);
      setForm((f) => ({ ...f, code: '' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      {/* O gradiente animado cobre 100% da tela em tela cheia */}
      <ShaderBackground className="auth__bg" />

      <aside className="auth__brand">
        <div className="auth__brand-top">
          <img src="/assets/logo.svg" alt="" width="40" height="40" />
          <div>
            <strong>Gestão Clínica</strong>
            <span>Dr. Charlington M. Cavalcante</span>
          </div>
        </div>

        <div className="auth__brand-body">
          <p className="auth__claim">
            Neurologia infantil com abordagem centralizada na criança
          </p>
          <ul className="auth__plazas">
            <li><span className="auth__dot" />Campinas / SP</li>
            <li><span className="auth__dot" />Fortaleza / CE</li>
          </ul>
        </div>

        <footer className="auth__brand-foot">
          <Icon name="lock" size={14} />
          <p>
            Prontuário eletrônico protegido. Todo acesso a dado de paciente é
            registrado em log de auditoria, conforme a LGPD e a Resolução CFM 1.821/2007.
          </p>
        </footer>
      </aside>

      <main className="auth__panel">
        <div className="auth__form-wrap">
          {step === 'credentials' ? (
            <form onSubmit={submitCredentials} noValidate className="auth__form">
              <header className="auth__head">
                <h1>Entrar no painel</h1>
                <p>Use suas credenciais corporativas da clínica.</p>
              </header>

              <div className="auth__fields">
                {/* Email Field */}
                <div className="auth__field">
                  <label htmlFor="login_email" className="auth__field-label">
                    <User size={13} className="auth__field-icon" />
                    <span>E-MAIL</span>
                  </label>
                  <div className="auth__field-control">
                    <input
                      type="email"
                      id="login_email"
                      className="auth__field-input"
                      required
                      autoComplete="username"
                      autoFocus
                      value={form.email}
                      onChange={set('email')}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="auth__field">
                  <label htmlFor="login_password" className="auth__field-label">
                    <Lock size={13} className="auth__field-icon" />
                    <span>SENHA</span>
                  </label>
                  <div className="auth__field-control">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login_password"
                      className="auth__field-input auth__field-input--password"
                      required
                      autoComplete="current-password"
                      value={form.password}
                      onChange={set('password')}
                    />
                    <button
                      type="button"
                      className="auth__password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p className="auth__error-badge" role="alert">
                    <AlertTriangle size={14} />
                    {error}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="auth__submit-btn group"
              >
                <span>{busy ? 'Entrando...' : 'Continuar'}</span>
                <ArrowRight size={18} className="auth__submit-arrow" />
              </button>

              {!isServerMode ? (
                <p className="auth__mode">
                  <Database size={13} />
                  <span>
                    Modo local: os dados ficam cifrados neste dispositivo. Sua senha é a
                    chave — ela não é transmitida nem armazenada em lugar nenhum.
                  </span>
                </p>
              ) : null}
            </form>
          ) : (
            <form onSubmit={submitMfa} noValidate className="auth__form">
              <header className="auth__head">
                <button
                  type="button"
                  className="auth__back"
                  onClick={() => { setStep('credentials'); setError(null); }}
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <h1>Verificação em duas etapas</h1>
                <p>Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
              </header>

              <div className="auth__fields">
                <div className="auth__field">
                  <label htmlFor="mfa_code" className="auth__field-label">
                    <KeyRound size={13} className="auth__field-icon" />
                    <span>CÓDIGO DE VERIFICAÇÃO</span>
                  </label>
                  <div className="auth__field-control">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={7}
                      id="mfa_code"
                      autoFocus
                      className="auth__field-input auth__code"
                      required
                      value={form.code}
                      onChange={set('code')}
                    />
                  </div>
                </div>

                {error ? (
                  <p className="auth__error-badge" role="alert">
                    <AlertTriangle size={14} />
                    {error}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="auth__submit-btn group"
              >
                <span>{busy ? 'Verificando...' : 'Verificar e entrar'}</span>
                <ArrowRight size={18} className="auth__submit-arrow" />
              </button>

              <p className="auth__mode">
                <Icon name="info" size={13} />
                <span>
                  Perdeu o acesso ao autenticador? Use um dos códigos de recuperação
                  gerados na configuração inicial.
                </span>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

/** Tela de bloqueio por inatividade — mais curta, sem repetir o e-mail. */
export function LockedScreen() {
  return (
    <div className="auth auth--locked">
      <ShaderBackground className="auth__bg" />
      <main className="auth__panel">
        <div className="auth__form-wrap auth__form-wrap--center">
          <span className="auth__lock-icon"><Icon name="lock" size={22} /></span>
          <h1>Sessão bloqueada</h1>
          <p className="auth__locked-text">
            O painel se bloqueou após 15 minutos sem atividade. Os dados continuam
            cifrados até que você entre novamente.
          </p>
          <Button variant="primary" size="lg" onClick={() => window.location.reload()}>
            Entrar novamente
          </Button>
        </div>
      </main>
    </div>
  );
}

export default LoginScreen;
