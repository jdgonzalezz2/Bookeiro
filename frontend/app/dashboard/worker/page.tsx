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

  // helper for robust YYYY-MM-DD formatting independent of locale
  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // helper for robust HH:MM formatting
  const toTimeStr = (d: Date) => {
    return d.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Force 24h for consistency if needed, or keep for local feel
    });
  }

  try {
    const accessToken = await getAccessToken()
    const insforge = createInsForgeServerClient(accessToken)

    // 1. Get my staff profile
    const { data: myStaffRecord, error: staffError } = await insforge.database
      .from('staff')
      .select('id, name, avatar_url, tenant_id')
      .eq('user_id', profile.id)
      .single()

    if (staffError || !myStaffRecord) {
      console.error('Staff record error:', staffError)
      return <div style={{ padding: '2rem', textAlign: 'center' }}>Error: Registro de empleado no vinculado correctamente. Contacta al administrador.</div>
    }

    const { data: tenant, error: tenantError } = await insforge.database
      .from('tenants')
      .select('name, logo_url')
      .eq('id', profile.tenant_id)
      .single()

    if (tenantError) console.error('Tenant fetch error:', tenantError);

    // 2. Fetch today's and future appointments for this staff
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()
    
    const { data: appointments, error: appointmentsError } = await insforge.database
      .from('appointments')
      .select('id, tenant_id, service_id, customer_name, customer_phone, start_time, end_time, total_price, status, services(name, duration_mins)')
      .eq('staff_id', myStaffRecord.id)
      .gte('start_time', todayStartIso)
      .order('start_time', { ascending: true })

    if (appointmentsError) console.error('Error fetching appointments:', appointmentsError)

    const todayStr = toISODate(new Date())
    
    // Format the appointments locally to match UI expectations
    const formattedAppointments = (appointments || []).map(a => {
      const d = new Date(a.start_time)
      return {
        ...a,
        appointment_date: toISODate(d),
        start_time_str: toTimeStr(d),
        base_price: a.total_price // The column is total_price in DB
      }
    })

    // Stats for today
    const todayAppointments = formattedAppointments.filter(a => a.appointment_date === todayStr)
    const todayTotal = todayAppointments.reduce((acc, curr) => acc + Number(curr.base_price || 0), 0)

    const currentDateLabel = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    const currentWeekdayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long' })

    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 0.5rem 4rem' }}>
        
        {/* ── Premium Hero Section ── */}
        <div className="worker-hero" style={{
          background: 'linear-gradient(135deg, #111118 0%, #16161f 100%)', 
          border: '1px solid var(--color-glass-border)',
          borderRadius: '28px', 
          padding: '3rem', 
          marginBottom: '3rem',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Dynamic Mesh Background */}
          <div style={{ 
            position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', 
            background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', 
            filter: 'blur(40px)', zIndex: 0
          }} />
          <div style={{ 
            position: 'absolute', bottom: '-20%', left: '-5%', width: '250px', height: '250px', 
            background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)', 
            filter: 'blur(30px)', zIndex: 0
          }} />

          {/* Profile Card Overlay */}
          <div style={{ 
            position: 'relative',
            zIndex: 1,
            width: 100, height: 100, borderRadius: '24px', 
            background: 'var(--gradient-brand)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: 'var(--shadow-gold)',
            flexShrink: 0,
            transform: 'rotate(-3deg)'
          }}>
            {myStaffRecord?.avatar_url ? (
              <img src={myStaffRecord.avatar_url} style={{ width: '92%', height: '92%', borderRadius: '22px', objectFit: 'cover' }} />
            ) : (
              <UserRound size={48} style={{ color: '#111' }} />
            )}
          </div>
              <div className="worker-hero-content" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ 
                fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', 
                letterSpacing: '0.15em', background: 'rgba(201,168,76,0.15)', 
                color: 'var(--color-primary)', padding: '0.4rem 1rem', borderRadius: '100px',
                border: '1px solid rgba(201,168,76,0.2)'
              }}>
                Portal Professional
              </span>
            </div>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              ¡Qué bueno verte, <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{myStaffRecord.name.split(' ')[0]}</span>!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.15rem', marginTop: '0.75rem', fontWeight: 400 }}>
              Tienes un gran día por delante en <strong style={{color: 'var(--color-text-primary)'}}>{tenant?.name || 'la barbería'}</strong>.
            </p>
          </div>

          <div className="worker-hero-date" style={{ position: 'relative', zIndex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
             <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{currentDateLabel}</div>
             <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{currentWeekdayLabel}</div>
          </div>
        </div>


      {/* ── Glass Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        <div style={{ 
          background: 'var(--color-glass)', backdropFilter: 'blur(12px)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--color-glass-border)', 
          position: 'relative', transition: 'all 0.3s ease', cursor: 'default'
        }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.1em' }}>CITAS HOY</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{todayAppointments.length}</div>
            <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>agendadas</div>
          </div>
          <div style={{ position: 'absolute', right: '2rem', top: '2rem', color: 'var(--color-primary)', opacity: 0.2 }}>
            <Calendar size={32} />
          </div>
        </div>
        
        <div style={{ 
          background: 'var(--color-glass)', backdropFilter: 'blur(12px)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--color-glass-border)', 
          position: 'relative', transition: 'all 0.3s ease', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.05)'
        }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.1em' }}>PRODUCIDO ESTIMADO</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)', marginRight: '2px' }}>$</div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-display)' }}>{todayTotal.toLocaleString()}</div>
          </div>
          <div style={{ position: 'absolute', right: '2rem', top: '2rem', color: 'var(--color-success)', opacity: 0.2 }}>
            <DollarSign size={32} />
          </div>
        </div>

        <div style={{ 
          background: 'var(--color-glass)', backdropFilter: 'blur(12px)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--color-glass-border)', 
          position: 'relative'
        }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '0.1em' }}>REMANENTE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{(appointments?.length || 0) - todayAppointments.length}</div>
            <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>pendientes</div>
          </div>
          <div style={{ position: 'absolute', right: '2rem', top: '2rem', color: 'var(--color-primary)', opacity: 0.2 }}>
            <Clock size={32} />
          </div>
        </div>
      </div>

      {/* ── Timeline Agenda ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
          Tu Agenda Activa
        </h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500, background: 'var(--color-bg-surface)', padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid var(--color-border)' }}>
          {formattedAppointments.length} sesiones encontradas
        </div>
      </div>
      
      {formattedAppointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: 'var(--color-bg-surface)', borderRadius: '32px', color: 'var(--color-text-muted)', border: '2px dashed var(--color-border)' }}>
          <div style={{ marginBottom: '1.5rem', opacity: 0.2 }}>
            <Calendar size={64} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Todo despejado por ahora</h3>
          <p style={{ fontSize: '1rem', maxWidth: '300px', margin: '0 auto' }}>No tienes citas agendadas. ¡Aprovecha para descansar o pulir tus herramientas!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', position: 'relative' }}>
          {/* Vertical line for the timeline effect */}
          <div className="appointment-timeline-line" style={{ position: 'absolute', left: '44px', top: '2rem', bottom: '2rem', width: '2px', background: 'linear-gradient(to bottom, var(--color-primary) 0%, transparent 100%)', opacity: 0.1, zIndex: 0 }} />

          {formattedAppointments.map(app => {
            const isToday = app.appointment_date === todayStr;
            return (
              <div key={app.id} className="appointment-card" style={{ 
                background: 'var(--color-bg-card)', 
                border: '1px solid var(--color-border)', 
                padding: '1.5rem 2rem', 
                borderRadius: '24px', 
                display: 'flex', 
                gap: '2.5rem',
                alignItems: 'center', 
                position: 'relative',
                zIndex: 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isToday ? '0 10px 40px rgba(201,168,76,0.06)' : 'none',
                overflow: 'hidden'
              }}
              >
                {/* Time Indicator with Dot */}
                <div className="appointment-time-wrapper" style={{ textAlign: 'center', minWidth: '90px', position: 'relative' }}>
                  <div className="appointment-time-dot" style={{ 
                    width: '12px', height: '12px', borderRadius: '50%', background: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)', 
                    position: 'absolute', left: '-30px', top: '50%', transform: 'translateY(-50%)',
                    boxShadow: isToday ? '0 0 10px var(--color-primary)' : 'none',
                    border: '3px solid var(--color-bg-card)'
                  }} />
                  <div style={{ fontWeight: 800, fontSize: '1.4rem', color: isToday ? 'var(--color-primary)' : 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                    {app.start_time_str}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>
                    {isToday ? 'HOY' : app.appointment_date}
                  </div>
                </div>

                {/* Main Content */}
                <div className="appointment-main-content" style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: 52, height: 52, borderRadius: '16px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)'
                    }}>
                      <UserRound size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.3rem' }}>{app.customer_name}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Phone size={14} style={{ opacity: 0.5 }} />
                        {app.customer_phone}
                      </div>
                    </div>
                  </div>

                  <div className="appointment-meta" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div>
                      <div style={{ 
                        fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', 
                        padding: '0.4rem 0.8rem', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', 
                        display: 'inline-block', marginBottom: '0.5rem', border: '1px solid rgba(201,168,76,0.1)'
                      }}>
                        {(app.services as any)?.name || 'Servicio'}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <Clock size={14} style={{ opacity: 0.5 }}/> {(app.services as any)?.duration_mins || 0} min
                      </div>
                    </div>
                    <div style={{ minWidth: '100px' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-display)' }}>
                        ${app.base_price?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Estimado</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    );
    } catch (err) {
    console.error('Fatal error in worker dashboard:', err)
    return (
      <div style={{ 
        padding: '4rem 2rem', textAlign: 'center', background: 'var(--color-bg-card)', 
        borderRadius: '32px', margin: '2rem auto', maxWidth: '600px', border: '1px solid var(--color-border)' 
      }}>
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Algo salió mal</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          No pudimos cargar tu agenda en este momento. Por favor, intenta recargar la página.
        </p>
        <Link href="/dashboard" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Volver al Inicio
        </Link>
      </div>
    )
  }
}
