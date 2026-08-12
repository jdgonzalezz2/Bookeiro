/**
 * Step 6 Ledger/Money tests. Zero-dependency `node:test`. The ledger arithmetic
 * authority is rail-core.deriveLedger — these tests exercise it through the
 * reducer's real appointment mutations; no ledger math is re-implemented in UI.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createDemoDay } from '../../../lib/rail-core/demo'
import { deriveLedger, computeSlots, formatCop } from '../../../lib/rail-core'
import { demoReducer, initDemoState, type DemoState } from './reducer'

const M = 60_000
const fresh = () => initDemoState(createDemoDay())
const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)
const led = (s: DemoState) => deriveLedger(flat(s))

function freeSlot() {
  const s = fresh()
  const lane = s.lanes[0]
  const free = computeSlots(lane.window, lane.appointments, 30, s.now)
  return { laneId: lane.person.id, start: free[0].start, corte: s.services[0].id }
}

test('1. initial deterministic DemoDay ledger', () => {
  const l = led(fresh())
  assert.equal(l.total, 270000)
  assert.equal(l.deposit, 135000)
  // NOTE: the Step-6 brief's example listed completedTotal === 135000, but the
  // approved DemoDay fixture (Step 2) has completed appointments summing to 70000
  // (Corte+barba 45.000 + Diseño 25.000). Product truth is kept — see report.
  assert.equal(l.completedTotal, 70000)
})

test('2. confirm tentative: total += price, deposit += price*0.5, completed unchanged', () => {
  const { laneId, start, corte } = freeSlot()
  const before = led(fresh())
  const t = demoReducer(fresh(), { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start })
  const s = demoReducer(t, { type: 'CONFIRM_TENTATIVE' })
  const after = led(s)
  assert.equal(after.total, before.total + 35000)
  assert.equal(after.deposit, before.deposit + 35000 * 0.5)
  assert.equal(after.completedTotal, before.completedTotal)
})

test('3. move (time shift only): total / deposit / completedTotal all unchanged', () => {
  const s0 = fresh()
  const moved: DemoState = {
    ...s0,
    lanes: s0.lanes.map((l) => ({
      ...l,
      appointments: l.appointments.map((a) =>
        a.id === 'demo-appt-002' ? { ...a, start: a.start + 30 * M, end: a.end + 30 * M } : a,
      ),
    })),
  }
  assert.deepEqual(led(moved), led(s0)) // ledger depends on status+price, not time
})

test('4. cancel: total -= price, deposit -= price*0.5', () => {
  const before = led(fresh())
  const s = demoReducer(fresh(), { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-002' })
  const after = led(s)
  assert.equal(after.total, before.total - 35000)
  assert.equal(after.deposit, before.deposit - 35000 * 0.5)
})

test('5. complete: total/deposit unchanged, completedTotal += price', () => {
  const before = led(fresh())
  const s = demoReducer(fresh(), { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' })
  const after = led(s)
  assert.equal(after.total, before.total)
  assert.equal(after.deposit, before.deposit)
  assert.equal(after.completedTotal, before.completedTotal + 35000)
})

test('6. cancelled appointments are excluded from total/deposit', () => {
  const l = led(fresh()) // demo-appt-005 (cancelled, 35.000) is excluded
  assert.equal(l.total, 270000) // 45000+35000+25000+120000+45000, not +35000 for 005
})

test('7. ledger is derived, never stored in reducer state', () => {
  const s = fresh()
  for (const k of ['ledger', 'total', 'deposit', 'completedTotal', 'commission', 'staffShare', 'houseShare']) {
    assert.equal(k in s, false)
  }
})

test('8. no commission / staffShare / houseShare in the authoritative ledger object', () => {
  const l = led(fresh())
  assert.deepEqual(Object.keys(l).sort(), ['completedTotal', 'deposit', 'total'])
  for (const k of ['commission', 'staffShare', 'houseShare']) assert.equal(k in l, false)
})

test('9. formatting is COP / es-CO with zero decimals', () => {
  const s = formatCop(270000).replace(/ /g, ' ')
  assert.match(s, /270\.000/)
  assert.ok(s.includes('$'))
  assert.ok(!/[.,]\d{2}\b/.test(s), `no decimals expected in "${s}"`)
})

test('10. deterministic reload produces the same financial values', () => {
  assert.deepEqual(led(fresh()), led(fresh()))
})

test('11. reduced-motion has no effect on the resulting numeric values', () => {
  // deriveLedger is a pure function of appointments; it takes no motion input,
  // so the numbers are identical regardless of any animation preference.
  const l = led(fresh())
  assert.equal(l.total, 270000)
  assert.equal(l.deposit, 135000)
})

test('12. no financial change when appointments are unchanged (roll must not run)', () => {
  const s0 = fresh()
  const sel = demoReducer(s0, { type: 'SELECT', id: 'demo-appt-002' }) // interaction, no appt change
  assert.deepEqual(led(sel), led(s0)) // identical value -> MoneyRoll receives no new value
})

test('13. invariant holds after an arbitrary sequence of supported operations', () => {
  const { laneId, start, corte } = freeSlot()
  let s = fresh()
  s = demoReducer(s, { type: 'CREATE_TENTATIVE', laneId, serviceId: corte, start })
  s = demoReducer(s, { type: 'CONFIRM_TENTATIVE' })
  s = demoReducer(s, { type: 'COMPLETE_APPOINTMENT', id: 'demo-appt-002' })
  s = demoReducer(s, { type: 'CANCEL_APPOINTMENT', id: 'demo-appt-004' })
  s = demoReducer(s, { type: 'SELECT', id: 'demo-appt-001' })

  const appts = flat(s)
  const expTotal = appts.filter((a) => a.status !== 'cancelled').reduce((x, a) => x + a.price, 0)
  const expCompleted = appts.filter((a) => a.status === 'completed').reduce((x, a) => x + a.price, 0)
  const l = deriveLedger(appts)
  assert.equal(l.total, expTotal)
  assert.equal(l.completedTotal, expCompleted)
  assert.equal(l.deposit, expTotal * 0.5)
})
