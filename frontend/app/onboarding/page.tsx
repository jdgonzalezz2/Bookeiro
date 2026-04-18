'use client'

import { useActionState, useState } from 'react'
import { createTenantAction } from './actions'
import { Scissors } from 'lucide-react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { ThemeToggle } from '@/components/theme-toggle'

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(createTenantAction, null)
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState<string>('')

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
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <ThemeToggle />
        </div>
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
            {/* Help for invited staff */}
            <div style={{ 
              background: 'rgba(201,168,76,0.05)', 
              border: '1px border-dashed var(--color-primary)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1.25rem', 
              marginBottom: '2rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '1.5rem' }}>👋</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>¿Vienes invitado por alguien más?</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Si tu jefe ya te registró con este correo, no es necesario que crees una barbería. 
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}> Refresca esta página</span> o espera unos segundos.
                </div>
              </div>
            </div>

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
              <input type="hidden" name="phone" value={phone || ''} />
              <PhoneInput
                country={'co'}
                enableSearch={true}
                searchPlaceholder="Buscar país..."
                searchNotFound="No encontrado"
                placeholder="+57 300 000 0000"
                value={phone}
                onChange={(val) => setPhone(val)}
                inputClass="form-input"
                containerClass="phone-input-override-2"
                countryCodeEditable={false}
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
