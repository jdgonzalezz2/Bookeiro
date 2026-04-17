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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Volver al Comando Central
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={32} className="text-primary" />
          Inteligencia de Negocio
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
          Métricas financieras y operativas analizadas en tiempo real. 
        </p>
      </div>

      <AnalyticsClient initialData={appointments || []} />
    </div>
  )
}
