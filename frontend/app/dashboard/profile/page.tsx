import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { getAccessToken } from '@/lib/cookies'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import EditProfileClient from './EditProfileClient'

export default async function StaffProfilePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const accessToken = await getAccessToken()
  if (!accessToken) redirect('/login')

  const insforge = createInsForgeServerClient(accessToken)

  // Fetch the staff record linked to this user
  const { data: staff, error } = await insforge.database
    .from('staff')
    .select('*')
    .eq('user_id', profile.id)
    .single()

  if (error || !staff) {
    return (
      <div className="dashboard-container">
        <div className="card shadow-sm p-5 text-center">
          <h2 className="text-xl font-bold mb-2">Perfil no encontrado</h2>
          <p className="text-muted-foreground">No pudimos encontrar tu registro de empleado. Contacta al administrador de la tienda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Mi Perfil Profesional</h1>
        <p className="text-muted-foreground">Gestiona tu identidad pública en la plataforma.</p>
      </div>

      <div className="grid gap-8">
        <div className="card shadow-sm border-0 bg-glass backdrop-blur-md">
          <div className="card-body p-8">
            <EditProfileClient staff={staff} />
          </div>
        </div>
      </div>
    </div>
  )
}
