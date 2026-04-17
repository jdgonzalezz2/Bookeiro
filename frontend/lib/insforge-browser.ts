'use client'

import { createClient } from '@insforge/sdk'

let client: ReturnType<typeof createClient> | null = null

/**
 * Returns a singleton InsForge client for browser/client components.
 * Uses the public NEXT_PUBLIC_ variables (safe to expose).
 */
export function getInsForgeClient() {
  if (!client) {
    client = createClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    })
  }
  return client
}
