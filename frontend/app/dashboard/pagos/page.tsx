import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import PaymentsClient from './PaymentsClient'

export const metadata = { title: 'Pagos y Cobros | Bookeiro' }

export default async function PaymentsSettingsPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')
  // Solo el dueño configura los cobros.
  if (profile.role !== 'owner') redirect('/dashboard/worker')

  const token = await getAccessToken()
  const insforge = createInsForgeServerClient(token)

  const { data: tenant } = await insforge.database
    .from('tenants')
    .select('id, name, deposit_enabled, deposit_percent')
    .eq('id', profile.tenant_id)
    .single()

  // Los secretos se leen server-side SOLO para derivar si ya están configurados;
  // nunca se envían al cliente (solo los booleanos has_*).
  const { data: secrets } = await insforge.database
    .from('tenant_payment_secrets')
    .select('wompi_public_key, is_sandbox, wompi_integrity_secret, wompi_events_secret')
    .eq('tenant_id', profile.tenant_id)
    .single()

  const initial = {
    deposit_enabled: Boolean(tenant?.deposit_enabled),
    deposit_percent: tenant?.deposit_percent ?? 50,
    is_sandbox: secrets?.is_sandbox ?? true,
    wompi_public_key: secrets?.wompi_public_key ?? '',
    has_integrity_secret: Boolean(secrets?.wompi_integrity_secret),
    has_events_secret: Boolean(secrets?.wompi_events_secret),
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Pagos y Cobros
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>
          Cobra un abono en línea al reservar. El dinero llega directo a tu cuenta de Wompi — Bookeiro nunca lo toca.
        </p>
      </header>
      <PaymentsClient initial={initial} />
    </div>
  )
}
