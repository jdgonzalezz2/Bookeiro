'use server'

import { redirect } from 'next/navigation'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { setAuthCookies } from '@/lib/cookies'

// ─── Sign Up ────────────────────────────────────────────────────────────────

export async function signUpAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; requireVerification?: boolean; email?: string }> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!name || !email || !password) {
    return { error: 'Todos los campos son obligatorios.' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
    redirectTo: new URL('/login?verified=1', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').toString(),
  })

  if (error) {
    if (error.statusCode === 409) {
      return { error: 'Ya existe una cuenta con este correo. ¿Quieres iniciar sesión?' }
    }
    return { error: error.message ?? 'Error al crear la cuenta. Intenta de nuevo.' }
  }

  if (data?.requireEmailVerification) {
    return { requireVerification: true, email }
  }

  // No verification required — user is signed in
  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)
    redirect('/dashboard')
  }

  return { error: 'Respuesta inesperada. Intenta de nuevo.' }
}

// ─── Verify Email (OTP code) ─────────────────────────────────────────────────

export async function verifyEmailAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim()
  const otp = String(formData.get('otp') ?? '').trim()

  if (!email || otp.length !== 6) {
    return { error: 'Ingresa el código de 6 dígitos que enviamos a tu correo.' }
  }

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.verifyEmail({ email, otp })

  if (error) {
    if (error.statusCode === 400) {
      return { error: 'Código inválido o expirado. Solicita uno nuevo.' }
    }
    return { error: 'No se pudo verificar el código. Intenta de nuevo.' }
  }

  // verifyEmail auto-saves the session on success
  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)
  }

  redirect('/dashboard')
}

// ─── Resend Verification Email ───────────────────────────────────────────────

export async function resendVerificationAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email requerido.' }

  const insforge = createInsForgeServerClient()
  try {
    await insforge.auth.resendVerificationEmail({
      email,
      redirectTo: new URL('/login?verified=1', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').toString(),
    })
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reenviar el correo.'
    return { error: msg }
  }
}
