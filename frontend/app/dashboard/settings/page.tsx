import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import ClientPage from './ClientPage'

export const metadata = {
  title: 'Configuración Web | Bookeiro'
}

export default async function SettingsServerWrapper() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) {
    redirect('/onboarding')
  }

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: tenant } = await insforge.database
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Personalizar Sitio
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>
          Administra la identidad gráfica, el diseño y las vías de contacto público de tu negocio.
        </p>
      </header>
      <ClientPage tenant={tenant} />
    </div>
  )
}
