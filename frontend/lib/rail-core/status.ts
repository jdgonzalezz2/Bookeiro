/**
 * rail-core / status — reconciles the real 4-status DB schema to the Rail's
 * derived visual states. Nothing here is persisted.
 */
import type { Appointment, Millis, RailState } from './types'

/** Cancelled appointments are excluded from billing AND collision. */
export const isCancelled = (a: Appointment): boolean => a.status === 'cancelled'

/** Billable = every non-cancelled appointment (pending / confirmed / completed). */
export const isBillable = (a: Appointment): boolean => !isCancelled(a)

/**
 * Is a pending/confirmed appointment happening at `now`?
 * DERIVED only — never stored. Inclusive bounds: now in [start, end].
 * (Distinct from the strict `<`/`>` collision rule — a different concept.)
 */
export function isInProgress(a: Appointment, now: Millis): boolean {
  if (a.status === 'cancelled' || a.status === 'completed') return false
  return now >= a.start && now <= a.end
}

/**
 * Derive the Rail visual state of a RENDERABLE appointment. The caller must
 * exclude cancelled appointments first (they are not drawn as blocks).
 *
 * Encodes the reconciliation of the idealized state machine to the real schema:
 *   - 'pending' follows 'confirmed' visual semantics (legacy status).
 *   - 'in-progress' is derived from `now`, never stored.
 *   - 'completed' is terminal (there is NO separate 'paid' state).
 */
export function deriveAppointmentState(
  a: Appointment,
  now: Millis,
): Extract<RailState, 'confirmed' | 'in-progress' | 'completed'> {
  if (a.status === 'completed') return 'completed'
  // 'pending' and 'confirmed' are visually identical; only the clock adds 'in-progress'.
  return isInProgress(a, now) ? 'in-progress' : 'confirmed'
}
