import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import DashboardShell from './DashboardShell'
import Link from 'next/link'
import { UserX, LogOut } from 'lucide-react'
import { signOutAction } from './actions'

// CRITICAL: Prevent redirect loops by ensuring fresh data on every request
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Dashboard - Bookeiro' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile && !profile.tenant_id) {
    const accessToken = await getAccessToken()
    if (accessToken && profile.email) {
      const insforge = createInsForgeServerClient(accessToken)
      
      const { data: matched } = await insforge.database.rpc('accept_staff_invite', { 
        user_uuid: profile.id, 
        user_email: profile.email 
      })

      if (matched) {
        // Clear all caches and force a fresh load to pick up the new tenant association
        revalidatePath('/dashboard', 'layout')
        redirect('/dashboard')
      }
    }

    // IF Still no tenant_id but they have a 'barber' role, they are Orphans
    if (profile.role === 'barber') {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'var(--color-bg-base)' }}>
          <div style={{ maxWidth: 400, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '3rem 2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <UserX size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Invitación Pendiente</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              No hemos podido encontrar una barbería vinculada a tu correo <strong style={{color: 'var(--color-text-primary)'}}>{profile.email}</strong>. 
              Contacta a tu administrador para que te envíe una invitación.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <Link href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Reintentar Acceso</Link>
               <form action={signOutAction}>
                <button type="submit" style={{ width: '100%', background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <LogOut size={16} /> Cerrar Sesión
                </button>
               </form>
            </div>
          </div>
        </div>
      )
    }

    // Normal path for new owners who truly have no business yet
    redirect('/onboarding')
  }

  // Fetch tenant info for Sidebar using InsForge
  let tenant = null
  const accessToken = await getAccessToken()
  if (accessToken && profile.tenant_id) {
    const insforge = createInsForgeServerClient(accessToken)
    const { data } = await insforge.database
    .from('tenants')
    .select('name, slug, logo_url')
    .eq('id', profile.tenant_id)
    .single()
    tenant = data
  }

  return (
    <DashboardShell profile={profile} tenant={tenant}>
      {children}
    </DashboardShell>
  )
}
