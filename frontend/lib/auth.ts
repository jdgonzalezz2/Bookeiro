import { createInsForgeServerClient } from './insforge-server'
import { getAccessToken } from './cookies'

export interface AuthUser {
  id: string
  email: string
  name?: string
}

/**
 * Get the current authenticated user from the access token cookie.
 * Returns null if not authenticated or token is invalid.
 *
 * Note: InsForge SDK stores the display name inside user.profile.name
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const insforge = createInsForgeServerClient(accessToken)
  const { data, error } = await insforge.auth.getCurrentUser()

  if (error || !data?.user) return null

  const user = data.user
  // Name can be in profile.name (InsForge SDK shape)
  const name = (user.profile as { name?: string } | null)?.name ?? undefined

  return {
    id: user.id,
    email: user.email,
    name,
  }
}

export interface AuthProfile extends AuthUser {
  tenant_id: string | null
  role: string | null
}

/**
 * Get the user's profile from the database, including their linked tenant.
 */
export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  let { data: profile } = await insforge.database
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  // Lazy-create the profile row on first access.
  // Newer InsForge no longer auto-creates a public.profiles row on signup,
  // so we self-heal here (users have an INSERT-own-row RLS policy).
  if (!profile) {
    const { data: created } = await insforge.database
      .from('profiles')
      .insert([{ id: user.id, name: user.name ?? null }])
      .select('tenant_id, role')
      .single()
    profile = created ?? null
  }

  return {
    ...user,
    tenant_id: profile?.tenant_id ?? null,
    role: profile?.role ?? null,
  }
}
