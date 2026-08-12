/**
 * A quiet, COMPÁS-consistent panel for the real rail's non-data states:
 * loading (Suspense fallback), empty (no staff/appointments), and error. It
 * reuses the `.rail-proto` chrome so these states speak the same visual language
 * as the rail itself — no spinner library, no generic SaaS skeleton/card system.
 */
import './rail-preview.css'

export default function RailStatePanel({
  tone,
  title,
  message,
  businessName,
  dateLabel,
}: {
  tone: 'loading' | 'empty' | 'error'
  title: string
  message: string
  businessName?: string
  dateLabel?: string
}) {
  return (
    <div className="rail-proto" data-live>
      <header className="rp-head">
        <div className="rp-head-id">
          <span className="rp-badge" data-live>EN VIVO</span>
          <h2 className="rp-title">{businessName ?? 'Agenda del día'}</h2>
          {dateLabel && <span className="rp-date">{dateLabel}</span>}
        </div>
      </header>
      <div className="rp-state" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
        <p className="rp-state-title">{title}</p>
        <p className="rp-state-msg">{message}</p>
      </div>
    </div>
  )
}
