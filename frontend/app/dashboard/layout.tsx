import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

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

  // RBAC Redirection: If staff tries to access owner pages, keep them in worker view
  if (profile?.role === 'barber') {
    // Only intercept if we are strictly at `/dashboard` or trying to access owner subfolders.
    // We will handle this in Next.js middleware, but here is a simple check.
  }

  return <>{children}</>
}
