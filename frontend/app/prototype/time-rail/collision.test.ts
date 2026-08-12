/**
 * Step 5 collision + Calm Correction tests. Zero-dependency `node:test`.
 * REUSES rail-core (overlaps / isFree / nearestValidSlot / computeSlots) — the
 * collision predicate is never re-implemented — plus reducer-integration checks.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { overlaps, isFree, computeSlots, nearestValidSlot, deriveLedger } from '../../../lib/rail-core'
import type { Appointment, WorkingWindow } from '../../../lib/rail-core'
import { demoReducer, initDemoState, type DemoState } from './reducer'

// --- pure synthetic helpers (arbitrary but deterministic epoch ms) ----------
const M = 60_000
const T = (h: number, m = 0): number => (h * 60 + m) * M
const A = (start: number, end: number, status: Appointment['status'] = 'confirmed'): Appointment => ({
  id: `a${start}`, laneId: 'L', serviceId: 's', start, end, status, price: 1000,
})
const WIN: WorkingWindow = { startMs: T(9), endMs: T(20) }

const fresh = () => initDemoState(createDemoDay())
const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)

// ---------------------------------------------------------------------------
// rail-core rules reused in the collision context
// ---------------------------------------------------------------------------

test('1. overlapping candidate -> collision detected', () => {
  assert.equal(overlaps(A(T(10), T(11)), { start: T(10, 30), end: T(11, 30) }), true)
  assert.equal(isFree([A(T(10), T(11))], { start: T(10, 30), end: T(11, 30) }), false)
})

test('2. adjacency (end === start) -> no collision', () => {
  assert.equal(overlaps(A(T(10), T(11)), { start: T(11), end: T(11, 30) }), false)
  assert.equal(isFree([A(T(10), T(11))], { start: T(11), end: T(11, 30) }), true)
})

test('3. cancelled appointment -> ignored by collision detection', () => {
  assert.equal(isFree([A(T(10), T(11), 'cancelled')], { start: T(10), end: T(10, 30) }), true)
})

test('4. collision -> nearest valid 30-min slot, and it passes isFree', () => {
  const appts = [A(T(13), T(13, 30))] // 13:00 occupied
  const slot = nearestValidSlot(WIN, appts, T(13), 30, T(9))
  assert.notEqual(slot, null)
  assert.equal((slot!.start - WIN.startMs) % (30 * M), 0) // on the 30-min grid
  assert.equal(isFree(appts, slot!), true) // correction never violates isFree
})

test('5. tie between equally distant slots -> earlier slot wins', () => {
  // 13:00 occupied; 12:30 and 13:30 are both free and 30 min away -> 12:30.
  const slot = nearestValidSlot(WIN, [A(T(13), T(13, 30))], T(13), 30, T(9))
  assert.equal(slot!.start, T(12, 30))
})

test('6. candidate longer than remaining window -> no valid correction', () => {
  assert.equal(nearestValidSlot({ startMs: T(9), endMs: T(9, 20) }, [], T(9), 30, T(9)), null)
})

test('7. no working-hours row (window null) -> no valid slot', () => {
  assert.equal(nearestValidSlot(null, [A(T(10), T(11))], T(10), 30, T(9)), null)
})

test('8. past slots excluded (start >= now)', () => {
  const slot = nearestValidSlot(WIN, [A(T(13), T(13, 30))], T(13), 30, T(14)) // now = 14:00
  assert.ok(slot!.start >= T(14))
  for (const s of computeSlots(WIN, [], 30, T(14))) assert.ok(s.start >= T(14))
})

// ---------------------------------------------------------------------------
// reducer integration (Calm Correction end-to-end)
// ---------------------------------------------------------------------------

function collisionAttempt() {
  const s0 = fresh()
  const corte = s0.services[0].id // Corte, 30 min
  const target = flat(s0)
    .filter((a) => a.status === 'confirmed' && a.start >= s0.now)
    .sort((a, b) => a.start - b.start)[0] // Julián demo-appt-002 @ 13:00
  const r = demoReducer(s0, { type: 'CREATE_TENTATIVE', laneId: target.laneId, serviceId: corte, start: target.start })
  return { s0, r, target }
}

test('9. reducer: collision detected and Calm Correction proposes rail-core slot', () => {
  const { r, target } = collisionAttempt()
  assert.notEqual(r.collision, null)
  assert.equal(r.collision!.desiredStart, target.start)
  const lane = r.lanes.find((l) => l.person.id === target.laneId)!
  const expected = nearestValidSlot(lane.window, lane.appointments, target.start, 30, r.now)
  assert.deepEqual(r.collision!.proposed, expected) // reducer used rail-core, not a copy
  assert.equal(r.tentative!.start, expected!.start) // settled into the corrected slot
  assert.equal(expected!.start, target.start - 30 * M) // tie -> earlier (12:30)
})

test('10. reducer: the correction itself passes isFree()', () => {
  const { r, target } = collisionAttempt()
  const lane = r.lanes.find((l) => l.person.id === target.laneId)!
  assert.equal(isFree(lane.appointments, { start: r.tentative!.start, end: r.tentative!.end }), true)
})

test('11. ledger does not change merely because a collision was attempted', () => {
  const { s0, r } = collisionAttempt()
  assert.equal(deriveLedger(flat(r)).total, deriveLedger(flat(s0)).total) // 270000, unchanged
  assert.equal(flat(r).length, flat(s0).length) // nothing committed
})

test('12. reduced-motion: correction is fully determined synchronously (no animation)', () => {
  // The reducer returns the corrected tentative immediately; there is no timer or
  // animation the outcome depends on. The visual settle is decorative only.
  const { r } = collisionAttempt()
  assert.notEqual(r.tentative, null)
  assert.equal(r.collision!.proposed!.start, r.tentative!.start)
})

test('13. sin espacio hoy: no valid correction -> tentative null, proposed null', () => {
  const s0 = fresh()
  const corte = s0.services[0].id
  const at = s0.window.startMs
  // Synthetic day-off lane (window null) already occupied at `at`.
  const synthetic: DemoState = {
    ...s0,
    now: at,
    lanes: [
      {
        person: { id: 'off', name: 'Off', avatarUrl: null },
        window: null,
        appointments: [
          { id: 'b', laneId: 'off', serviceId: corte, start: at, end: at + 30 * M, status: 'confirmed', price: 35000, customerName: 'B' },
        ],
      },
    ],
  }
  const r = demoReducer(synthetic, { type: 'CREATE_TENTATIVE', laneId: 'off', serviceId: corte, start: at })
  assert.equal(r.tentative, null)
  assert.notEqual(r.collision, null)
  assert.equal(r.collision!.proposed, null)
})

test('14. deterministic: repeated collision produces the same correction', () => {
  const corte = fresh().services[0].id
  const target = flat(fresh())
    .filter((a) => a.status === 'confirmed' && a.start >= fresh().now)
    .sort((a, b) => a.start - b.start)[0]
  const attempt = () =>
    demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: target.laneId, serviceId: corte, start: target.start })
  assert.deepEqual(attempt(), attempt())
})
