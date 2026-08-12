import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { CreditCard } from 'lucide-react'
import FinanceClient from './FinanceClient'

export const metadata = { title: 'Finanzas y Cobros | Bookeiro' }

export default async function FinancePage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/login')

  if (profile.role !== 'owner') {
    redirect('/dashboard/worker')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Datos REALES: abonos aprobados (tabla payments) + total facturado (citas).
  const [{ data: payments }, { data: appointments }] = await Promise.all([
    insforge.database
      .from('payments')
      .select('id, amount_in_cents, currency, status, created_at, appointments(customer_name, start_time, services(name))')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false }),
    insforge.database
      .from('appointments')
      .select('total_price, status')
      .in('status', ['confirmed', 'completed'])
      .eq('tenant_id', profile.tenant_id),
  ])

  return (
    <div className="dashboard-container">
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={32} /> Finanzas y Cobros
        </h1>
        <p className="dashboard-page-desc">
          Los abonos que cobras en línea llegan directo a tu cuenta de Wompi. Aquí ves lo recaudado y lo facturado.
        </p>
      </header>

      <FinanceClient payments={payments || []} appointments={appointments || []} />
    </div>
  )
}
