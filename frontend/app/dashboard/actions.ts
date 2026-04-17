'use server'

import { redirect } from 'next/navigation'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { clearAuthCookies, getAccessToken } from '@/lib/cookies'

export async function signOutAction() {
  const accessToken = await getAccessToken()
  if (accessToken) {
    const insforge = createInsForgeServerClient(accessToken)
    await insforge.auth.signOut()
  }
  await clearAuthCookies()
  redirect('/login')
}
