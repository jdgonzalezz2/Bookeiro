'use client'

import { useActionState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInAction, initiateOAuthAction } from './actions'
import { Scissors } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const verified = searchParams.get('verified')
  const oauthError = searchParams.get('error')

  const [state, formAction, isPending] = useActionState(signInAction, null)
  const [oauthPending, startOAuth] = useTransition()

  const handleOAuth = (provider: 'google' | 'github') => {
    startOAuth(() => initiateOAuthAction(provider))
  }

  return (
    <div className="auth-page">
      {/* ── Left: Branding ── */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scissors size={28} />
          </div>
          <span className="auth-brand-name">Bookeiro</span>
        </div>
        <h2 className="auth-brand-tagline">
          Gestión integral para<br />
          <span>barberías premium</span>
        </h2>
        <p className="auth-brand-desc">
          Plataforma SaaS multi-tenant con agendamiento inteligente,
          POS integrado, comisiones automáticas y más — todo en un solo lugar.
        </p>
        <ul className="auth-features">
          {[
            'Motor de agendamiento con control de concurrencia',
            'POS y facturación integrados',
            'Precios dinámicos por profesional',
            'Liquidación automática de comisiones',
            'Aislamiento total de datos por negocio',
          ].map((f) => (
            <li key={f} className="auth-feature">
              <span className="auth-feature-dot" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right: Form ── */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-card-title">Bienvenido de vuelta</h1>
            <p className="auth-card-subtitle">Inicia sesión en tu cuenta Bookeiro</p>
          </div>

          {/* Alerts */}
          {verified && (
            <div className="alert alert-success">
              ✅ Email verificado correctamente. Ya puedes iniciar sesión.
            </div>
          )}
          {oauthError && (
            <div className="alert alert-error">
              ⚠️ Error en autenticación OAuth: {oauthError}
            </div>
          )}
          {state?.error && (
            <div className="alert alert-error">⚠️ {state.error}</div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-oauth"
              onClick={() => handleOAuth('google')}
              disabled={oauthPending || isPending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="btn btn-oauth"
              onClick={() => handleOAuth('github')}
              disabled={oauthPending || isPending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          <div className="auth-divider">o continúa con email</div>

          {/* Email/Password Form */}
          <form action={formAction}>
            <input type="hidden" name="redirect" value={redirect} />

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@correo.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Contraseña</label>
                <Link href="/reset-password" className="auth-link" style={{ fontSize: '0.8rem' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isPending || oauthPending}>
              {isPending ? (
                <><span className="spinner" /> Iniciando sesión...</>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="auth-footer">
            ¿No tienes cuenta?
            <Link href="/register">Regístrate gratis</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
