'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { setAuthCookies } from '@/lib/cookies'

// ─── Sign In ────────────────────────────────────────────────────────────────

export async function signInAction(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('redirect') ?? '/dashboard')

  if (!email || !password) {
    return { error: 'Por favor ingresa tu correo y contraseña.' }
  }

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.statusCode === 403) {
      return { error: 'Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada.' }
    }
    return { error: 'Correo o contraseña incorrectos.' }
  }

  if (!data?.accessToken || !data?.refreshToken) {
    return { error: 'Respuesta inválida del servidor. Intenta de nuevo.' }
  }

  await setAuthCookies(data.accessToken, data.refreshToken)

  // Safe redirect: only internal paths
  const safePath = redirectTo.startsWith('/') ? redirectTo : '/dashboard'
  redirect(safePath)
}

// ─── Initiate OAuth ──────────────────────────────────────────────────────────

export async function initiateOAuthAction(provider: 'google' | 'github') {
  const insforge = createInsForgeServerClient()

  const callbackUrl = new URL(
    '/api/auth/callback',
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ).toString()

  const { data, error } = await insforge.auth.signInWithOAuth({
    provider,
    redirectTo: callbackUrl,
    skipBrowserRedirect: true,
  })

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'No se pudo iniciar la autenticación con ' + provider)
  }

  // Store PKCE verifier in httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('bookeiro_code_verifier', data.codeVerifier ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  })

  redirect(data.url)
}
