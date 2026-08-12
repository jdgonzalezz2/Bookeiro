import { getCurrentProfile } from '@/lib/auth'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { redirect } from 'next/navigation'
import TimeRailEmbed from '@/app/prototype/time-rail/TimeRailEmbed'
import RailStatePanel from '@/app/prototype/time-rail/RailStatePanel'
import { loadRealRailDay } from '@/lib/rail-adapter/load-real-day'
import {
  createAppointmentAction,
  moveAppointmentAction,
  cancelAppointmentAction,
  completeAppointmentAction,
} from './actions'

export const metadata = { title: 'Agenda del día | Bookeiro' }

// Appointments carry PII and change per request — never cache this read.
export const dynamic = 'force-dynamic'

export default async function BookingDashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) redirect('/onboarding')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // `now` resolved ONCE here (server request instant) and threaded through as
  // day.now, so SSR and client hydration render the identical rail.
  const result = await loadRealRailDay(insforge, profile.tenant_id, Date.now())

  return (
    <div className="dashboard-container">
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title">Agenda del día</h1>
        <p className="dashboard-page-desc">
          Tu día real en la línea de tiempo, en vivo desde tu backend. Arrastra, reserva, completa o
          cancela — cada cambio se valida y se guarda en el servidor.
        </p>
      </header>

      {result.status === 'ok' ? (
        <TimeRailEmbed
          day={result.day}
          persistence={{
            create: createAppointmentAction,
            move: moveAppointmentAction,
            cancel: cancelAppointmentAction,
            complete: completeAppointmentAction,
          }}
        />
      ) : result.status === 'empty' ? (
        <RailStatePanel
          tone="empty"
          businessName={result.business.name}
          title="Aún no hay nada que mostrar hoy"
          message="No encontramos profesionales activos ni citas para hoy. Agrega tu equipo y sus horarios, y las reservas de tus clientes aparecerán aquí en la línea de tiempo."
        />
      ) : (
        <RailStatePanel
          tone="error"
          title="No pudimos cargar la agenda"
          message={`Ocurrió un problema al leer tus datos: ${result.message}. Vuelve a intentarlo en un momento.`}
        />
      )}
    </div>
  )
}
