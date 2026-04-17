import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { redirect } from 'next/navigation'
import CreateStaffClient from './CreateStaffClient'
import { Plus, Settings, Users, Hourglass, CheckCircle2, UserCircle } from 'lucide-react'

export const metadata = { title: 'Gestión de Personal | Bookeiro' }

export default async function StaffPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: staff } = await insforge.database
    .from('staff')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true })

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Encabezado con Pan de Migas / Nav Volver */}
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver al Dashboard
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={32} /> Personal y Barberos
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Administra tu equipo de trabajo y sus horarios.</p>
      </div>

      {/* Acción Nuevo Personal */}
      <CreateStaffClient />

      <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
        {staff?.length === 0 ? (
          <div className="alert border" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <UserCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            No tienes a nadie en tu equipo aún. Agrega tu primer barbero para empezar a agendar.
          </div>
        ) : (
          staff?.map((s: any) => (
            <div key={s.id} style={{ 
              background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', 
              padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {s.avatar_url ? <img src={s.avatar_url} alt={s.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/> : <UserCircle size={32} />}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: s.is_active ? '#2ecc71' : '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {s.is_active ? '● Activo' : '● Inactivo'}
                    
                    {s.user_id ? (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} /> Vinculado
                      </span>
                    ) : s.invite_email ? (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Hourglass size={12} /> Esperando a {s.invite_email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <Link href={`/dashboard/staff/${s.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} /> Configurar Horarios
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
