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
    <div className="dashboard-container">
      
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={32} /> Pasarela Financiera
        </h1>
        <p className="dashboard-page-desc">
          Administra los fondos cobrados por adelantado (50%) a través de tus reservas web.
        </p>
      </header>

      <FinanceClient appointments={appointments || []} />
    </div>
  )
}
