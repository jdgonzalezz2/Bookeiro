import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { BarChart3 } from 'lucide-react'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Reportes y Analytics | Bookeiro' }

export default async function AnalyticsPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/login')

  if (profile.role !== 'owner') {
    redirect('/dashboard/worker')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Fetch all relevant appointments for deep analytics
  const { data: appointments } = await insforge.database
    .from('appointments')
    .select(`
      *,
      services(name),
      staff(name)
    `)
    .in('status', ['confirmed', 'completed', 'cancelled'])
    .eq('tenant_id', profile.tenant_id)
    .order('start_time', { ascending: true })

  return (
    <div className="dashboard-container">
      
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={32} /> Inteligencia de Negocio
        </h1>
        <p className="dashboard-page-desc">
          Métricas financieras y operativas analizadas en tiempo real. 
        </p>
      </header>

      <AnalyticsClient initialData={appointments || []} />
    </div>
  )
}
