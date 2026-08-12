/**
 * DemoDay fixture tests. Same zero-dependency infrastructure as rail-core
 * (`node:test` + `node:assert`). Derived values (overlap, ledger) come from
 * rail-core — the fixture provides DATA, rail-core provides RULES.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { overlaps, deriveLedger, minutesToMs } from '../index'
import type { Appointment } from '../index'
import {
  createDemoDay,
  withDayOff,
  DEMO_NOW,
  DEMO_DATE_ISO,
  type DemoAppointment,
} from '../demo'

const EXPECTED_NAMES = ['Julián', 'Daniela', 'Sofía']
const allAppts = (): DemoAppointment[] => createDemoDay().lanes.flatMap((l) => l.appointments)

test('1. exactly 3 lanes exist', () => {
  assert.equal(createDemoDay().lanes.length, 3)
})

test('2. staff names are Julián, Daniela, Sofía (in order)', () => {
  assert.deepEqual(createDemoDay().lanes.map((l) => l.person.name), EXPECTED_NAMES)
})

test('3. every lane has valid working hours', () => {
  for (const lane of createDemoDay().lanes) {
    assert.notEqual(lane.window, null)
    assert.ok(lane.window!.startMs < lane.window!.endMs)
  }
})

test('4. every seeded appointment belongs to one of those lanes', () => {
  const day = createDemoDay()
  const laneIds = new Set(day.lanes.map((l) => l.person.id))
  for (const a of allAppts()) assert.ok(laneIds.has(a.laneId), `unknown laneId ${a.laneId}`)
})

test('5. every appointment references one of the defined services', () => {
  const serviceIds = new Set(createDemoDay().services.map((s) => s.id))
  for (const a of allAppts()) assert.ok(serviceIds.has(a.serviceId), `unknown serviceId ${a.serviceId}`)
})

test('6. every appointment has a valid duration matching its service', () => {
  const day = createDemoDay()
  const byId = new Map(day.services.map((s) => [s.id, s]))
  for (const a of allAppts()) {
    const svc = byId.get(a.serviceId)!
    assert.ok(a.end > a.start)
    assert.equal(a.end - a.start, minutesToMs(svc.durationMins))
  }
})

test('7. no initial non-cancelled appointments overlap on the same lane', () => {
  for (const lane of createDemoDay().lanes) {
    const active = lane.appointments.filter((a) => a.status !== 'cancelled')
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        assert.equal(overlaps(active[i], active[j]), false, `overlap in lane ${lane.person.id}`)
      }
    }
  }
})

test('8. all appointments fit within working hours', () => {
  for (const lane of createDemoDay().lanes) {
    const w = lane.window!
    for (const a of lane.appointments) {
      assert.ok(a.start >= w.startMs, `appt ${a.id} starts before open`)
      assert.ok(a.end <= w.endMs, `appt ${a.id} ends after close`)
    }
  }
})

test('9. fixed `now` is deterministic', () => {
  assert.equal(createDemoDay().now, DEMO_NOW)
  assert.equal(createDemoDay().now, createDemoDay().now)
  // documents the fixture instant: 12:00 Bogotá on the fixture date
  assert.equal(new Date(DEMO_NOW).toISOString(), '2026-01-05T17:00:00.000Z')
  assert.equal(createDemoDay().dateIso, DEMO_DATE_ISO)
})

test('10. constructing DemoDay twice produces equivalent data', () => {
  assert.deepEqual(createDemoDay(), createDemoDay())
})

test('11. ledger derived from DemoDay is deterministic and correct', () => {
  const led1 = deriveLedger(allAppts())
  const led2 = deriveLedger(allAppts())
  assert.deepEqual(led1, led2)
  // billable = all except the one cancelled Corte ($35.000):
  //   45000 + 35000 + 25000 + 120000 + 45000 = 270000
  // completed = Corte+barba 45000 + Diseño 25000 = 70000
  assert.equal(led1.total, 270000)
  assert.equal(led1.completedTotal, 70000)
  assert.equal(led1.deposit, 135000)
})

test('12. no appointment contains commission/share/paid fields', () => {
  for (const a of allAppts()) {
    for (const banned of ['commissionPct', 'staffShare', 'houseShare', 'paid', 'deposit']) {
      assert.equal(banned in a, false, `appt ${a.id} must not have ${banned}`)
    }
  }
})

test('13. the fixture exercises 30/60/90-minute durations', () => {
  const day = createDemoDay()
  const durations = new Set(day.services.map((s) => s.durationMins))
  for (const d of [30, 60, 90]) assert.ok(durations.has(d), `missing ${d}-min duration`)
})

test('14. all money values are numeric COP values', () => {
  for (const s of createDemoDay().services) {
    assert.equal(typeof s.price, 'number')
    assert.ok(Number.isInteger(s.price) && s.price > 0)
  }
  for (const a of allAppts()) {
    assert.equal(typeof a.price, 'number')
    assert.ok(Number.isInteger(a.price) && a.price > 0)
  }
})

test('15. withDayOff exercises the "no trabaja" concept (no 4th staff)', () => {
  const off = withDayOff(createDemoDay().lanes[0])
  assert.equal(off.window, null)
  assert.deepEqual(off.appointments, [])
  // DemoAppointment is structurally a rail-core Appointment (assignability check)
  const asCore: Appointment[] = allAppts()
  assert.equal(asCore.length, 6)
})
