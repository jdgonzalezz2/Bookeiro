/**
 * rail-adapter tests (node:test). Compiled with the rail-core sources via the
 * same scratch `tsc` + `node --test` flow as the prototype tests.
 *
 * These assert the adapter's TWO jobs — correct SHAPE and correct TIMEZONE — and,
 * crucially, that adapted REAL data flows through rail-core's rules unchanged
 * (deriveLedger / isFree / computeSlots), proving no logic is duplicated here.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  toRailDay,
  type BackendStaff,
  type BackendService,
  type BackendAppointment,
  type BackendWorkingHours,
  type ToRailDayInput,
} from '../adapter'
import { deriveLedger, isFree, computeSlots } from '../../rail-core'

const DATE = '2026-01-05' // Monday (dow = 1), same day the DemoDay fixture uses
/** Bogotá wall-clock (that date) → UTC epoch ms (fixed -5, no DST). */
const bg = (h: number, m = 0): number => Date.UTC(2026, 0, 5, h - -5, m, 0, 0)
/** Bogotá wall-clock → ISO timestamptz string (round-trips via Date.parse). */
const iso = (h: number, m = 0): string => new Date(bg(h, m)).toISOString()

const BUSINESS = { id: 't1', name: 'La Cima Barbería', slug: 'la-cima' }
const NOW = bg(8, 0) // 08:00 → all working-day slots are in the future

function base(overrides: Partial<ToRailDayInput> = {}): ToRailDayInput {
  return {
    business: BUSINESS,
    dateIso: DATE,
    nowMs: NOW,
    staff: [],
    services: [],
    appointments: [],
    workingHours: [],
    ...overrides,
  }
}

const STAFF: BackendStaff[] = [
  { id: 's-jul', name: 'Julián', avatar_url: null, is_active: true },
  { id: 's-dan', name: 'Daniela', avatar_url: null, is_active: true },
]
const SERVICES: BackendService[] = [
  { id: 'svc-corte', name: 'Corte', duration_mins: 30, base_price: 35000 },
  { id: 'svc-color', name: 'Color', duration_mins: 90, base_price: '120000' }, // NUMERIC as string
]
const HOURS: BackendWorkingHours[] = [
  { staff_id: 's-jul', day_of_week: 1, start_time: '09:00:00', end_time: '20:00:00', is_active: true },
  { staff_id: 's-dan', day_of_week: 1, start_time: '09:00:00', end_time: '20:00:00', is_active: true },
  // A Sunday row that must be IGNORED for a Monday target:
  { staff_id: 's-jul', day_of_week: 0, start_time: '06:00:00', end_time: '08:00:00', is_active: true },
]

test('1. source is tagged real (never demo)', () => {
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS }))
  assert.equal(day.source, 'real')
  assert.equal(day.business.name, 'La Cima Barbería')
  assert.equal(day.dateIso, DATE)
  assert.equal(day.now, NOW)
})

test('2. staff → lanes, services mapped, NUMERIC string coerced', () => {
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS }))
  assert.equal(day.lanes.length, 2)
  assert.deepEqual(day.lanes.map((l) => l.person.name), ['Julián', 'Daniela'])
  const color = day.services.find((s) => s.id === 'svc-color')!
  assert.equal(color.price, 120000) // '120000' → 120000
  assert.equal(color.durationMins, 90)
})

test('3. working_hours resolved at fixed Bogotá offset for the right day-of-week', () => {
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS }))
  const jul = day.lanes.find((l) => l.person.id === 's-jul')!
  assert.ok(jul.window, 'Julián works Monday')
  assert.equal(jul.window!.startMs, bg(9, 0)) // 09:00 Bogotá, NOT the Sunday 06:00 row
  assert.equal(jul.window!.endMs, bg(20, 0))
})

