import RailStatePanel from '@/app/prototype/time-rail/RailStatePanel'

/**
 * Suspense fallback for the real agenda read. Shows the rail chrome with a quiet
 * "loading" panel while today's data is fetched — no spinner library, no layout
 * shift (the panel occupies the same region the rail will).
 */
export default function Loading() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title">Agenda del día</h1>
        <p className="dashboard-page-desc">
          Tu día real en la línea de tiempo, en vivo desde tu backend.
        </p>
      </header>
      <RailStatePanel
        tone="loading"
        title="Cargando tu agenda…"
        message="Estamos trayendo las citas de hoy desde tu backend."
      />
    </div>
  )
}
