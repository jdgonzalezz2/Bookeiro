'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import {
  sendResetEmailAction,
  exchangeResetCodeAction,
  resetPasswordAction,
} from './actions'

type Step = 'email' | 'code' | 'password'

// We track multi-step state via server action returns
type SendState = { error?: string; success?: boolean; email?: string } | null
type CodeState = { error?: string; token?: string; email?: string } | null
type ResetState = { error?: string } | null

export default function ResetPasswordPage() {
  const [sendState, sendAction, isSending] = useActionState<SendState, FormData>(
    sendResetEmailAction,
    null
  )
  const [codeState, codeAction, isExchanging] = useActionState<CodeState, FormData>(
    exchangeResetCodeAction,
    null
  )
  const [resetState, resetAction, isResetting] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    null
  )

  // Derive current step
  const email = sendState?.email ?? ''
  const token = codeState?.token ?? ''

  let step: Step = 'email'
  if (sendState?.success && email && !token) step = 'code'
  if (token) step = 'password'

  return (
    <div className="auth-page">
      {/* ── Left: Branding ── */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">✂️</div>
          <span className="auth-brand-name">Bookeiro</span>
        </div>
        <h2 className="auth-brand-tagline">
          Recupera el<br />
          <span>acceso a tu cuenta</span>
        </h2>
        <p className="auth-brand-desc">
          Olvidamos la contraseña a veces. Te enviamos un código al correo
          para que puedas establecer una nueva contraseña de forma segura.
        </p>
      </div>

      {/* ── Right: Form ── */}
      <div className="auth-form-panel">
        <div className="auth-card">

          {/* STEP 1: Enter email */}
          {step === 'email' && (
            <>
              <div className="auth-card-header">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔐</div>
                <h1 className="auth-card-title">Recuperar contraseña</h1>
                <p className="auth-card-subtitle">
                  Ingresa tu correo y te enviaremos un código de verificación
                </p>
              </div>

              {sendState?.error && (
                <div className="alert alert-error">⚠️ {sendState.error}</div>
              )}

              <form action={sendAction}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">Correo electrónico</label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tu@correo.com"
                    className="form-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isSending}>
                  {isSending ? (
                    <><span className="spinner" /> Enviando código...</>
                  ) : (
                    'Enviar código de recuperación'
                  )}
                </button>
              </form>
            </>
          )}

          {/* STEP 2: Enter 6-digit code */}
          {step === 'code' && (
            <>
              <div className="auth-card-header">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📩</div>
                <h1 className="auth-card-title">Ingresa el código</h1>
                <p className="auth-card-subtitle">
                  Enviamos un código de 6 dígitos a<br />
                  <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>
                </p>
              </div>

              {codeState?.error && (
                <div className="alert alert-error">⚠️ {codeState.error}</div>
              )}

              <form action={codeAction}>
                <input type="hidden" name="email" value={email} />
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-code">Código de verificación</label>
                  <input
                    id="reset-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className="form-input"
                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.3rem', fontWeight: 700 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isExchanging}>
                  {isExchanging ? (
                    <><span className="spinner" /> Verificando...</>
                  ) : (
                    'Verificar código'
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}
                  onClick={() => window.location.reload()}
                >
                  ← Volver a intentar con otro correo
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Set new password */}
          {step === 'password' && (
            <>
              <div className="auth-card-header">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔑</div>
                <h1 className="auth-card-title">Nueva contraseña</h1>
                <p className="auth-card-subtitle">
                  Elige una contraseña segura para tu cuenta
                </p>
              </div>

              {resetState?.error && (
                <div className="alert alert-error">⚠️ {resetState.error}</div>
              )}

              <form action={resetAction}>
                <input type="hidden" name="token" value={token} />
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">Nueva contraseña</label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="form-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isResetting}>
                  {isResetting ? (
                    <><span className="spinner" /> Guardando...</>
                  ) : (
                    'Establecer nueva contraseña'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Footer nav */}
          {step === 'email' && (
            <div className="auth-footer">
              <Link href="/login">← Volver al inicio de sesión</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
