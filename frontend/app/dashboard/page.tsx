import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { signOutAction } from './actions'

export const metadata: Metadata = { title: 'Dashboard' }

const MODULES = [
  {
    icon: '📅',
    title: 'Motor de Agendamiento',
    desc: 'Reservas en tiempo real con prevención de colisiones y control de concurrencia estricta.',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
  },
  {
    icon: '💈',
    title: 'Gestión de Profesionales',
    desc: 'Perfiles de barberos con tarifas dinámicas, disponibilidad y métricas de rendimiento.',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
  },
  {
    icon: '🧾',
    title: 'Catálogo de Servicios',
    desc: 'Cortes, tratamientos y opciones reservables por tus clientes con precio y duración.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
  {
    icon: '💰',
    title: 'Comisiones Automáticas',
    desc: 'Liquidación automática de comisiones por período, con reportes exportables.',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
  },
  {
    icon: '🔐',
    title: 'Autenticación',
    desc: 'Inicio de sesión seguro con email/contraseña, Google y GitHub. Sesiones protegidas.',
    badge: 'Activo',
    badgeClass: 'badge-active',
  },
  {
    icon: '📊',
    title: 'Reportes & Analytics',
    desc: 'Dashboard financiero con visualización de ingresos en tiempo real.',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
  },
]

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

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
          <div className="nav-logo-icon">✂️</div>
          <span className="nav-logo-name">Bookeiro</span>
        </div>
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{profile.name ?? 'Usuario'}</div>
            <div className="nav-user-email">{profile.email}</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-signout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="dashboard-content">
        {/* Greeting */}
        <section className="dashboard-greeting">
          <h1>
            👋 Hola, <span>{firstName}</span>
          </h1>
          <p>Bienvenido a Bookeiro. Tu plataforma de gestión integral está lista.</p>
        </section>

        {/* Tenant Info Card */}
        {tenant && (
          <div style={{
            background: 'var(--gradient-card)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)'
              }}>
                {tenant.logo_url ? (
                  <img src={tenant.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>💈</span>
                )}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                  {tenant.name}
                </h2>
                <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.9rem', textDecoration: 'none' }}>
                  bookeiro.com/{tenant.slug} ↗
                </a>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Ver Sitio Público
              </a>
              <Link href="/dashboard/settings" className="btn btn-primary">
                Configurar Sitio
              </Link>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div className="dashboard-grid">
          {MODULES.map((mod) => {
            const isStaff = mod.title === 'Gestión de Profesionales'
            const isServices = mod.title === 'Catálogo de Servicios'
            const isBooking = mod.title === 'Motor de Agendamiento'
            const isClickable = isStaff || isServices || isBooking
            
            let linkHref = '#'
            if (isStaff) linkHref = '/dashboard/staff'
            if (isServices) linkHref = '/dashboard/services'
            if (isBooking) linkHref = '/dashboard/booking'
            
            const cardContent = (
              <div className="dashboard-card" style={isClickable ? { cursor: 'pointer', border: '1px solid var(--color-primary)' } : {}}>
                <div className="card-icon-wrap">{mod.icon}</div>
                <div className="card-title">{mod.title}</div>
                <div className="card-desc">{mod.desc}</div>
                <span className={`card-badge ${isClickable ? 'badge-active' : mod.badgeClass}`}>
                  {isClickable ? 'Acceder' : mod.badge}
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

