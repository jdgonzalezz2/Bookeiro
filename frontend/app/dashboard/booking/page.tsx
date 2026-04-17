import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Agenda de Citas | Bookeiro' }

export default async function BookingDashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Fetch appointments with relation names
  const { data: appointments } = await insforge.database
    .from('appointments')
    .select(`
      *,
      staff ( name ),
      services ( name, duration_mins )
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('start_time', { ascending: true })

  const upcomingAppointments = appointments?.filter((a: any) => new Date(a.start_time).getTime() >= Date.now()) || []
  const pastAppointments = appointments?.filter((a: any) => new Date(a.start_time).getTime() < Date.now()) || []

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver al Dashboard
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.5rem' }}>Agenda de Reservas</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Controla y visualiza todas las citas agendadas por tus clientes en tiempo real.</p>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: '2rem 0 1rem' }}>Citas Próximas</h2>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {upcomingAppointments.length === 0 ? (
          <div className="alert border" style={{ textAlign: 'center', padding: '2rem' }}>No tienes citas próximas agendadas.</div>
        ) : (
          upcomingAppointments.map((a: any) => (
            <div key={a.id} style={{ 
              background: 'var(--gradient-card)', border: '1px solid var(--color-primary)', 
              padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{new Date(a.start_time).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}</div>
                <div style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>{a.customer_name} — {a.customer_phone}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {a.services?.name} (Con {a.staff?.name})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="card-badge badge-active">Confirmada</span>
                <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>Total: ${a.total_price}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: '3rem 0 1rem', color: 'var(--color-text-muted)' }}>Citas Anteriores</h2>
      <div style={{ display: 'grid', gap: '1rem', opacity: 0.7 }}>
        {pastAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>El historial está vacío.</div>
        ) : (
          pastAppointments.map((a: any) => (
            <div key={a.id} style={{ 
              background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', 
              padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
               <div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{new Date(a.start_time).toLocaleString()}</div>
                <div style={{ fontSize: '0.9rem' }}>{a.customer_name} — {a.services?.name}</div>
              </div>
              <div>Realizada ✓</div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
