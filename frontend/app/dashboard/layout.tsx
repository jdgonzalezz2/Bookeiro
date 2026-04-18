import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import DashboardShell from './DashboardShell'

export const metadata: Metadata = { title: 'Dashboard - Bookeiro' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile && !profile.tenant_id) {
    // Magic Link Interception: Check if user has a pending invite
    const accessToken = await getAccessToken()
    if (accessToken && profile.email) {
      const insforge = createInsForgeServerClient(accessToken)
      
      const { data: matched } = await insforge.database.rpc('accept_staff_invite', { 
        user_uuid: profile.id, 
        user_email: profile.email 
      })

      if (matched) {
        // Refresh to pick up new tenant_id and role
        redirect('/dashboard')
      }
    }

    // Normal path for new owners
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
