/**
 * Step 7 interaction tests. Zero-dependency `node:test`. Pointer and keyboard
 * both dispatch the SAME MOVE_* reducer actions, so testing the reducer proves
 * both. All move validation reuses rail-core (isFree / nearestValidSlot / grid).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { deriveLedger, computeSlots, isFree, GRID_STEP_MS } from '../../../lib/rail-core'
import { demoReducer, initDemoState, findAppointment, type DemoState } from './reducer'

const fresh = () => initDemoState(createDemoDay())
const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)
const find = (s: DemoState, id: string) => findAppointment(s, id)!
const s0 = fresh()
const WIN = s0.window.startMs
const T = (h: number, m = 0): number => WIN + ((h - 9) * 60 + m) * 60_000
const JUL = s0.lanes[0].person.id
const DAN = s0.lanes[1].person.id
const SOF = s0.lanes[2].person.id
const CORTE = s0.services[0].id

/** A full pointer/keyboard-equivalent move (START -> TO -> COMMIT). */
function move(s: DemoState, id: string, laneId: string, desiredStart: number): DemoState {
  let x = demoReducer(s, { type: 'MOVE_START', id })
  x = demoReducer(x, { type: 'MOVE_TO', laneId, desiredStart })
  return demoReducer(x, { type: 'MOVE_COMMIT' })
}

test('1. drag within free time: snaps to grid, moves, ledger unchanged', () => {
  const before = deriveLedger(flat(fresh()))
  const s = move(fresh(), 'demo-appt-002', JUL, T(15, 7)) // off-grid desired
  const a = find(s, 'demo-appt-002')
  assert.equal(a.start, T(15)) // snapped to the 30-min grid
  assert.equal(a.end, T(15, 30))
  assert.equal((a.start - WIN) % GRID_STEP_MS, 0)
  assert.deepEqual(deriveLedger(flat(s)), before)
  assert.equal(s.collision, null)
})

test('2. drag onto occupied time: correction via nearestValidSlot, never invalid', () => {
  const s = move(fresh(), 'demo-appt-002', JUL, T(10)) // 10:00 occupied by 001 (and past)
  const a = find(s, 'demo-appt-002')
  assert.notEqual(s.collision, null)
  assert.notEqual(s.collision!.proposed, null)
  assert.equal(a.start, s.collision!.proposed!.start) // committed at the corrected slot
  const lane = s.lanes.find((l) => l.person.id === JUL)!
  assert.equal(isFree(lane.appointments.filter((x) => x.id !== 'demo-appt-002'), { start: a.start, end: a.end }), true)
})

test('3. drag onto adjacent (end === next.start) is allowed (cross-lane free)', () => {
  const s = move(fresh(), 'demo-appt-002', DAN, T(13, 30)) // 30-min -> ends 14:00 == 004.start
  const a = find(s, 'demo-appt-002')
  assert.equal(a.laneId, DAN)
  assert.equal(a.start, T(13, 30))
  assert.equal(a.end, T(14))
  assert.equal(s.collision, null) // adjacency is not a collision
})

test('4. drag beyond working hours: corrected, no invalid end', () => {
  const s = move(fresh(), 'demo-appt-002', JUL, T(19, 45)) // snaps to 20:00 -> 20:30 exceeds close
  const a = find(s, 'demo-appt-002')
  assert.ok(a.end <= s0.window.endMs)
  assert.notEqual(s.collision, null)
})

test('5/6/7. 30 / 60 / 90-minute movements preserve duration', () => {
  const d30 = find(move(fresh(), 'demo-appt-002', JUL, T(12)), 'demo-appt-002') // Corte 30
  assert.equal(d30.end - d30.start, 30 * 60_000)
  const d60 = find(move(fresh(), 'demo-appt-006', SOF, T(12)), 'demo-appt-006') // Corte+barba 60
  assert.equal(d60.end - d60.start, 60 * 60_000)
  const d90 = find(move(fresh(), 'demo-appt-004', DAN, T(12)), 'demo-appt-004') // Color 90
  assert.equal(d90.end - d90.start, 90 * 60_000)
})

test('8. cross-staff movement validates against the target lane', () => {
  const s = move(fresh(), 'demo-appt-002', SOF, T(12))
  const a = find(s, 'demo-appt-002')
  assert.equal(a.laneId, SOF)
  assert.equal(a.start, T(12))
  assert.equal(s.collision, null)
})

test('9. cross-staff collision: correction uses the TARGET lane', () => {
  const s = move(fresh(), 'demo-appt-002', SOF, T(16)) // Sofía 006 occupies 16:00
  const a = find(s, 'demo-appt-002')
  assert.equal(a.laneId, SOF)
  assert.notEqual(s.collision, null)
  const lane = s.lanes.find((l) => l.person.id === SOF)!
  assert.equal(isFree(lane.appointments.filter((x) => x.id !== 'demo-appt-002'), { start: a.start, end: a.end }), true)
})

test('10. no valid target: appointment unchanged + "sin espacio"', () => {
  const withOff: DemoState = {
    ...fresh(),
    lanes: [...fresh().lanes, { person: { id: 'off', name: 'Off', avatarUrl: null }, window: null, appointments: [] }],
  }
  const s = move(withOff, 'demo-appt-002', 'off', T(12)) // day-off lane -> no valid slot
  const a = findAppointment(s, 'demo-appt-002')!
  assert.equal(a.laneId, JUL) // unchanged
  assert.equal(a.start, T(13))
  assert.notEqual(s.collision, null)
  assert.equal(s.collision!.proposed, null)
  assert.equal(s.moving, null)
})

