/**
 * rail-core unit tests — pure rules only. Uses Node's built-in test runner
 * (`node:test` + `node:assert`), so it needs ZERO extra dependencies.
 *
 * Determinism: fixtures build instants with `Date.UTC(...)` (a pure function of
 * its arguments), never `Date.now()`. `now` is always passed explicitly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  overlaps,
  isFree,
  computeSlots,
  nearestValidSlot,
  deriveLedger,
  isInProgress,
  deriveAppointmentState,
  isBillable,
  formatCop,
  GRID_STEP_MS,
} from '../index'
import type { Appointment, WorkingWindow } from '../index'

// Fixed reference day (UTC). Value is irrelevant to the rules — only relative
// offsets matter — but it is deterministic across runs and machines.
const H = (h: number, m = 0): number => Date.UTC(2026, 0, 5, h, m, 0, 0)

const appt = (o: Partial<Appointment> = {}): Appointment => ({
  id: 'a',
  laneId: 's1',
  serviceId: 'svc',
  start: H(10),
  end: H(10, 45),
  status: 'confirmed',
  price: 45000,
  ...o,
})

const WINDOW_9_11: WorkingWindow = { startMs: H(9), endMs: H(11) }

// ---------------------------------------------------------------------------
// 1–3 + regression: the canonical collision predicate
// ---------------------------------------------------------------------------

test('1. overlapping appointments collide', () => {
  const a = { start: H(10), end: H(10, 45) }
  const b = { start: H(10, 30), end: H(11) }
  assert.equal(overlaps(a, b), true)
  assert.equal(overlaps(b, a), true) // symmetric
})

test('2. non-overlapping appointments do not collide', () => {
  const a = { start: H(10), end: H(10, 45) }
  const b = { start: H(11), end: H(11, 30) }
  assert.equal(overlaps(a, b), false)
})

test('3. back-to-back appointments are allowed', () => {
  const a = { start: H(10), end: H(10, 45) }
  const b = { start: H(10, 45), end: H(11, 15) }
  assert.equal(overlaps(a, b), false)
  assert.equal(isFree([appt({ start: a.start, end: a.end })], b), true)
})

test('REGRESSION: canonical SQL formula start<end && end>start — adjacency is valid', () => {
  // Mirrors public.book_appointment / getAvailableSlots:
  //   existing.start < candidate.end  AND  existing.end > candidate.start
  // Touching endpoints (a.end === b.start) must NEVER count as a collision.
  const first = { start: H(9), end: H(10) }
  const second = { start: H(10), end: H(11) } // starts exactly when first ends
  assert.equal(overlaps(first, second), false)
  assert.equal(overlaps(second, first), false)
  // One millisecond of true overlap DOES collide:
  assert.equal(overlaps(first, { start: H(10) - 1, end: H(11) }), true)
})

// ---------------------------------------------------------------------------
// 4: cancelled never blocks
// ---------------------------------------------------------------------------

test('4. cancelled appointments do not block availability', () => {
  const cancelled = appt({ status: 'cancelled', start: H(10), end: H(11) })
  assert.equal(isFree([cancelled], { start: H(10), end: H(10, 30) }), true)
  const slots = computeSlots(WINDOW_9_11, [cancelled], 30, H(9))
  // The 10:00 and 10:30 slots survive because the cancelled appt is ignored.
  assert.ok(slots.some((s) => s.start === H(10)))
  assert.ok(slots.some((s) => s.start === H(10, 30)))
})

// ---------------------------------------------------------------------------
// 5–9: computeSlots
// ---------------------------------------------------------------------------

test('5. 30-minute grid is respected', () => {
  const slots = computeSlots(WINDOW_9_11, [], 30, H(9))
  assert.deepEqual(slots.map((s) => s.start), [H(9), H(9, 30), H(10), H(10, 30)])
  // every consecutive start is exactly one grid step apart
  for (let i = 1; i < slots.length; i++) {
    assert.equal(slots[i].start - slots[i - 1].start, GRID_STEP_MS)
  }
})

test('6. appointment duration is respected', () => {
  const d30 = computeSlots(WINDOW_9_11, [], 30, H(9))
  const d60 = computeSlots(WINDOW_9_11, [], 60, H(9))
  assert.deepEqual(d60.map((s) => s.start), [H(9), H(9, 30), H(10)]) // 10:00+60=11:00 ok; 10:30+60>11:00
  assert.ok(d30.length > d60.length)
})

test('7. slots cannot exceed working hours', () => {
  const slots = computeSlots(WINDOW_9_11, [], 60, H(9))
  for (const s of slots) assert.ok(s.end <= WINDOW_9_11.endMs)
})

test('8. past slots are excluded (>= now boundary is inclusive)', () => {
  const slots = computeSlots(WINDOW_9_11, [], 30, H(9, 30))
  assert.deepEqual(slots.map((s) => s.start), [H(9, 30), H(10), H(10, 30)])
  for (const s of slots) assert.ok(s.start >= H(9, 30))
  // boundary: a slot starting exactly at `now` is INCLUDED
  const atBoundary = computeSlots(WINDOW_9_11, [], 30, H(9))
  assert.ok(atBoundary.some((s) => s.start === H(9)))
})

test('9. no working-hours window produces no slots (and no nearest slot)', () => {
  assert.deepEqual(computeSlots(null, [], 30, H(9)), [])
  assert.equal(nearestValidSlot(null, [], H(10), 30, H(9)), null)
})

// ---------------------------------------------------------------------------
// 10–11: nearestValidSlot
// ---------------------------------------------------------------------------

test('10. nearestValidSlot resolves an occupied desired position', () => {
  // 10:00–10:45 is booked. Want 10:00 (occupied). Nearest free grid slots are
  // 09:30 and 10:30, both 30 min away — tie resolves to the EARLIER (09:30).
  // (10:30 is itself occupied, but 09:30 wins the tie regardless.)
  const booked = [appt({ start: H(10), end: H(10, 45) })]
  const slot = nearestValidSlot(WINDOW_9_11, booked, H(10), 30, H(9))
  assert.notEqual(slot, null)
  assert.equal(slot!.start, H(9, 30))
  assert.equal(slot!.end, H(10))
  // and it is genuinely free
  assert.equal(isFree(booked, slot!), true)
})

test('11. nearestValidSlot returns null when no valid slot exists', () => {
  const full: WorkingWindow = { startMs: H(10), endMs: H(11) }
  const booked = [appt({ start: H(10), end: H(11), status: 'confirmed' })]
  assert.equal(nearestValidSlot(full, booked, H(10), 60, H(10)), null)
  // also: window physically too small for the duration
  assert.equal(nearestValidSlot({ startMs: H(9), endMs: H(9, 20) }, [], H(9), 30, H(9)), null)
})

// ---------------------------------------------------------------------------
// 12–16: ledger
// ---------------------------------------------------------------------------

test('12. ledger excludes cancelled appointments', () => {
  const led = deriveLedger([
    appt({ id: '1', price: 45000, status: 'confirmed' }),
    appt({ id: '2', price: 30000, status: 'cancelled' }),
  ])
  assert.equal(led.total, 45000)
})

test('13. ledger includes completed appointments', () => {
  const led = deriveLedger([appt({ id: '1', price: 50000, status: 'completed' })])
  assert.equal(led.total, 50000)
})

test('14. completedTotal is correct', () => {
  const led = deriveLedger([
    appt({ id: '1', price: 45000, status: 'confirmed' }),
    appt({ id: '2', price: 60000, status: 'completed' }),
    appt({ id: '3', price: 30000, status: 'cancelled' }),
  ])
  assert.equal(led.total, 105000)
  assert.equal(led.completedTotal, 60000)
})

test('15. deposit equals total * 0.5', () => {
  const led = deriveLedger([
    appt({ id: '1', price: 45000, status: 'confirmed' }),
    appt({ id: '2', price: 60000, status: 'completed' }),
  ])
  assert.equal(led.deposit, led.total * 0.5)
  assert.equal(led.deposit, 52500)
})

test('16. ledger contains no fake commission value', () => {
  const led = deriveLedger([appt({ price: 45000 })])
  assert.deepEqual(Object.keys(led).sort(), ['completedTotal', 'deposit', 'total'])
  assert.equal('commission' in led, false)
  assert.equal('staffShare' in led, false)
  assert.equal('houseShare' in led, false)
})

// ---------------------------------------------------------------------------
// 17: money formatting
// ---------------------------------------------------------------------------

test('17. money formatting uses COP/es-CO with zero decimals', () => {
  const s = formatCop(45000).replace(/ /g, ' ') // normalise non-breaking space
  assert.ok(s.includes('$'), `expected a "$" symbol in "${s}"`)
  assert.match(s, /45\.000/) // dot as thousands separator (es-CO)
  assert.ok(!/[.,]\d{2}\b/.test(s), `expected no decimals in "${s}"`)
  // larger number groups correctly and still has no decimals
  const big = formatCop(1234567).replace(/ /g, ' ')
  assert.match(big, /1\.234\.567/)
})

// ---------------------------------------------------------------------------
// 18–19: derived status semantics
// ---------------------------------------------------------------------------

test('18. in-progress is derived from now and appointment bounds', () => {
  const a = appt({ start: H(10), end: H(11), status: 'confirmed' })
  assert.equal(isInProgress(a, H(10, 30)), true) // inside
  assert.equal(isInProgress(a, H(9)), false) // before
  assert.equal(isInProgress(a, H(11)), true) // inclusive end
  assert.equal(isInProgress(appt({ ...a, status: 'completed' }), H(10, 30)), false)
  assert.equal(isInProgress(appt({ ...a, status: 'cancelled' }), H(10, 30)), false)
  assert.equal(deriveAppointmentState(a, H(10, 30)), 'in-progress')
  assert.equal(deriveAppointmentState(a, H(9)), 'confirmed')
})

test('19. pending follows the Rail confirmed visual semantics', () => {
  const pending = appt({ status: 'pending', start: H(10), end: H(11) })
  assert.equal(deriveAppointmentState(pending, H(9)), 'confirmed')
  assert.equal(deriveAppointmentState(pending, H(10, 30)), 'in-progress') // still derivable
  assert.equal(isBillable(pending), true)
  // pending contributes to the ledger like a confirmed booking
  assert.equal(deriveLedger([appt({ price: 40000, status: 'pending' })]).total, 40000)
})

// ---------------------------------------------------------------------------
// 20: determinism
// ---------------------------------------------------------------------------

test('20. deterministic: identical inputs produce identical outputs', () => {
  const appts = [appt({ start: H(10), end: H(10, 45) })]
  assert.deepEqual(
    computeSlots(WINDOW_9_11, appts, 30, H(9)),
    computeSlots(WINDOW_9_11, appts, 30, H(9)),
  )
  assert.deepEqual(
    nearestValidSlot(WINDOW_9_11, appts, H(10), 30, H(9)),
    nearestValidSlot(WINDOW_9_11, appts, H(10), 30, H(9)),
  )
  assert.deepEqual(deriveLedger(appts), deriveLedger(appts))
})
