import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { CreditCard } from 'lucide-react'
import FinanceClient from './FinanceClient'

export const metadata = { title: 'Finanzas y Payouts | Bookeiro' }

export default async function FinancePage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/login')

  if (profile.role !== 'owner') {
    redirect('/dashboard/worker')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Fetch all Confirmed and Completed appointments to calculate the 50% retained cash
  const { data: appointments } = await insforge.database
    .from('appointments')
    .select(`
      id,
      customer_name,
      customer_phone,
      start_time,
      total_price,
      status,
      services(name)
    `)
    .in('status', ['confirmed', 'completed'])
    .eq('tenant_id', profile.tenant_id)
    .order('start_time', { ascending: false })

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver al Comando Central
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={32} className="text-primary" />
          Pasarela Financiera
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
          Administra los fondos cobrados por adelantado (50%) a través de reservas web.
        </p>
      </div>

      <FinanceClient appointments={appointments || []} />
    </div>
  )
}
