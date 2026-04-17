import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { LogOut, Scissors, Phone, Clock, DollarSign, Calendar, UserRound } from 'lucide-react'
import { signOutAction } from '../actions'

export const metadata = { title: 'Portal del Empleado | Bookeiro' }

export default async function WorkerDashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  // Security: only staff can be here. (Owners go to standard dashboard)
  if (profile.role !== 'barber') {
    redirect('/dashboard')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // 1. Get my staff profile
  const { data: myStaffRecord } = await insforge.database
    .from('staff')
    .select('id, name, avatar_url, tenant_id')
    .eq('user_id', profile.id)
    .single()

  if (!myStaffRecord) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Error: Registro de empleado no vinculado correctamente. Contacta al administrador.</div>
  }

  const { data: tenant } = await insforge.database
    .from('tenants')
    .select('name, logo_url')
    .eq('id', profile.tenant_id)
    .single()

  // 2. Fetch today's and future appointments for this staff
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartIso = todayStart.toISOString()
  
  const { data: appointments, error } = await insforge.database
    .from('appointments')
    .select('id, tenant_id, service_id, customer_name, customer_phone, start_time, end_time, total_price, status, services(name, duration_mins)')
    .eq('staff_id', myStaffRecord.id)
    .gte('start_time', todayStartIso)
    .order('start_time', { ascending: true })

  if (error) console.error('Error fetching appointments:', error)

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  
  // Format the appointments locally to match UI expectations
  const formattedAppointments = (appointments || []).map(a => {
    const d = new Date(a.start_time)
    return {
      ...a,
      appointment_date: d.toLocaleDateString('en-CA'),
      start_time_str: d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      base_price: a.total_price // The column is total_price in DB
    }
  })

  // Stats for today
  const todayAppointments = formattedAppointments.filter(a => a.appointment_date === todayStr)
  const todayTotal = todayAppointments.reduce((acc, curr) => acc + Number(curr.base_price || 0), 0)

  return (
    <div className="dashboard-root" style={{ background: 'var(--color-bg-base)' }}>
      {/* ── Navbar ── */}
      <nav className="dashboard-nav" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
        <div className="nav-logo">
          <div className="nav-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scissors size={20} />
          </div>
          <span className="nav-logo-name">{tenant?.name} <span style={{fontSize:'0.8rem', opacity:0.7}}>(Portal Vendedor)</span></span>
        </div>
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{myStaffRecord.name.split(' ')[0]}</div>
            <div className="nav-user-email">Barbero</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-signout" title="Cerrar sesión" style={{ padding: '0.4rem' }}>
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="dashboard-content" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Welcome Card */}
        <div style={{
          background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)',
          borderRadius: '16px', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap'
        }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
            <UserRound size={40} className="text-gray-400" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Hola, {myStaffRecord.name.split(' ')[0]}</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.4rem' }}>Aquí está tu agenda de trabajo.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ background: 'var(--color-glass)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>CITAS PARA HOY</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{todayAppointments.length}</div>
          </div>
          <div style={{ background: 'var(--color-glass)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', borderLeft: '4px solid #2ecc71' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>PRODUCIDO HOY (Est.)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2ecc71' }}>${todayTotal.toLocaleString()}</div>
          </div>
          <div style={{ background: 'var(--color-glass)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', borderLeft: '4px solid #f39c12' }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>PRÓXIMOS DÍAS</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{(appointments?.length || 0) - todayAppointments.length}</div>
          </div>
        </div>

        {/* Appointments List */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Tu Agenda Activa</h2>
        
        {formattedAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--color-glass)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
            No tienes citas agendadas por el momento.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {formattedAppointments.map(app => (
              <div key={app.id} style={{ 
                background: app.appointment_date === todayStr ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-glass)', 
                border: app.appointment_date === todayStr ? '1px solid #3b82f6' : '1px solid var(--color-border)', 
                padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' 
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.2rem', color: app.appointment_date === todayStr ? '#3b82f6' : 'inherit' }}>
                      {app.start_time_str}
                    </span>
                    {app.appointment_date === todayStr && <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>Hoy</span>}
                    {app.appointment_date !== todayStr && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{app.appointment_date}</span>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{app.customer_name}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} /> {app.customer_phone}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{(app.services as any)?.name || 'Servicio'}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}><Clock size={12}/> {(app.services as any)?.duration_mins || 0} min</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}><DollarSign size={16}/> {app.base_price}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
