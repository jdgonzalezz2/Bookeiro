import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('insforge_code')
  const error = searchParams.get('error')

  const base = request.nextUrl.origin

  if (error || !code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error ?? 'oauth_failed')}`, base))
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('bookeiro_code_verifier')?.value

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/login?error=missing_verifier', base))
  }

  const insforge = createInsForgeServerClient()
  const { data, error: exchangeError } = await insforge.auth.exchangeOAuthCode(code, codeVerifier)

  if (exchangeError || !data) {
    const msg = encodeURIComponent(exchangeError?.message ?? 'exchange_failed')
    return NextResponse.redirect(new URL(`/login?error=${msg}`, base))
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }

  cookieStore.set('bookeiro_access_token', data.accessToken, { ...cookieOptions, maxAge: 60 * 15 })
  if (data.refreshToken) {
    cookieStore.set('bookeiro_refresh_token', data.refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 })
  }

  // Clean up PKCE cookie
  cookieStore.delete('bookeiro_code_verifier')

  return NextResponse.redirect(new URL('/dashboard', base))
}
