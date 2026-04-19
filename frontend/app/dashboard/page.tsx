import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { PenTool, ArrowUpRight, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  if (profile.role === 'barber') {
    redirect('/dashboard/worker')
  }

  const firstName = profile.name?.split(' ')[0] ?? profile.email.split('@')[0]

  return (
    <div className="dashboard-container">
      
      {/* ── Header ── */}
      <header className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            ¡Buen día, <span style={{ color: 'var(--color-primary)' }}>{firstName}</span>! 👋
          </h1>
          <p className="dashboard-page-desc">Tu centro de mando operativo se encuentra activo y protegido.</p>
        </div>
      </header>

      {/* ── Main Actions area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Call to action principal */}
        <div style={{
            background: 'var(--gradient-card)',
            border: '1px solid var(--color-border-focus)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-gold)'
        }}>
          {/* Subtle background icon */}
          <div style={{ position: 'absolute', right: '-10%', top: '-20%', opacity: 0.05, transform: 'rotate(-15deg)' }}>
            <PenTool size={300} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,168,76,0.15)', color: 'var(--color-primary)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
              <CheckCircle2 size={16} /> Alta Prioridad
            </div>
            
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
              Configurar diseño de tu Vitrina Pública
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Personaliza el logotipo, los colores, tu dirección y redes sociales. Tu página es el primer punto de contacto con tus clientes. Asegúrate de que luzca exactamente como tu marca se lo merece.
            </p>
            
            <Link href="/dashboard/settings" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem', width: 'auto', display: 'inline-flex' }}>
              <PenTool size={20} /> Ir a Editar Página 
            </Link>
          </div>
        </div>

        {/* Cajas secundarias temporales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Citas de Hoy</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>0</div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Aún no hay reservaciones registradas para el día de hoy.</p>
            <Link href="/dashboard/booking" style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 600, marginTop: 'auto' }}>
              Ver Agenda <ArrowUpRight size={16} />
            </Link>
          </div>

          <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Ingresos del Mes</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-success)' }}>$0.00</div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Facturación estimada a través de la pasarela Bookeiro.</p>
            <Link href="/dashboard/finance" style={{ color: 'var(--color-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 600, marginTop: 'auto' }}>
              Revisar Finanzas <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
