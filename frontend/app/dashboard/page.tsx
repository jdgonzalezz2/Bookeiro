import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { signOutAction } from './actions'
import { Calendar, Users, ListFilter, CreditCard, ShieldCheck, BarChart3, Scissors, LogOut, ArrowUpRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

const MODULES = [
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Agendamiento',
    desc: 'Prevención de colisiones y reservas automáticas',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Profesionales',
    desc: 'Perfiles, comisiones y configuración estricta.',
    badge: 'Activo', // Actually linking to staff is active!
    badgeClass: 'badge-active',
  },
  {
    icon: <ListFilter className="w-6 h-6" />,
    title: 'Servicios',
    desc: 'Catálogo público con tarifas y ventanas de tiempo.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Finanzas',
    desc: 'Liquidación automática pasarela.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Autenticación',
    desc: 'Protegido por InsForge SSR Sessions.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Reportes',
    desc: 'Analytics en tiempo real.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
]

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (profile.role === 'barber') {
    redirect('/dashboard/worker')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Fetch tenant info
  let tenant = null
  if (profile.tenant_id) {
    const { data } = await insforge.database
      .from('tenants')
      .select('name, slug, logo_url')
      .eq('id', profile.tenant_id)
      .single()
    tenant = data
  }

  const firstName = profile.name?.split(' ')[0] ?? profile.email.split('@')[0]

  return (
    <div className="dashboard-root">
      {/* ── Navbar ── */}
      <nav className="dashboard-nav">
        <div className="nav-logo">
          <div className="nav-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scissors size={20} strokeWidth={2.5}/>
          </div>
          <span className="nav-logo-name">Bookeiro</span>
        </div>
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{profile.name ?? 'Usuario'}</div>
            <div className="nav-user-email">{profile.email}</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-signout" title="Cerrar sesión" style={{ padding: '0.4rem' }}>
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="dashboard-content">
        <section className="dashboard-greeting">
          <h1 style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '2.5rem' }}>
            Bienvenido, <span style={{ color: 'var(--color-primary)' }}>{firstName}</span>.
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Tu centro de mando operativo se encuentra activo y protegido.</p>
        </section>

        {tenant && (
          <div style={{
            background: 'var(--color-glass)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 10px 30px -15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '16px', background: 'var(--color-bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Scissors className="text-gray-400" size={32} opacity={0.6}/>
                )}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {tenant.name}
                </h2>
                <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  Ir a bookeiro.com/{tenant.slug} <ArrowUpRight size={14}/>
                </a>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontWeight: 500 }}>
                Vitrina Pública
              </a>
              <Link href="/dashboard/settings" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontWeight: 600 }}>
                Diseño & Sitio Integrado
              </Link>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>Módulos del Ecosistema</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {MODULES.map((mod) => {
            const isStaff = mod.title === 'Profesionales'
            const isServices = mod.title === 'Servicios'
            const isBooking = mod.title === 'Agendamiento'
            const isAnalytics = mod.title === 'Reportes'
            const isFinance = mod.title === 'Finanzas'
            const isClickable = isStaff || isServices || isBooking || isAnalytics || isFinance
            
            let linkHref = '#'
            if (isStaff) linkHref = '/dashboard/staff'
            if (isServices) linkHref = '/dashboard/services'
            if (isBooking) linkHref = '/dashboard/booking'
            if (isAnalytics) linkHref = '/dashboard/analytics'
            if (isFinance) linkHref = '/dashboard/finance'
            
            const cardContent = (
              <div className={`dashboard-module-card ${isClickable ? 'clickable' : ''}`}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', background: isClickable ? 'rgba(201, 168, 76, 0.1)' : 'var(--color-bg-elevated)',
                  color: isClickable ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: isClickable ? '1px solid rgba(201,168,76,0.2)' : 'none'
                }}>
                  {mod.icon}
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: isClickable ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{mod.title}</h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.5, flex: 1, marginBottom: '1.5rem' }}>{mod.desc}</p>
                <span className={`card-badge ${isClickable ? 'badge-active' : mod.badgeClass}`} style={{ alignSelf: 'flex-start', padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '20px' }}>
                  {isClickable ? 'Abrir Módulo' : mod.badge}
                </span>
              </div>
            )

            if (isClickable) {
              return (
                <Link key={mod.title} href={linkHref} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {cardContent}
                </Link>
              )
            }

            return <div key={mod.title}>{cardContent}</div>
          })}
        </div>
      </main>
    </div>
  )
}

