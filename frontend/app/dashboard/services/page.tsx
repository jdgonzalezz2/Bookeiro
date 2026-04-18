import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { redirect } from 'next/navigation'
import CreateServiceClient from './CreateServiceClient'

export const metadata = { title: 'Catálogo de Servicios | Bookeiro' }

export default async function ServicesPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: services } = await insforge.database
    .from('services')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true })

  return (
    <div className="dashboard-container">
      
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title">Servicios y Precios</h1>
        <p className="dashboard-page-desc">Configura los servicios que tus clientes pueden agendar en tu portal.</p>
      </header>

      <CreateServiceClient />

      <div style={{ marginTop: '2.5rem', display: 'grid', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Servicios Activos</h2>
        
        {services?.length === 0 ? (
          <div className="alert border" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
             No tienes servicios aún. Crea al menos uno para que tus clientes puedan reservar.
          </div>
        ) : (
          services?.map((s: any) => (
            <div key={s.id} style={{ 
              background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', 
              padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</div>
                {s.description && <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{s.description}</div>}
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                  <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    ⏱️ {s.duration_mins} min
                  </span>
                  <span style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-primary)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
                    💰 ${s.base_price}
                  </span>
                </div>
              </div>
              
              <div>
                <button className="btn btn-ghost" style={{ color: '#e74c3c' }}>
                  Hacer Inactivo
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
