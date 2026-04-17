import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
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
    title: 'POS & Facturación',
    desc: 'Punto de venta integrado con historial de cobros vinculado directamente a las citas.',
    badge: 'Próximamente',
    badgeClass: 'badge-coming',
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
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const firstName = user.name?.split(' ')[0] ?? user.email.split('@')[0]

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
            <div className="nav-user-name">{user.name ?? 'Usuario'}</div>
            <div className="nav-user-email">{user.email}</div>
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

        {/* Info card */}
        <div
          className="alert alert-info"
          style={{ marginBottom: '2rem', maxWidth: '600px' }}
        >
          🚀 <strong>Autenticación completada.</strong> Los módulos de agendamiento, POS y comisiones
          están en desarrollo activo. Pronto estarán disponibles.
        </div>

        {/* Modules Grid */}
        <div className="dashboard-grid">
          {MODULES.map((mod) => (
            <div key={mod.title} className="dashboard-card">
              <div className="card-icon-wrap">{mod.icon}</div>
              <div className="card-title">{mod.title}</div>
              <div className="card-desc">{mod.desc}</div>
              <span className={`card-badge ${mod.badgeClass}`}>{mod.badge}</span>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div
          style={{
            background: 'var(--color-glass)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            maxWidth: '480px',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Información de la cuenta
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>ID de usuario</span>
              <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Correo</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Estado</span>
              <span className="card-badge badge-active" style={{ marginTop: 0 }}>Verificado</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
