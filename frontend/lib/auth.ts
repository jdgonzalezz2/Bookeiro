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