test('4. appointment mapped: ISO→ms, status, price, customerName, laneId', () => {
  const appts: BackendAppointment[] = [
    { id: 'a1', staff_id: 's-jul', service_id: 'svc-corte', customer_name: 'Andrés', start_time: iso(10), end_time: iso(10, 30), status: 'completed', total_price: '35000' },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  const a = day.lanes.find((l) => l.person.id === 's-jul')!.appointments[0]
  assert.equal(a.start, bg(10, 0))
  assert.equal(a.end, bg(10, 30))
  assert.equal(a.status, 'completed')
  assert.equal(a.price, 35000)
  assert.equal(a.customerName, 'Andrés')
  assert.equal(a.laneId, 's-jul')
})

test('5. malformed appointments are DROPPED, not guessed', () => {
  const appts: BackendAppointment[] = [
    { id: 'ok', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(10), end_time: iso(10, 30), status: 'confirmed', total_price: 35000 },
    { id: 'no-staff', staff_id: null, service_id: 'svc-corte', start_time: iso(11), end_time: iso(11, 30), status: 'confirmed', total_price: 35000 },
    { id: 'bad-time', staff_id: 's-jul', service_id: 'svc-corte', start_time: 'not-a-date', end_time: iso(12), status: 'confirmed', total_price: 35000 },
    { id: 'inverted', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(13), end_time: iso(12), status: 'confirmed', total_price: 35000 },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  const all = day.lanes.flatMap((l) => l.appointments)
  assert.deepEqual(all.map((a) => a.id), ['ok'])
})

test('6. an appointment on an unknown staff still gets a lane (never orphaned)', () => {
  const appts: BackendAppointment[] = [
    { id: 'ghost', staff_id: 's-ghost', service_id: 'svc-corte', start_time: iso(10), end_time: iso(10, 30), status: 'confirmed', total_price: 35000 },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  const ghost = day.lanes.find((l) => l.person.id === 's-ghost')
  assert.ok(ghost, 'a lane exists for the referenced-but-unknown staff')
  assert.equal(ghost!.appointments.length, 1)
  assert.equal(ghost!.window, null) // unknown staff has no resolved working window
})

test('7. inactive staff excluded unless they have appointments', () => {
  const staff: BackendStaff[] = [...STAFF, { id: 's-off', name: 'Retirado', is_active: false }]
  const day = toRailDay(base({ staff, services: SERVICES, workingHours: HOURS }))
  assert.ok(!day.lanes.some((l) => l.person.id === 's-off'))
})

test('8. axis window spans appointments beyond hours, snapped to the 30-min grid', () => {
  const appts: BackendAppointment[] = [
    // Starts 08:10 (before the 09:00 open) and off-grid → floors to 08:00.
    { id: 'early', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(8, 10), end_time: iso(8, 40), status: 'confirmed', total_price: 35000 },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  assert.equal(day.window.startMs, bg(8, 0)) // floored from 08:10
  assert.equal(day.window.endMs, bg(20, 0)) // hours close
})

test('9. empty inputs → no lanes + default 09:00–20:00 axis window', () => {
  const day = toRailDay(base())
  assert.equal(day.lanes.length, 0)
  assert.equal(day.window.startMs, bg(9, 0))
  assert.equal(day.window.endMs, bg(20, 0))
  assert.equal(day.dayStartMs, Date.UTC(2026, 0, 5, 5, 0, 0, 0)) // Bogotá midnight (00:00 -5 → 05:00 UTC)
})

test('10. deterministic — identical inputs give a structurally equal RailDay', () => {
  const input = base({ staff: STAFF, services: SERVICES, workingHours: HOURS })
  assert.deepEqual(toRailDay(input), toRailDay(input))
})

test('11. adapted REAL data feeds rail-core.deriveLedger (no manual arithmetic)', () => {
  const appts: BackendAppointment[] = [
    { id: 'done', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(10), end_time: iso(10, 30), status: 'completed', total_price: 70000 },
    { id: 'conf', staff_id: 's-dan', service_id: 'svc-color', start_time: iso(11), end_time: iso(12, 30), status: 'confirmed', total_price: 45000 },
    { id: 'cxl', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(14), end_time: iso(14, 30), status: 'cancelled', total_price: 999999 },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  const ledger = deriveLedger(day.lanes.flatMap((l) => l.appointments))
  assert.equal(ledger.total, 115000) // 70000 + 45000; cancelled ignored by rail-core
  assert.equal(ledger.completedTotal, 70000)
  assert.equal(ledger.deposit, 57500) // total * 0.5, derived by rail-core
})

test('12. adapted lane feeds rail-core.isFree / computeSlots', () => {
  const appts: BackendAppointment[] = [
    { id: 'a', staff_id: 's-jul', service_id: 'svc-corte', start_time: iso(9), end_time: iso(9, 30), status: 'confirmed', total_price: 35000 },
  ]
  const day = toRailDay(base({ staff: STAFF, services: SERVICES, workingHours: HOURS, appointments: appts }))
  const jul = day.lanes.find((l) => l.person.id === 's-jul')!
  // The 09:00 slot is taken; 09:30 is free — rail-core is the authority.
  assert.equal(isFree(jul.appointments, { start: bg(9), end: bg(9, 30) }), false)
  assert.equal(isFree(jul.appointments, { start: bg(9, 30), end: bg(10) }), true)
  const slots = computeSlots(jul.window!, jul.appointments, 30, NOW)
  assert.ok(!slots.some((s) => s.start === bg(9))) // occupied slot excluded
  assert.ok(slots.some((s) => s.start === bg(9, 30))) // free slot present
})
