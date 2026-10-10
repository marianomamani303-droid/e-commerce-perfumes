import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { DEMO_MODE, readableError } from '../services/api';
import Icon from '../components/Icon';
import { Loading } from '../components/Feedback';
export default function AuthPage() {
  const { user, authLoading, authenticate } = useShop();
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;
  const returnPath =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
  if (authLoading)
    return (
      <main id="main">
        <Loading label="Recuperando tu sesión…" />
      </main>
    );
  if (user) return <Navigate to={user.rol === 'admin' ? '/dashboard' : returnPath} replace />;
  async function submit(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form);
    if (mode === 'register' && data.password !== data.confirmpassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const account = await authenticate(mode, data);
      navigate(account.rol === 'admin' ? '/dashboard' : returnPath, { replace: true });
    } catch (failure) {
      setError(readableError(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-page container">
      <aside className="auth-story">
        <img src="/images/editorial-hero.webp" alt="" />
        <div>
          <p className="eyebrow">BIENVENIDA A AIRBELL</p>
          <h1>
            Tu esencia.
            <br />
            <em>Tu universo.</em>
          </h1>
          <p>Un espacio para descubrir lo que te hace única.</p>
        </div>
      </aside>
      <section className="auth-content">
        <Link to="/" className="back-link">
          ← Volver a la colección
        </Link>
        <p className="eyebrow">UN PEQUEÑO RITUAL</p>
        <h2>{mode === 'login' ? 'Qué bueno verte.' : 'Tu historia empieza acá.'}</h2>
        <p>
          {mode === 'login'
            ? 'Ingresá a tu cuenta y continuá descubriendo.'
            : 'Creá tu cuenta para guardar tu selección de fragancias.'}
        </p>
        <div className="auth-tabs" role="group" aria-label="Acceso a la cuenta">
          <button
            aria-pressed={mode === 'login'}
            className={mode === 'login' ? 'selected' : ''}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Iniciar sesión
          </button>
          <button
            aria-pressed={mode === 'register'}
            className={mode === 'register' ? 'selected' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Crear cuenta
          </button>
        </div>
        <form key={mode} onSubmit={submit} className="form-stack">
          {mode === 'register' && (
            <label htmlFor="auth-name">
              Tu nombre
              <input
                id="auth-name"
                name="nombre"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                placeholder="¿Cómo te llamás?"
                disabled={busy}
              />
            </label>
          )}
          <label htmlFor="auth-email">
            Email
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="vos@ejemplo.com"
              disabled={busy}
            />
          </label>
          <div className="form-field">
            <label htmlFor="auth-password">Contraseña</label>
            <div className="password-field">
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'register' ? 12 : 1}
                maxLength={72}
                required
                disabled={busy}
                aria-describedby={mode === 'register' ? 'password-help' : undefined}
              />
              <button
                type="button"
                className="text-button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((x) => !x)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {mode === 'register' && (
            <>
              <small id="password-help">
                Usá al menos 12 caracteres. Una frase larga es una buena opción.
              </small>
              <label htmlFor="auth-confirm">
                Confirmá tu contraseña
                <input
                  id="auth-confirm"
                  name="confirmpassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                  disabled={busy}
                />
              </label>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {DEMO_MODE && (
            <p className="form-error">
              El acceso a cuentas está deshabilitado en esta demostración.
            </p>
          )}
          <button className="button full-width" type="submit" disabled={busy || DEMO_MODE}>
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar a mi cuenta' : 'Crear mi cuenta'}
            <Icon name="arrow" />
          </button>
        </form>
        <p className="auth-security">
          <Icon name="shield" size={16} /> Tu cuenta, en buenas manos.
        </p>
      </section>
    </main>
  );
}
