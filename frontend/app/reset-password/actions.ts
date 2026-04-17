'use server'

import { redirect } from 'next/navigation'
import { createInsForgeServerClient } from '@/lib/insforge-server'

// Step 1: Send reset code to email
export async function sendResetEmailAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean; email?: string }> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Ingresa tu correo electrónico.' }

  const insforge = createInsForgeServerClient()
  try {
    await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: new URL('/reset-password', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').toString(),
    })
    return { success: true, email }
  } catch {
    return { error: 'No pudimos enviar el correo. Verifica la dirección e intenta de nuevo.' }
  }
}

// Step 2: Exchange code for reset token
export async function exchangeResetCodeAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; token?: string; email?: string }> {
  const email = String(formData.get('email') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim()

  if (!email || code.length !== 6) {
    return { error: 'Ingresa el código de 6 dígitos enviado a tu correo.' }
  }

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code })

  if (error || !data?.token) {
    return { error: 'Código inválido o expirado. Solicita uno nuevo.' }
  }

  return { token: data.token, email }
}

// Step 3: Set new password
export async function resetPasswordAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const newPassword = String(formData.get('newPassword') ?? '')
  const otp = String(formData.get('token') ?? '')

  if (newPassword.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.resetPassword({ newPassword, otp })

  if (error) {
    return { error: 'No se pudo restablecer la contraseña. Intenta de nuevo.' }
  }

  redirect('/dashboard')
}
