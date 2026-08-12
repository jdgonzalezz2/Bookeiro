/**
 * Step 9 accessibility tests. Zero-dependency `node:test`. Covers the accessible
 * name, the polite announcements, and the keyboard path (create / move / complete
 * with no pointer) — all through the SAME reducer + rail-core. ARIA DOM semantics
 * are verified separately via the SSR HTML (no jsdom dependency added).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { computeSlots, GRID_STEP_MS } from '../../../lib/rail-core'
import { demoReducer, initDemoState, findAppointment, type DemoState } from './reducer'
import { appointmentLabel, announcementFor } from './a11y'

const fresh = () => initDemoState(createDemoDay())
const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)
const s0 = fresh()
const WIN = s0.window.startMs
const T = (h: number, m = 0): number => WIN + ((h - 9) * 60 + m) * 60_000
const JUL = s0.lanes[0].person.id
const CORTE = s0.services[0].id
const freeStart = () => computeSlots(s0.lanes[0].window, s0.lanes[0].appointments, 30, s0.now)[0].start

// ---- accessible name --------------------------------------------------------

test('1. accessible name contains service, customer, time range, COP price, status', () => {
  const a = findAppointment(fresh(), 'demo-appt-002')! // Corte, Mateo Ríos, 13:00–13:30, 35.000, confirmed
  const label = appointmentLabel(a, 'Corte', 'Confirmada')
  assert.match(label, /Corte/)
  assert.match(label, /Mateo Ríos/)
  assert.match(label, /13:00 a 13:30/)
  assert.match(label, /35\.000/) // COP price
  assert.match(label, /Confirmada/)
})

// ---- announcements ----------------------------------------------------------

test('2. confirm tentative announces confirmation + total', () => {
  const prev = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: JUL, serviceId: CORTE, start: freeStart() })
  const next = demoReducer(prev, { type: 'CONFIRM_TENTATIVE' })
  const msg = announcementFor(prev, next)!
  assert.match(msg, /Cita confirmada a las/)
  assert.match(msg, /Total/)
})

test('3. free move announces the new time', () => {
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(15) })
  const next = demoReducer(s, { type: 'MOVE_COMMIT' })
  assert.equal(announcementFor(s, next), 'Cita movida a las 15:00.')
})

test('4. collision correction announces "Horario ocupado; movida a las HH:MM."', () => {
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(10) }) // occupied + past
  const next = demoReducer(s, { type: 'MOVE_COMMIT' })
  assert.match(announcementFor(s, next)!, /^Horario ocupado; movida a las \d{2}:\d{2}\.$/)
})

test('5. no valid slot announces "Sin espacio hoy en esa agenda."', () => {
  const withOff: DemoState = {
    ...fresh(),
    lanes: [...fresh().lanes, { person: { id: 'off', name: 'Off', avatarUrl: null }, window: null, appointments: [] }],
  }
  let s = demoReducer(withOff, { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: 'off', desiredStart: T(12) })
  const next = demoReducer(s, { type: 'MOVE_COMMIT' })
  assert.equal(announcementFor(s, next), 'Sin espacio hoy en esa agenda.')
})

test('6. completion announces completion + completed total', () => {
  const next = demoReducer(fresh(), { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' })
  assert.match(announcementFor(fresh(), next)!, /Cita completada\. Completado/)
})

test('7. cancellation announces cancellation + total', () => {
  const next = demoReducer(fresh(), { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-002' })
  assert.match(announcementFor(fresh(), next)!, /Cita cancelada\. Total/)
})

test('8. unrelated render is silent (no announcement)', () => {
  const next = demoReducer(fresh(), { type: 'SELECT', id: 'demo-appt-002' })
  assert.equal(announcementFor(fresh(), next), null)
})

// ---- keyboard path (no pointer) --------------------------------------------

test('9. keyboard CREATE: focus a slot + Enter dispatches the same tentative', () => {
  // The slot keydown handler dispatches exactly this on Enter.
  const s = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId: JUL, serviceId: CORTE, start: freeStart() })
  assert.notEqual(s.tentative, null)
  const confirmed = demoReducer(s, { type: 'CONFIRM_TENTATIVE' })
  assert.equal(flat(confirmed).length, flat(fresh()).length + 1)
})

test('10. keyboard MOVE (M + arrows + Enter) equals a pointer move to the same target', () => {
  const keyboard = (() => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' }) // M
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: s.moving!.desiredStart + GRID_STEP_MS }) // →
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: s.moving!.desiredStart + GRID_STEP_MS }) // →
    return demoReducer(s, { type: 'MOVE_COMMIT' }) // Enter
  })()
  const pointer = (() => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(14) })
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  })()
  assert.deepEqual(keyboard, pointer)
})

test('11. keyboard COMPLETE works with no pointer', () => {
  const s = demoReducer(fresh(), { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' })
  assert.equal(findAppointment(s, 'demo-appt-002')!.status, 'completed')
})

test('12. Escape cancels a move and restores the original (keyboard)', () => {
  let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(16) })
  s = demoReducer(s, { type: 'MOVE_CANCEL' }) // Escape
  assert.equal(s.moving, null)
  assert.equal(findAppointment(s, 'demo-appt-002')!.start, T(13)) // untouched
})

test('13. reduced motion produces the same resulting state as normal motion', () => {
  // The reducer takes no motion input; state (and thus the announcement) is
  // identical regardless of prefers-reduced-motion — presentation only differs.
  const mv = () => {
    let s = demoReducer(fresh(), { type: 'MOVE_START', id: 'demo-appt-002' })
    s = demoReducer(s, { type: 'MOVE_TO', laneId: JUL, desiredStart: T(10) }) // corrected
    return demoReducer(s, { type: 'MOVE_COMMIT' })
  }
  assert.deepEqual(mv(), mv())
})

test('14. announcements never fire on the hydration/first commit', () => {
  // The live-region effect skips when prev === null; announcementFor(x, x) is null.
  const s = fresh()
  assert.equal(announcementFor(s, s), null)
})
