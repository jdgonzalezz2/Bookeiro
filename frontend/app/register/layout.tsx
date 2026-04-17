import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Crear Cuenta' }

export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  return <>{children}</>
}
