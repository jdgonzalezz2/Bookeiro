'use client'

import { useActionState, useState } from 'react'
import { createTenantAction } from './actions'
import { Scissors } from 'lucide-react'

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(createTenantAction, null)
  const [slug, setSlug] = useState('')

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-generate slug from name if the user hasn't typed in the slug field yet
    if (slug === '' || slug === generateSlug(e.target.value.slice(0, -1))) {
       setSlug(generateSlug(e.target.value))
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(generateSlug(e.target.value))
  }

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
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
          Configura tu<br />
          <span>nuevo negocio</span>
        </h2>
        <p className="auth-brand-desc">
          Estás a un paso de revolucionar la forma en que gestionas tu barbería.
          Configura cómo te verán tus clientes en internet.
        </p>
      </div>

      {/* ── Right: Form ── */}
      <div className="auth-form-panel">
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <div className="auth-card-header">
            <h1 className="auth-card-title">Crea tu Barbería</h1>
            <p className="auth-card-subtitle">
              Los clientes usarán este enlace para agendar.
            </p>
          </div>

          {state?.error && (
            <div className="alert alert-error">⚠️ {state.error}</div>
          )}

          <form action={formAction}>
            <div className="form-group">
              <label className="form-label" htmlFor="tenant-name">Nombre de la Barbería</label>
              <input
                id="tenant-name"
                name="name"
                type="text"
                required
                placeholder="Ej. The Kings Barbershop"
                className="form-input"
                onChange={handleNameChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-slug">Enlace Público (URL)</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}>
                <span style={{ 
                  color: 'var(--color-text-muted)', 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.95rem',
                  borderRight: '1px solid var(--color-border)',
                  userSelect: 'none'
                }}>
                  bookeiro.com/
                </span>
                <input
                  id="tenant-slug"
                  name="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="kings-barbershop"
                  className="form-input"
                  style={{ border: 'none', background: 'transparent', borderRadius: 0 }}
                />
              </div>
              <small style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                Solo letras minúsculas, números y guiones.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tenant-phone">Número de Teléfono (Opcional)</label>
              <input
                id="tenant-phone"
                name="phone"
                type="tel"
                placeholder="+57 300 000 0000"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={isPending}>
              {isPending ? (
                <><span className="spinner" /> Creando...</>
              ) : (
                'Finalizar Configuración'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
