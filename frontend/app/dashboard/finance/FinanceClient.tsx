'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Wallet, Clock, ArrowDownLeft, ShieldCheck, Receipt, Settings } from 'lucide-react'

const cop = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)

// El SDK de InsForge tipa las relaciones embebidas como arrays; aceptamos ambas
// formas (objeto | array) y normalizamos en runtime.
type SvcEmbed = { name?: string }
type ApptEmbed = { customer_name?: string; start_time?: string; services?: SvcEmbed | SvcEmbed[] | null }
type PaymentRow = {
  id: string
  amount_in_cents: number | string
  currency?: string
  status?: string
  created_at?: string
  appointments?: ApptEmbed | ApptEmbed[] | null
}
type ApptRow = { total_price?: number | string; status?: string }

const first = <T,>(v: T | T[] | null | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined)

export default function FinanceClient({ payments, appointments }: { payments: PaymentRow[]; appointments: ApptRow[] }) {
  // Abonos REALES cobrados en línea (aprobados), en COP.
  const abonos = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount_in_cents || 0), 0) / 100,
    [payments]
  )
  // Total facturado por citas confirmadas/completadas (real).
  const facturado = useMemo(
    () => appointments.reduce((acc, c) => acc + Number(c.total_price || 0), 0),
    [appointments]
  )

  const statCard = (label: string, value: string, hint: string, icon: React.ReactNode) => (
    <div style={{ flex: '1 1 240px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: '0.6rem' }}>{hint}</p>
    </div>
  )

  return (
    <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* MÉTRICAS REALES */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {statCard('Abonos cobrados en línea', cop(abonos), 'Anticipos pagados por tus clientes al reservar.', <Wallet size={16} />)}
        {statCard('Total facturado', cop(facturado), 'Suma de citas confirmadas y completadas.', <Receipt size={16} />)}
      </div>

      {/* NOTA HONESTA: modelo de cuenta conectada */}
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }}><ShieldCheck size={20} /></div>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '0.95rem' }}>Tus abonos llegan directo a tu cuenta de Wompi.</p>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
            Bookeiro no retiene tu dinero ni cobra comisión por transacción. No hay saldo que retirar: cada pago se deposita en tu cuenta según los tiempos de Wompi.
          </p>
        </div>
      </div>

      {/* HISTORIAL REAL DE ABONOS */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={18} /> Abonos recibidos
      </h3>

      <div style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
        {payments.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ margin: '0 0 1rem' }}>Aún no has recibido abonos en línea.</p>
            <Link href="/dashboard/pagos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              <Settings size={16} /> Configurar cobros con abono
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {payments.map((p, i) => {
              const appt = first(p.appointments) || {}
              const svc = first(appt.services)
              const amount = Number(p.amount_in_cents || 0) / 100
              const when = p.created_at ? new Date(p.created_at) : (appt.start_time ? new Date(appt.start_time) : null)
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  borderBottom: i !== payments.length - 1 ? '1px solid var(--color-glass-border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(94, 122, 84, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5e7a54' }}>
                      <ArrowDownLeft size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '0.95rem' }}>
                        Abono - {appt.customer_name || 'Cliente'}
                      </p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '2px 0 0' }}>
                        {when ? when.toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : '—'}
                        {svc?.name ? ` • ${svc.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#5e7a54', fontSize: '1.05rem', fontVariantNumeric: 'tabular-nums' }}>
                      +{cop(amount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '4px' }}>
                      Aprobado
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
