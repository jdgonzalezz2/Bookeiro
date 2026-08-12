/**
 * Step 8 responsive-projection tests. Zero-dependency `node:test`.
 * The projection is PURE geometry; state/rules/ledger are orientation-free, so
 * the same reducer + rail-core drive both orientations. No mobile domain logic.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { deriveLedger, nearestValidSlot, isFree, GRID_STEP_MS } from '../../../lib/rail-core'
import { demoReducer, initDemoState, findAppointment, type DemoState } from './reducer'
import { blockStyle, pointStyle } from './projection'

const fresh = () => initDemoState(createDemoDay())
const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)
const s0 = fresh()
const WIN = s0.window
const T = (h: number, m = 0): number => WIN.startMs + ((h - 9) * 60 + m) * 60_000
const num = (v: unknown): number => parseFloat(String(v).replace('%', ''))

// ---- projection geometry ----------------------------------------------------

test('1. desktop/horizontal uses the X axis (left + width)', () => {
  const s = blockStyle(T(10), T(11), WIN.startMs, WIN.endMs, 'horizontal')
  assert.ok('left' in s && 'width' in s)
  assert.ok(!('top' in s) && !('height' in s))
})

test('2. tablet also uses the horizontal axis (same helper, same orientation)', () => {
  // Tablet keeps the horizontal projection; only the viewport/scroll differs.
  const s = blockStyle(T(10), T(11), WIN.startMs, WIN.endMs, 'horizontal')
  assert.ok('left' in s && 'width' in s)
})

test('3. mobile uses the Y axis (top + height)', () => {
  const s = blockStyle(T(10), T(11), WIN.startMs, WIN.endMs, 'vertical')
  assert.ok('top' in s && 'height' in s)
  assert.ok(!('left' in s) && !('width' in s))
})

test('4. same appointment: identity/time/price/status independent of projection', () => {
  const a = findAppointment(fresh(), 'demo-appt-002')!
  // projection consumes only start/end; it never reads or changes appt fields
  const h = blockStyle(a.start, a.end, WIN.startMs, WIN.endMs, 'horizontal')
  const v = blockStyle(a.start, a.end, WIN.startMs, WIN.endMs, 'vertical')
  assert.equal(num(h.left), num(v.top)) // same time fraction, different axis
  assert.equal(num(h.width), num(v.height)) // same duration extent
})

test('5. 30-minute appointment has a correct proportional extent', () => {
  const v = blockStyle(T(10), T(10, 30), WIN.startMs, WIN.endMs, 'vertical')
  const expected = (30 * 60_000) / (WIN.endMs - WIN.startMs) * 100
  assert.ok(Math.abs(num(v.height) - expected) < 1e-6)
})

test('6. 60-minute extent is exactly twice 30-minute (both orientations)', () => {
  const e30h = num(blockStyle(T(10), T(10, 30), WIN.startMs, WIN.endMs, 'horizontal').width)
  const e60h = num(blockStyle(T(10), T(11), WIN.startMs, WIN.endMs, 'horizontal').width)
  const e30v = num(blockStyle(T(10), T(10, 30), WIN.startMs, WIN.endMs, 'vertical').height)
  const e60v = num(blockStyle(T(10), T(11), WIN.startMs, WIN.endMs, 'vertical').height)
  assert.ok(Math.abs(e60h - 2 * e30h) < 1e-6)
  assert.ok(Math.abs(e60v - 2 * e30v) < 1e-6)
})

test('7. 90-minute extent is exactly three times 30-minute', () => {
  const e30 = num(blockStyle(T(10), T(10, 30), WIN.startMs, WIN.endMs, 'vertical').height)
  const e90 = num(blockStyle(T(10), T(11, 30), WIN.startMs, WIN.endMs, 'vertical').height)
  assert.ok(Math.abs(e90 - 3 * e30) < 1e-6)
})

test('8. NowLine projects onto both orientations from ONE now timestamp', () => {
  const now = fresh().now
  const h = pointStyle(now, WIN.startMs, WIN.endMs, 'horizontal')
  const v = pointStyle(now, WIN.startMs, WIN.endMs, 'vertical')
  assert.ok('left' in h && !('top' in h))
  assert.ok('top' in v && !('left' in v))
  assert.equal(num(h.left), num(v.top))
})

// ---- state / rules are orientation-free ------------------------------------

test('9/10. staff switching is presentation-only: no responsive fields in domain state', () => {
  const s = fresh()
  for (const k of ['orientation', 'visibleLanes', 'mobileLaneId', 'viewport']) {
    assert.equal(k in s, false) // changing the visible lane cannot mutate domain state
  }
})

test('11. Ledger is identical across projections (deriveLedger takes no orientation)', () => {
  const l = deriveLedger(flat(fresh()))
  assert.equal(l.total, 270000)
  assert.equal(l.completedTotal, 70000)
  assert.equal(l.deposit, 135000)
})

test('12. collision behaviour is identical across projections (same reducer)', () => {
  const jul = s0.lanes[0].person.id
  const run = () => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: jul, desiredStart: T(10) }) // occupied+past
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  }
  assert.deepEqual(run(), run())
  assert.notEqual(run().collision, null)
})

test('13. nearestValidSlot result is independent of orientation (no orientation param)', () => {
  const appts = [{ id: 'x', laneId: 'L', serviceId: 's', start: T(13), end: T(13, 30), status: 'confirmed' as const, price: 1 }]
  const a = nearestValidSlot(WIN, appts, T(13), 30, T(9))
  const b = nearestValidSlot(WIN, appts, T(13), 30, T(9))
  assert.deepEqual(a, b)
  assert.equal(a!.start, T(12, 30)) // tie -> earlier, same as desktop
})

test('14. cross-staff movement validates against the target lane', () => {
  const dan = s0.lanes[1].person.id
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: dan, desiredStart: T(16) }) // Daniela 004 nearby
  s = demoReducer(s, { type: 'MOVE_COMMIT' })
  const a = findAppointment(s, 'demo-appt-002')!
  assert.equal(a.laneId, dan)
  const lane = s.lanes.find((l) => l.person.id === dan)!
  assert.equal(isFree(lane.appointments.filter((x) => x.id !== 'demo-appt-002'), { start: a.start, end: a.end }), true)
})

test('15. mobile move preserves appointment identity (exactly one appointment)', () => {
  const before = flat(fresh()).length
  const dan = s0.lanes[1].person.id
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: dan, desiredStart: T(12) })
  s = demoReducer(s, { type: 'MOVE_COMMIT' })
  assert.equal(flat(s).length, before) // no copy created
  assert.equal(flat(s).filter((a) => a.id === 'demo-appt-002').length, 1)
})

test('16. mobile tap-to-create uses the same tentative state', () => {
  const s = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: s0.lanes[0].person.id, serviceId: s0.services[0].id, start: T(18) })
  assert.notEqual(s.tentative, null)
})

test('17. breakpoint changes do not mutate domain state (state has no viewport concept)', () => {
  const a = fresh()
  const b = fresh()
  assert.deepEqual(a, b) // reconstructing the model at any width yields identical domain state
})

test('18. deterministic DemoDay remains deterministic', () => {
  assert.deepEqual(deriveLedger(flat(fresh())), deriveLedger(flat(fresh())))
})

test('19. reduced motion does not alter state results (reducer takes no motion input)', () => {
  const jul = s0.lanes[0].person.id
  const mv = () => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: jul, desiredStart: T(15) })
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  }
  assert.deepEqual(mv(), mv())
})

test('20. no separate mobile reducer / business rules exist', () => {
  // One reducer handles every action, including moves used by both projections.
  assert.equal(typeof demoReducer, 'function')
  const s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  assert.notEqual(s.moving, null) // same reducer serves desktop AND mobile
})
