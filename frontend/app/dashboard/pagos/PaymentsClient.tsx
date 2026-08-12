'use client'

import { useState } from 'react'
import { Wallet, ShieldCheck, ExternalLink, Lock } from 'lucide-react'
import { savePaymentSettingsAction } from './actions'

interface InitialState {
  deposit_enabled: boolean
  deposit_percent: number
  is_sandbox: boolean
  wompi_public_key: string
  has_integrity_secret: boolean
  has_events_secret: boolean
}

export default function PaymentsClient({ initial }: { initial: InitialState }) {
  const [depositEnabled, setDepositEnabled] = useState(initial.deposit_enabled)
  const [depositPercent, setDepositPercent] = useState(String(initial.deposit_percent ?? 50))
  const [isSandbox, setIsSandbox] = useState(initial.is_sandbox)
  const [publicKey, setPublicKey] = useState(initial.wompi_public_key)
  const [integritySecret, setIntegritySecret] = useState('')
  const [eventsSecret, setEventsSecret] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.75rem',
    marginBottom: '1.5rem',
  }
  const secretPlaceholder = (configured: boolean) =>
    configured ? '•••••••••• (configurado — deja vacío para conservarlo)' : 'Pega el secreto aquí'

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    const res = await savePaymentSettingsAction({
      deposit_enabled: depositEnabled,
      deposit_percent: Number(depositPercent),
      is_sandbox: isSandbox,
      wompi_public_key: publicKey,
      wompi_integrity_secret: integritySecret || undefined,
      wompi_events_secret: eventsSecret || undefined,
    })
    if (res.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({ text: '¡Configuración de pagos guardada!', type: 'success' })
      setIntegritySecret('')
      setEventsSecret('')
    }
    setIsSaving(false)
  }

  return (
    <div className="dashboard-container">
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      {/* Activar abono */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            <div style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }}><Wallet size={22} /></div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Cobrar un abono al reservar</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0.3rem 0 0', maxWidth: '48ch' }}>
                Si lo activas, tus clientes pagarán un porcentaje por adelantado para confirmar la cita. Reduce inasistencias.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={depositEnabled}
            onClick={() => setDepositEnabled((v) => !v)}
            style={{
              flexShrink: 0, width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: depositEnabled ? 'var(--color-primary)' : 'var(--color-glass-border)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{ position: 'absolute', top: 3, left: depositEnabled ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
        </div>

        {depositEnabled && (
          <div className="form-group" style={{ marginTop: '1.25rem', maxWidth: 260 }}>
            <label className="form-label">Porcentaje del abono</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number" min={1} max={100} value={depositPercent}
                onChange={(e) => setDepositPercent(e.target.value)}
                className="form-input" style={{ width: 100 }}
              />
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>% del total</span>
            </div>
            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: 6 }}>Ej. 50% de abono; el resto se paga en el local.</small>
          </div>
        )}
      </div>

      {/* Llaves de Wompi */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }}><ShieldCheck size={22} /></div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Tus llaves de Wompi</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0.3rem 0 0', maxWidth: '52ch' }}>
              Crea tu cuenta gratis en{' '}
              <a href="https://comercios.wompi.co" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                comercios.wompi.co <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
              {' '}y copia tus llaves desde <em>Desarrolladores</em>. El dinero llega directo a tu cuenta.
            </p>
          </div>
        </div>

        {/* Ambiente sandbox / producción */}
        <div className="form-group">
          <label className="form-label">Ambiente</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={() => setIsSandbox(true)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
                background: isSandbox ? 'var(--color-primary)' : 'var(--color-bg-surface)', color: isSandbox ? '#111' : 'var(--color-text-secondary)',
                border: isSandbox ? 'none' : '1px solid var(--color-border)' }}>
              Pruebas (sandbox)
            </button>
            <button type="button" onClick={() => setIsSandbox(false)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
                background: !isSandbox ? 'var(--color-primary)' : 'var(--color-bg-surface)', color: !isSandbox ? '#111' : 'var(--color-text-secondary)',
                border: !isSandbox ? 'none' : '1px solid var(--color-border)' }}>
              Producción (cobros reales)
            </button>
          </div>
          <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: 6 }}>
            Empieza en <strong>sandbox</strong> con llaves de prueba (<code>pub_test_…</code>) para probar sin dinero real.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Llave pública</label>
          <input type="text" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} className="form-input"
            placeholder={isSandbox ? 'pub_test_...' : 'pub_prod_...'} autoComplete="off" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={13} /> Secreto de integridad</label>
          <input type="password" value={integritySecret} onChange={(e) => setIntegritySecret(e.target.value)} className="form-input"
            placeholder={secretPlaceholder(initial.has_integrity_secret)} autoComplete="off" />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={13} /> Secreto de eventos</label>
          <input type="password" value={eventsSecret} onChange={(e) => setEventsSecret(e.target.value)} className="form-input"
            placeholder={secretPlaceholder(initial.has_events_secret)} autoComplete="off" />
          <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: 6 }}>
            Los secretos se guardan cifrados en el backend y nunca se muestran de vuelta. Déjalos vacíos para conservar los actuales.
          </small>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary"
          style={{ padding: '0.85rem 2rem', fontWeight: 700 }}>
          {isSaving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
