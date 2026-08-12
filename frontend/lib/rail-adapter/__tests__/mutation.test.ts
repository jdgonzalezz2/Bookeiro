/**
 * Tests for the pure mutation layer: error mapping, authoritative reconcile,
 * reducer LOAD_DAY (reconcile + rollback), and ledger deltas — all without a
 * server. deriveLedger stays the sole ledger authority (no arithmetic here).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAuthoritativeAppointment, mapMutationError, type MutationErrorCode } from '../mutation'
import type { BackendAppointment } from '../adapter'
import { deriveLedger } from '../../rail-core'
import type { RailDay } from '../../rail-core'
import { demoReducer, initDemoState } from '../../../app/prototype/time-rail/reducer'

const bg = (h: number, m = 0): number => Date.UTC(2026, 0, 5, h + 5, m, 0, 0)
const iso = (h: number, m = 0): string => new Date(bg(h, m)).toISOString()

function makeDay(): RailDay {
  return {
    source: 'real',
    business: { id: 't', name: 'B', slug: 'b' },
    dateIso: '2026-01-05',
    dayStartMs: Date.UTC(2026, 0, 5, 5, 0, 0, 0),
    now: bg(12),
    window: { startMs: bg(9), endMs: bg(20) },
    services: [{ id: 'svc', name: 'Corte', durationMins: 60, price: 50000 }],
    lanes: [
      {
        person: { id: 's1', name: 'Uno', avatarUrl: null },
        window: { startMs: bg(9), endMs: bg(20) },
        appointments: [{ id: 'A', laneId: 's1', serviceId: 'svc', start: bg(10), end: bg(11), status: 'confirmed', price: 50000, customerName: 'Ana' }],
      },
      {
        person: { id: 's2', name: 'Dos', avatarUrl: null },
        window: { startMs: bg(9), endMs: bg(20) },
        appointments: [{ id: 'B', laneId: 's2', serviceId: 'svc', start: bg(14), end: bg(15), status: 'completed', price: 70000, customerName: 'Beto' }],
      },
    ],
  }
}

const row = (o: { id: string; staff: string; sh: number; eh: number; status: string; price: number; name?: string }): BackendAppointment => ({
  id: o.id,
  staff_id: o.staff,
  service_id: 'svc',
  customer_name: o.name ?? 'X',
  start_time: iso(o.sh),
  end_time: iso(o.eh),
  status: o.status,
  total_price: o.price,
})

const ledgerOf = (day: RailDay) => deriveLedger(day.lanes.flatMap((l) => l.appointments))
const allAppts = (day: RailDay) => day.lanes.flatMap((l) => l.appointments)

// --------------------------------------------------------------------------
// mapMutationError — typed, user-safe, never raw DB text
// --------------------------------------------------------------------------
test('mapMutationError maps every known prefix; unknown/null → server_error', () => {
  const cases: [string, MutationErrorCode][] = [
    ['COLLISION: Ese horario ya fue reservado.', 'collision'],
    ['OUTSIDE_HOURS: fuera de jornada', 'outside_hours'],
    ['NOT_ACTIONABLE: no puedes mover', 'not_actionable'],
    ['NOT_FOUND: no existe', 'not_found'],
    ['UNAUTHORIZED: sin permiso', 'unauthorized'],
    ['INVALID_STAFF: otro negocio', 'invalid_staff'],
    ['INVALID_SERVICE: no activo', 'invalid_service'],
    ['some raw pg error 23505', 'server_error'],
  ]
  for (const [raw, code] of cases) {
    const e = mapMutationError(raw)
    assert.equal(e.ok, false)
    assert.equal(e.code, code)
    assert.ok(e.message.length > 0)
    assert.ok(!/EXCEPTION|pg|23505|null value/i.test(e.message), 'message is user-safe')
  }
  assert.equal(mapMutationError(null).code, 'server_error')
  assert.equal(mapMutationError(undefined).code, 'server_error')
})

// --------------------------------------------------------------------------
// applyAuthoritativeAppointment — reconcile one authoritative row
// --------------------------------------------------------------------------
test('CREATE: authoritative row inserted; ledger total + deposit grow', () => {
  const day = makeDay()
  const next = applyAuthoritativeAppointment(day, row({ id: 'C', staff: 's1', sh: 16, eh: 17, status: 'confirmed', price: 40000 }))
  const s1 = next.lanes.find((l) => l.person.id === 's1')!
  assert.deepEqual(s1.appointments.map((a) => a.id), ['A', 'C']) // sorted by start
  const led = ledgerOf(next)
  assert.equal(led.total, 160000) // 50000 + 70000 + 40000
  assert.equal(led.deposit, 80000)
  assert.equal(led.completedTotal, 70000)
})

test('MOVE same lane: identity preserved (no duplicate), ledger unchanged', () => {
  const day = makeDay()
  const before = ledgerOf(day)
  const next = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's1', sh: 12, eh: 13, status: 'confirmed', price: 50000 }))
  const s1 = next.lanes.find((l) => l.person.id === 's1')!
  assert.equal(s1.appointments.filter((a) => a.id === 'A').length, 1) // NEVER duplicated
  assert.equal(s1.appointments.find((a) => a.id === 'A')!.start, bg(12))
  assert.deepEqual(ledgerOf(next), before) // move never changes the ledger
})

test('MOVE cross lane: removed from old lane, added to new; ledger unchanged', () => {
  const day = makeDay()
  const before = ledgerOf(day)
  const next = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's2', sh: 9, eh: 10, status: 'confirmed', price: 50000 }))
  const s1 = next.lanes.find((l) => l.person.id === 's1')!
  const s2 = next.lanes.find((l) => l.person.id === 's2')!
  assert.ok(!s1.appointments.some((a) => a.id === 'A'))
  assert.deepEqual(s2.appointments.map((a) => a.id), ['A', 'B']) // 09:00 before 14:00
  assert.deepEqual(ledgerOf(next), before)
  assert.equal(allAppts(next).filter((a) => a.id === 'A').length, 1)
})

test('CANCEL: not deleted, status cancelled, billable removed from total', () => {
  const day = makeDay()
  const next = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's1', sh: 10, eh: 11, status: 'cancelled', price: 50000 }))
  const a = allAppts(next).find((x) => x.id === 'A')!
  assert.equal(a.status, 'cancelled') // still present
  const led = ledgerOf(next)
  assert.equal(led.total, 70000) // A no longer billable
  assert.equal(led.completedTotal, 70000)
  assert.equal(led.deposit, 35000)
})

test('COMPLETE: completedTotal grows, total unchanged', () => {
  const day = makeDay()
  const next = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's1', sh: 10, eh: 11, status: 'completed', price: 50000 }))
  const led = ledgerOf(next)
  assert.equal(led.total, 120000) // unchanged (A was already billable)
  assert.equal(led.completedTotal, 120000) // 50000 + 70000
})

test('window expands (snapped) when an authoritative appt falls before it', () => {
  const day = makeDay()
  const next = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's1', sh: 7, eh: 8, status: 'confirmed', price: 50000 }))
  assert.equal(next.window.startMs, bg(7)) // floored to the 07:00 grid
})

// --------------------------------------------------------------------------
// reducer LOAD_DAY — reconcile + rollback
// --------------------------------------------------------------------------
test('LOAD_DAY reconcile preserves selection when the appt still exists', () => {
  const day = makeDay()
  let state = initDemoState(day)
  state = demoReducer(state, { type: 'SELECT', id: 'A' })
  assert.equal(state.selectedId, 'A')
  const moved = applyAuthoritativeAppointment(day, row({ id: 'A', staff: 's1', sh: 12, eh: 13, status: 'confirmed', price: 50000 }))
  state = demoReducer(state, { type: 'LOAD_DAY', day: moved, preserveSelectionId: 'A' })
  assert.equal(state.selectedId, 'A') // preserved
  assert.equal(state.lanes.find((l) => l.person.id === 's1')!.appointments.find((a) => a.id === 'A')!.start, bg(12))
})

test('LOAD_DAY drops selection when the appt is gone', () => {
  const day = makeDay()
  let state = initDemoState(day)
  state = demoReducer(state, { type: 'SELECT', id: 'A' })
  const gone: RailDay = { ...day, lanes: day.lanes.map((l) => (l.person.id === 's1' ? { ...l, appointments: [] } : l)) }
  state = demoReducer(state, { type: 'LOAD_DAY', day: gone, preserveSelectionId: 'A' })
  assert.equal(state.selectedId, null)
})

test('ROLLBACK: LOAD_DAY(original) restores state after an optimistic move', () => {
  const day = makeDay()
  let state = initDemoState(day)
  // optimistic move A to 12:00 via the existing reducer path
  state = demoReducer(state, { type: 'MOVE_START', id: 'A' })
  state = demoReducer(state, { type: 'MOVE_TO', laneId: 's1', desiredStart: bg(12) })
  state = demoReducer(state, { type: 'MOVE_COMMIT' })
  assert.equal(state.lanes.find((l) => l.person.id === 's1')!.appointments.find((a) => a.id === 'A')!.start, bg(12))
  // server rejected → roll back to the authoritative (original) day
  state = demoReducer(state, { type: 'LOAD_DAY', day })
  assert.equal(state.lanes.find((l) => l.person.id === 's1')!.appointments.find((a) => a.id === 'A')!.start, bg(10))
  assert.equal(state.moving, null)
  assert.equal(state.collision, null)
})