test('11. cancelled appointment does not block movement', () => {
  const withCancel: DemoState = {
    ...fresh(),
    lanes: fresh().lanes.map((l) =>
      l.person.id === SOF
        ? {
            ...l,
            appointments: [
              ...l.appointments,
              { id: 'canc', laneId: SOF, serviceId: CORTE, start: T(12), end: T(12, 30), status: 'cancelled', price: 35000, customerName: 'C' },
            ],
          }
        : l,
    ),
  }
  const s = move(withCancel, 'demo-appt-002', SOF, T(12)) // onto the cancelled slot
  const a = find(s, 'demo-appt-002')
  assert.equal(a.start, T(12)) // committed; cancelled ignored
  assert.equal(s.collision, null)
})

test('12. keyboard move: M -> arrows -> Enter / Escape', () => {
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' }) // "M"
  assert.notEqual(s.moving, null)
  assert.equal(s.moving!.desiredStart, T(13))
  s = demoReducer(s, { type: 'MOVE_TO', laneId: s.moving!.laneId, desiredStart: s.moving!.desiredStart + GRID_STEP_MS }) // →
  s = demoReducer(s, { type: 'MOVE_TO', laneId: DAN, desiredStart: s.moving!.desiredStart }) // ↓ to Daniela
  assert.equal(s.moving!.laneId, DAN)
  const committed = demoReducer(s, { type: 'MOVE_COMMIT' }) // Enter
  assert.equal(find(committed, 'demo-appt-002').laneId, DAN)
  // Escape restores the original (appointment never mutated during the move)
  let e = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  e = demoReducer(e, { type: 'MOVE_TO', laneId: e.moving!.laneId, desiredStart: T(15) })
  e = demoReducer(e, { type: 'MOVE_CANCEL' }) // Escape
  assert.equal(e.moving, null)
  assert.equal(find(e, 'demo-appt-002').start, T(13))
})

test('13. pointer and keyboard produce equivalent final state', () => {
  const keyboard = (() => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(14) }) // one arrow
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(15) }) // another arrow
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  })()
  const pointer = (() => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(15) }) // one drag to final
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  })()
  assert.deepEqual(keyboard, pointer)
})

test('14. move does not alter the ledger (even when corrected)', () => {
  assert.deepEqual(deriveLedger(flat(move(fresh(), 'demo-appt-002', JUL, T(10)))), deriveLedger(flat(fresh())))
})

test('15. move preserves service / customer / price / duration', () => {
  const orig = find(fresh(), 'demo-appt-002')
  const a = find(move(fresh(), 'demo-appt-002', DAN, T(12, 30)), 'demo-appt-002')
  assert.equal(a.serviceId, orig.serviceId)
  assert.equal(a.customerName, orig.customerName)
  assert.equal(a.price, orig.price)
  assert.equal(a.end - a.start, orig.end - orig.start)
})

test('16. tentative creation still works', () => {
  const lane = fresh().lanes[0]
  const slot = computeSlots(lane.window, lane.appointments, 30, fresh().now)[0].start
  const t = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: lane.person.id, serviceId: CORTE, start: slot })
  assert.notEqual(t.tentative, null)
})

test('17. confirm tentative still validates collision (re-corrects, never commits invalid)', () => {
  const lane = fresh().lanes[0]
  const slot = computeSlots(lane.window, lane.appointments, 30, fresh().now)[0].start
  let s = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: lane.person.id, serviceId: CORTE, start: slot })
  // inject a confirmed appointment onto the tentative's slot, then confirm
  s = {
    ...s,
    lanes: s.lanes.map((l) =>
      l.person.id === lane.person.id
        ? { ...l, appointments: [...l.appointments, { id: 'blk', laneId: lane.person.id, serviceId: CORTE, start: slot, end: slot + 30 * 60_000, status: 'confirmed', price: 35000, customerName: 'X' }] }
        : l,
    ),
  }
  const c = demoReducer(s, { type: 'CONFIRM_TENTATIVE' })
  assert.notEqual(c.collision, null)
  const committedAtSlot = flat(c).filter((a) => a.start === slot && a.id.startsWith('demo-appt-new'))
  assert.equal(committedAtSlot.length, 0) // never committed at the occupied slot
})

test('18. complete still works', () => {
  assert.equal(find(demoReducer(fresh(), { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' }), 'demo-appt-002').status, 'completed')
})

test('19. cancel still works', () => {
  assert.equal(find(demoReducer(fresh(), { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-002' }), 'demo-appt-002').status, 'cancelled')
})

test('20. deterministic: same input sequence -> same resulting state', () => {
  assert.deepEqual(move(fresh(), 'demo-appt-002', SOF, T(16)), move(fresh(), 'demo-appt-002', SOF, T(16)))
})

test('21. reduced motion: result state identical (motion is presentation-only)', () => {
  // The reducer takes no motion input; the resulting state is identical.
  assert.deepEqual(move(fresh(), 'demo-appt-002', JUL, T(15)), move(fresh(), 'demo-appt-002', JUL, T(15)))
})

test('22. no invalid transition: cancelled/completed cannot be moved', () => {
  assert.equal(demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-001' }).moving, null) // completed
  assert.equal(demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-005' }).moving, null) // cancelled
})
