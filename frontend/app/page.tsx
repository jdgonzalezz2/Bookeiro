import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

/**
 * Root page: redirect authenticated users to dashboard, others to login.
 */
export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
