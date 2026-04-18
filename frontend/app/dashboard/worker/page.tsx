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
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      
      {/* Welcome & Profile Summary */}
      <div style={{
        background: 'var(--color-bg-card)', 
        border: '1px solid var(--color-border)',
        borderRadius: '20px', 
        padding: '2.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2rem', 
        marginBottom: '2.5rem',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Element */}
        <div style={{ 
          position: 'absolute', top: -50, right: -50, width: 200, height: 200, 
          background: 'var(--color-primary)', opacity: 0.03, borderRadius: '50%' 
        }} />

        <div style={{ 
          width: 90, height: 90, borderRadius: '50%', 
          background: 'var(--color-bg-surface)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          border: '2px solid var(--color-primary)',
          boxShadow: '0 0 20px rgba(201,168,76,0.1)',
          flexShrink: 0
        }}>
          <UserRound size={44} style={{ color: 'var(--color-primary)' }} />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ 
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', 
              letterSpacing: '0.1em', background: 'rgba(201,168,76,0.1)', 
              color: 'var(--color-primary)', padding: '0.3rem 0.8rem', borderRadius: '100px' 
            }}>
              Portal de Empleado
            </span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            Hola, {myStaffRecord!.name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginTop: '0.5rem' }}>
            Gestiona tus citas de hoy en <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{tenant?.name}</span>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
           <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
        <div style={{ background: 'var(--color-bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#3b82f6' }} />
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>CITAS PARA HOY</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{todayAppointments.length}</div>
        </div>
        
        <div style={{ background: 'var(--color-bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#10B981' }} />
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>PRODUCIDO ESTIMADO</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10B981' }}>${todayTotal.toLocaleString()}</div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--color-primary)' }} />
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>PRÓXIMAS CITAS</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{(appointments?.length || 0) - todayAppointments.length}</div>
        </div>
      </div>

      {/* Appointments List */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
          Tu Agenda Activa
        </h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {formattedAppointments.length} citas encontradas
        </div>
      </div>
      
      {formattedAppointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}>
          <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem' }}>No tienes citas agendadas por el momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {formattedAppointments.map(app => (
            <div key={app.id} style={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--color-border)', 
              padding: '1.75rem', 
              borderRadius: 'var(--radius-lg)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1.5rem',
              transition: 'all 0.2s ease',
              boxShadow: app.appointment_date === todayStr ? '0 4px 20px rgba(59, 130, 246, 0.08)' : 'none',
              borderColor: app.appointment_date === todayStr ? '#3b82f6' : 'var(--color-border)'
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', minWidth: '80px', padding: '0.75rem', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: app.appointment_date === todayStr ? '#3b82f6' : 'var(--color-text-primary)' }}>
                    {app.start_time_str}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.2rem', color: 'var(--color-text-secondary)' }}>
                    {app.appointment_date === todayStr ? 'Hoy' : app.appointment_date}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{app.customer_name}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Phone size={12} />
                    </div>
                    {app.customer_phone}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ 
                  fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)', 
                  padding: '0.4rem 0.8rem', background: 'var(--color-bg-surface)', borderRadius: '8px', 
                  display: 'inline-block' 
                }}>
                  {(app.services as any)?.name || 'Servicio'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end' }}>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14}/> {(app.services as any)?.duration_mins || 0} min
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#10B981' }}>
                    ${app.base_price?.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
