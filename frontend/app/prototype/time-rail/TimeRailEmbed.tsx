/**
 * The embeddable Time-Rail. Self-contained and scoped under `.rail-proto` (imports
 * its own stylesheet), so it drops into ANY page. ONE source of truth for both:
 *
 *   - the marketing landing / prototype route → the deterministic DemoDay fixture
 *     (interactive, `source: 'demo'`), and
 *   - the authenticated dashboard → an adapted backend day (`source: 'real'`,
 *     rendered `readOnly` until mutation persistence lands, Step 19+).
 *
 * The header badge/date/now are DERIVED from the day itself, so the same chrome
 * describes demo and real data honestly without duplicated markup.
 */
import './rail-preview.css'
import { createDemoDay } from '@/lib/rail-core/demo'
import type { RailDay } from '@/lib/rail-core'
import { bogotaHM } from './geometry'
import RailClient, { type RailPersistence } from './RailClient'

/** Bogotá wall-clock date label, e.g. "Lunes 5 ene 2026". Deterministic: the
 *  explicit timeZone makes it independent of the host machine's zone. */
function bogotaDateLabel(dayStartMs: number): string {
  const d = new Date(dayStartMs)
  const opts = { timeZone: 'America/Bogota' } as const
  const weekday = new Intl.DateTimeFormat('es-CO', { ...opts, weekday: 'long' }).format(d)
  const dayNum = new Intl.DateTimeFormat('es-CO', { ...opts, day: 'numeric' }).format(d)
  const month = new Intl.DateTimeFormat('es-CO', { ...opts, month: 'short' }).format(d).replace('.', '')
  const year = new Intl.DateTimeFormat('es-CO', { ...opts, year: 'numeric' }).format(d)
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${cap} ${dayNum} ${month} ${year}`
}

export default function TimeRailEmbed({
  day = createDemoDay(),
  readOnly = false,
  persistence,
}: {
  day?: RailDay
  readOnly?: boolean
  persistence?: RailPersistence
}) {
  const isDemo = day.source === 'demo'
  const dateLabel = `${bogotaDateLabel(day.dayStartMs)} · ${bogotaHM(day.window.startMs)}–${bogotaHM(day.window.endMs)}`

  return (
    <div className="rail-proto" data-demo={isDemo || undefined} data-live={!isDemo || undefined}>
      <header className="rp-head">
        <div className="rp-head-id">
          <span className="rp-badge" data-live={!isDemo || undefined}>{isDemo ? 'DEMO' : 'EN VIVO'}</span>
          {/* h2, not h1: on the landing the hero already owns the page's h1. */}
          <h2 className="rp-title">{day.business.name}</h2>
          <span className="rp-date">{dateLabel}</span>
        </div>
        <div className="rp-head-now">
          <span className="rp-head-now-label">Ahora</span>
          <span className="rp-mono rp-head-now-time">{bogotaHM(day.now)}</span>
        </div>
      </header>

      <RailClient day={day} readOnly={readOnly} persistence={persistence} />
    </div>
  )
}
