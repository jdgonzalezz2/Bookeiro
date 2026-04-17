import { createClient } from '@insforge/sdk'

/**
 * Creates an InsForge client for server-side use (SSR, Server Actions, API Routes).
 * Uses isServerMode: true to skip browser-specific logic.
 * Pass the current access token for authenticated requests.
 */
export function createInsForgeServerClient(accessToken?: string) {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.INSFORGE_ANON_KEY!,
    isServerMode: true,
    ...(accessToken ? { edgeFunctionToken: accessToken } : {}),
  })
}
