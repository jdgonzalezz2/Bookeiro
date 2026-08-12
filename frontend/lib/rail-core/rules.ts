/**
 * rail-core / rules — the canonical collision, availability, and slot-resolution
 * rules. There is exactly ONE collision formula (`overlaps`); every other rule
 * reuses it. These are DOCUMENTED MIRRORS of the backend; the SQL / server
 * actions remain the source of truth.
 */
import type { Appointment, Slot, WorkingWindow, Millis } from './types'
import { GRID_STEP_MS, minutesToMs } from './time'
import { isCancelled } from './status'

/**
 * CANONICAL COLLISION PREDICATE.
 *
 * Documented mirror of the SQL used by public.book_appointment
 * (migrations/01_booking_engine.sql, migrations/10_secure_booking_price.sql)
 * and the availability generator (app/[slug]/actions.ts):
 *
 *     existing.start_time < candidate.end_time
 *     AND existing.end_time > candidate.start_time
 *
 * SQL remains authoritative; this TypeScript is a mirror, NOT the source of truth.
 *
 * The strict `<` / `>` is intentional and load-bearing:
 *   BACK-TO-BACK IS ALLOWED  ->  a.end === b.start is NOT a collision.
 */
export function overlaps(
  a: { start: Millis; end: Millis },
  b: { start: Millis; end: Millis },
): boolean {
  return a.start < b.end && a.end > b.start
}

/**
 * Is `candidate` free within a lane's appointments?
 * Cancelled appointments never block (mirrors `status != 'cancelled'` in SQL).
 * Reuses the ONE canonical `overlaps()` — no second collision formula exists.
 */
export function isFree(
  appointments: readonly Appointment[],
  candidate: { start: Millis; end: Millis },
): boolean {
  return appointments.every((a) => isCancelled(a) || !overlaps(a, candidate))
}

/**
 * Derive available booking slots for one lane/day. Slots are NEVER stored.
 *
 * Documented mirror of app/[slug]/actions.ts getAvailableSlots():
 *   - grid anchored at workStart, stepping every 30 min (GRID_STEP_MS)
 *   - a candidate is valid iff  slotStart + duration <= workEnd
 *   - AND not in the past
 *   - AND isFree() (canonical collision, cancelled excluded)
 *
 * PAST-BOUNDARY NOTE: this module uses `slotStart >= now` per the Step-1
 * canonical spec. The live getAvailableSlots() currently uses strict
 * `slotStart > now`; the difference is a single boundary instant. Flagged for
 * the team to reconcile — rail-core does not modify the live action.
 */
export function computeSlots(
  window: WorkingWindow | null,
  appointments: readonly Appointment[],
  durationMins: number,
  now: Millis,
): Slot[] {
  if (!window) return [] // no trabaja
  const durationMs = minutesToMs(durationMins)
  const slots: Slot[] = []
  for (let start = window.startMs; start + durationMs <= window.endMs; start += GRID_STEP_MS) {
    const end = start + durationMs
    if (start >= now && isFree(appointments, { start, end })) {
      slots.push({ start, end })
    }
  }
  return slots
}

/**
 * Find the nearest grid-aligned slot to `desiredStart` that a booking of
 * `durationMins` can legally occupy — the engine behind "Calm Correction".
 *
 * Rules (all mirrors of product truth; never contradicts the backend):
 *   - grid anchored at workStart, 30-min step
 *   - start >= max(now, workStart)
 *   - start + duration <= workEnd
 *   - isFree() (canonical collision, cancelled excluded)
 *   - searched NEAREST-FIRST from desiredStart; ties resolve to the EARLIER slot
 *   - returns null when no legal slot exists (never forces an invalid one)
 */
export function nearestValidSlot(
  window: WorkingWindow | null,
  appointments: readonly Appointment[],
  desiredStart: Millis,
  durationMins: number,
  now: Millis,
): Slot | null {
  if (!window) return null
  const durationMs = minutesToMs(durationMins)
  const anchor = window.startMs
  const lowerBound = Math.max(now, window.startMs)
  const lastStart = window.endMs - durationMs
  if (lastStart < lowerBound) return null // window too small for this duration

  const kMin = Math.max(0, Math.ceil((lowerBound - anchor) / GRID_STEP_MS))
  const kMax = Math.floor((lastStart - anchor) / GRID_STEP_MS)
  if (kMax < kMin) return null

  const startFor = (k: number): Millis => anchor + k * GRID_STEP_MS
  const distFor = (k: number): number => Math.abs(startFor(k) - desiredStart)

  // Two-pointer outward walk from the grid index closest to desiredStart.
  const kf = (desiredStart - anchor) / GRID_STEP_MS
  let below = Math.floor(kf)
  let above = below + 1

  while (below >= kMin || above <= kMax) {
    const belowOk = below >= kMin && below <= kMax
    const aboveOk = above >= kMin && above <= kMax
    let k: number
    if (belowOk && (!aboveOk || distFor(below) <= distFor(above))) {
      // tie (distFor equal) resolves here -> EARLIER slot wins
      k = below
      below--
    } else if (aboveOk) {
      k = above
      above++
    } else {
      // both pointers currently outside [kMin,kMax]; keep walking toward it
      below--
      above++
      continue
    }
    const start = startFor(k)
    const candidate = { start, end: start + durationMs }
    if (isFree(appointments, candidate)) return candidate
  }
  return null
}
