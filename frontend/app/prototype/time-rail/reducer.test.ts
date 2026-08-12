/**
 * Step 4 reducer tests — pure state machine. Zero-dependency `node:test`.
 * Reuses rail-core (deriveLedger / computeSlots / deriveAppointmentState) and
 * the DemoDay fixture rather than duplicating rules. Relative imports so this
 * compiles and runs under plain tsc/node.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { computeSlots, deriveLedger, deriveAppointmentState } from '../../../lib/rail-core'
import { demoReducer, initDemoState, findAppointment } from './reducer'

const flat = (s: ReturnType<typeof initDemoState>) => s.lanes.flatMap((l) => l.appointments)
const fresh = () => initDemoState(createDemoDay())

// A guaranteed-free 30-min slot on Julián's lane (from rail-core, not hand-picked).
function firstFreeSlot() {
  const s = fresh()
  const lane = s.lanes[0]
  const free = computeSlots(lane.window, lane.appointments, 30, s.now)
  return { laneId: lane.person.id, start: free[0].start, corte: s.services[0].id }
}

test('1. deterministic initial state', () => {
  assert.deepEqual(initDemoState(createDemoDay()), initDemoState(createDemoDay()))
  const s = fresh()
  assert.equal(s.lanes.length, 3)
  assert.equal(flat(s).length, 6)
  assert.equal(s.selectedId, null)
  assert.equal(s.tentative, null)
  assert.equal(s.collision, null)
  assert.equal(s.seq, 0)
})

test('2. create tentative (client-only, nothing persisted)', () => {
  const { laneId, start, corte } = firstFreeSlot()
  const s = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start })
  assert.notEqual(s.tentative, null)
  assert.equal(s.tentative!.start, start)
  assert.equal(s.tentative!.end, start + 30 * 60000) // Corte = 30 min
  assert.equal(s.tentative!.price, 35000)
  assert.equal(flat(s).length, 6) // lanes untouched
})

test('3. cancel tentative', () => {
  const { laneId, start, corte } = firstFreeSlot()
  const t = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start })
  const s = demoReducer(t, { type: 'CANCEL_TENTATIVE' })
  assert.equal(s.tentative, null)
  assert.equal(flat(s).length, 6)
})

test('4. confirm tentative -> a new confirmed appointment; ledger reflects it', () => {
  const { laneId, start, corte } = firstFreeSlot()
  const t = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start })
  const s = demoReducer(t, { type: 'CONFIRM_TENTATIVE' })
  assert.equal(s.tentative, null)
  assert.equal(flat(s).length, 7)
  assert.equal(s.seq, 1)
  const added = flat(s).find((a) => a.id === 'demo-appt-new-1')!
  assert.equal(added.status, 'confirmed')
  assert.equal(deriveLedger(flat(s)).total, 270000 + 35000)
})

test('5. confirmed -> completed', () => {
  const s = demoReducer(fresh(), { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' })
  assert.equal(findAppointment(s, 'demo-appt-002')!.status, 'completed')
  assert.equal(deriveLedger(flat(s)).completedTotal, 70000 + 35000)
})

test('6. confirmed -> cancelled (drops out of billable)', () => {
  const s = demoReducer(fresh(), { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-002' })
  assert.equal(findAppointment(s, 'demo-appt-002')!.status, 'cancelled')
  assert.equal(deriveLedger(flat(s)).total, 270000 - 35000)
})

test('7. completed cannot return to confirmed (terminal; complete/cancel are no-ops)', () => {
  const base = fresh() // demo-appt-001 is completed
  const c = demoReducer(base, { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-001' })
  assert.equal(c, base) // no-op: same reference
  const x = demoReducer(base, { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-001' })
  assert.equal(x, base) // completed does NOT become cancelled
  assert.equal(findAppointment(base, 'demo-appt-001')!.status, 'completed')
})

test('8. cancelled cannot transition', () => {
  const base = fresh() // demo-appt-005 is cancelled
  assert.equal(demoReducer(base, { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-005' }), base)
  assert.equal(demoReducer(base, { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-005' }), base)
})

test('9. available -> confirmed is impossible without a tentative', () => {
  const base = fresh()
  const s = demoReducer(base, { type: 'CONFIRM_TENTATIVE' })
  assert.equal(s, base) // no tentative -> no-op
  assert.equal(flat(s).length, 6) // no confirmed appointment materialised
})

test('10. ledger is DERIVED, never stored in state', () => {
  const s = fresh()
  assert.equal('ledger' in s, false)
  assert.equal('total' in s, false)
  assert.equal('deposit' in s, false)
  assert.equal(deriveLedger(flat(s)).total, 270000) // derivable on demand
})

test('11. in-progress is DERIVED, never stored on appointments/state', () => {
  const s = fresh()
  assert.equal('inProgress' in s, false)
  for (const a of flat(s)) assert.equal('railState' in a, false)
  const appt = findAppointment(s, 'demo-appt-002')!
  assert.equal(typeof deriveAppointmentState(appt, s.now), 'string')
})

test('12. select / clear transient interaction', () => {
  const base = fresh()
  const sel = demoReducer(base, { type: 'SELECT', id: 'demo-appt-002' })
  assert.equal(sel.selectedId, 'demo-appt-002')
  assert.equal(demoReducer(base, { type: 'SELECT', id: 'nope' }), base) // unknown id -> no-op (same ref)
  const cleared = demoReducer(sel, { type: 'CLEAR' })
  assert.equal(cleared.selectedId, null)
  assert.equal(cleared.tentative, null)
  assert.equal(cleared.collision, null)
})

test('13. deterministic: identical action sequences produce identical state', () => {
  const { laneId, start, corte } = firstFreeSlot()
  const run = (s: ReturnType<typeof initDemoState>) =>
    demoReducer(
      demoReducer(
        demoReducer(s, { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start }),
        { type: 'CONFIRM_TENTATIVE' },
      ),
      { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' },
    )
  assert.deepEqual(run(fresh()), run(fresh()))
})
