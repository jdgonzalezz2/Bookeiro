/**
 * rail-core / view-model — the PRESENTATION-INPUT shape shared by every producer
 * of a Time-Rail day: the deterministic marketing fixture (`createDemoDay`) AND
 * the backend adapter (`toRailDay`). One shape → one `RailClient` → one reducer,
 * so real data and demo data can never diverge into two scheduling models.
 *
 * Still pure data: ZERO React, ZERO backend, ZERO browser APIs. `customerName`
 * is DATA (a display label), not a rule input — the core rules never read it.
 *
 * `source` is the provenance guard: 'demo' = the in-memory fixture (never real),
 * 'real' = adapted backend rows. It exists so demo and real data are NEVER mixed
 * silently and so the UI can label a live rail honestly.
 */
import type { Appointment, Millis, Person, Service, WorkingWindow } from './types'

/**
 * A rail appointment = a stored `Appointment` plus the customer's display name.
 * The name is presentation-only; collision/ledger/state rules ignore it.
 */
export interface RailAppointment extends Appointment {
  /** Display-only customer label. '' when unknown (never used by rules). */
  customerName: string
}

/** One professional's day: their working window (null = "no trabaja") + appts. */
export interface RailLane {
  person: Person
  window: WorkingWindow | null
  appointments: RailAppointment[]
}

/** Identity of the business whose day is on the rail. */
export interface RailBusiness {
  id: string
  name: string
  slug: string
}

/**
 * A single day for one business, resolved to epoch-ms instants and ready to
 * render. Timezone/ISO conversion has ALREADY happened in the producer (fixture
 * or adapter) — rail-core rules stay timezone-agnostic and deterministic.
 */
export interface RailDay {
  /** Provenance. 'demo' = deterministic fixture; 'real' = backend-adapted. */
  source: 'demo' | 'real'
  business: RailBusiness
  /** Target day as an ISO date ('YYYY-MM-DD'), documentation/label only. */
  dateIso: string
  /** Start-of-day reference instant (epoch ms). */
  dayStartMs: Millis
  /** The reference "now" (epoch ms). Producer-supplied so SSR/hydration agree. */
  now: Millis
  /** Axis window for the day (overall earliest open → latest close). */
  window: WorkingWindow
  /** The service catalog referenced by the day's appointments. */
  services: Service[]
  lanes: RailLane[]
}
