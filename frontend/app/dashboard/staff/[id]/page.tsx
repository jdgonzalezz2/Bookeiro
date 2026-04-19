import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import HorariosClient from './HorariosClient'
import StaffManagementTabs from './StaffManagementTabs'
import { UserCircle } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Gestionar Barbero | Bookeiro` }
}

export default async function StaffDetailServer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const staffId = resolvedParams.id
  
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Get professional
  const { data: staff } = await insforge.database
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!staff) notFound()

  // Get their working hours
  const { data: hours } = await insforge.database
    .from('working_hours')
    .select('*')
    .eq('staff_id', staffId)
    .order('day_of_week', { ascending: true })

  return (
    <div className="dashboard-container">
      {/* Nav & Header Premium */}
      <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Link href="/dashboard/staff" style={{ 
          color: 'var(--color-text-secondary)', 
          textDecoration: 'none', 
          fontSize: '0.9rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
        }}>
          ← Volver a la lista de Personal
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            background: 'var(--color-bg-surface)', 
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {staff.avatar_url ? (
              <img src={staff.avatar_url} alt={staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle size={40} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </div>
          
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: 0, fontWeight: 800, lineHeight: 1 }}>
              Gestionar <span style={{ color: 'var(--color-primary)' }}>{staff.name}</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
               <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {staff.specialty || 'Profesional'}
              </span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-text-muted)' }} />
              <span style={{ fontSize: '0.85rem', color: staff.is_active ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                {staff.is_active ? '● Activo' : '● Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <StaffManagementTabs staff={staff} initialHours={hours || []} />
    </div>
  )
}
