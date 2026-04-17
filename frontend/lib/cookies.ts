import { cookies } from 'next/headers'

export const ACCESS_COOKIE = 'bookeiro_access_token'
export const REFRESH_COOKIE = 'bookeiro_refresh_token'

const baseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

/** Save auth tokens in httpOnly cookies after successful sign-in/sign-up. */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies()
  store.set(ACCESS_COOKIE, accessToken, { ...baseOptions, maxAge: 60 * 15 })         // 15 min
  store.set(REFRESH_COOKIE, refreshToken, { ...baseOptions, maxAge: 60 * 60 * 24 * 7 }) // 7 days
}

/** Clear auth cookies on sign-out. */
export async function clearAuthCookies() {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

/** Get the current access token from cookies (server only). */
export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value
}

/** Get the current refresh token from cookies (server only). */
export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value
}
