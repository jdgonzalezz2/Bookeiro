/**
 * rail-core / types — pure domain types for the Bookeiro Time-Rail.
 *
 * ZERO React, ZERO backend, ZERO browser APIs. Instants are epoch milliseconds
 * (UTC numbers). Timezone and ISO<->ms conversion are owned by the data-source
 * adapter that CONSUMES this module, never by the rules here — that keeps every
 * rule deterministic (see `now` being passed explicitly everywhere).
 *
 * `Appointment` is STORED product data (mirrors public.appointments).
 * `Slot`, `Ledger`, and the derived Rail states are COMPUTED, never persisted.
 */

/** Epoch milliseconds (UTC). */
export type Millis = number

/** Money in Colombian pesos (COP), whole pesos — COP has no minor unit in practice. */
export type Money = number

/**
 * Stored appointment status. Documented mirror of the CHECK constraint on
 * public.appointments.status (migrations/01_booking_engine.sql):
 *   status IN ('pending','confirmed','cancelled','completed')
 * There is deliberately NO 'paid' — it does not exist in the backend.
 */
export type StoredStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

/**
 * Rail VISUAL state — a superset of what is stored. 'available' | 'tentative' |
 * 'in-progress' | 'collision' are DERIVED and never written to the DB.
 */
export type RailState =
  | 'available'
  | 'tentative'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'collision'

export interface Person {
  id: string
  name: string
  /** Optional avatar; presentation concern only. */
  avatarUrl?: string | null
}

/**
 * A service. `price` is the ALREADY-RESOLVED authoritative price
 * (COALESCE(staff_services.custom_price, services.base_price)) computed upstream
 * by the backend RPC. rail-core never invents or re-derives pricing.
 */
export interface Service {
  id: string
  name: string
  durationMins: number
  price: Money
}

/**
 * A stored appointment (mirrors public.appointments, minus the PII the rules
 * don't need). `start`/`end` are epoch ms. `price` is the server-authoritative
 * total_price — rail-core represents it, it does not compute it.
 */
export interface Appointment {
  id: string
  /** Owning lane = staff_id. */
  laneId: string
  serviceId: string
  start: Millis
  end: Millis
  status: StoredStatus
  price: Money
}

/**
 * A staff member's working window for ONE specific day, already resolved to
 * epoch-ms bounds by the caller (who owns the timezone + working_hours lookup).
 * `null` window means "no trabaja" that day.
 */
export interface WorkingWindow {
  startMs: Millis
  endMs: Millis
}

/** One lane = one professional's day. */
export interface Lane {
  person: Person
  /** null = the staff member does not work that day. */
  window: WorkingWindow | null
  appointments: Appointment[]
}

/** The whole day for a tenant. Presentation anchor; rules operate on Lanes. */
export interface TimeRail {
  /** Start-of-day reference (epoch ms). */
  dayStartMs: Millis
  lanes: Lane[]
}

/** A derived, addressable unit of open time. Never persisted. */
export interface Slot {
  start: Millis
  end: Millis
}

/** Derived money summary. Contains NO commission (not modeled in the backend). */
export interface Ledger {
  total: Money
  completedTotal: Money
  /** Platform-retained upfront deposit = total * 0.5. NOT a barber/house split. */
  deposit: Money
}
