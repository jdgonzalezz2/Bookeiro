/**
 * Step 9 — pure accessibility helpers. No React, no DOM: accessible-name and
 * live-region announcement are derived from state, so the reducer stays
 * string-free and both are unit-testable in node.
 */
import { deriveLedger, formatCop } from '../../../lib/rail-core'
import type { DemoAppointment } from '../../../lib/rail-core/demo'
import type { DemoState } from './reducer'
import { bogotaHM } from './geometry'

/** Accessible name: service, customer, time range, COP price, status. */
export function appointmentLabel(a: DemoAppointment, serviceName: string, stateLabel: string): string {
  return `${serviceName}, ${a.customerName}, ${bogotaHM(a.start)} a ${bogotaHM(a.end)}, ${formatCop(a.price)}, ${stateLabel}.`
}

const flat = (s: DemoState) => s.lanes.flatMap((l) => l.appointments)

/**
 * Polite announcement for a state transition: successful movement, Calm
 * Correction, completion, cancellation, confirmation — with the resulting
 * ledger where relevant. Pure over (prev, next); returns null when nothing
 * announceable changed (so unrelated renders stay silent).
 */
export function announcementFor(prev: DemoState, next: DemoState): string | null {
  // A collision was just raised (creation or move correction / no-space).
  if (next.collision && next.collision !== prev.collision) {
    return next.collision.proposed
      ? `Horario ocupado; movida a las ${bogotaHM(next.collision.proposed.start)}.`
      : 'Sin espacio hoy en esa agenda.'
  }
  const before = new Map(flat(prev).map((a) => [a.id, a]))
  const led = deriveLedger(flat(next))
  for (const a of flat(next)) {
    const b = before.get(a.id)
    if (!b) {
      if (a.status === 'confirmed') return `Cita confirmada a las ${bogotaHM(a.start)}. Total ${formatCop(led.total)}.`
      continue
    }
    if (b.status !== a.status) {
      if (a.status === 'completed') return `Cita completada. Completado ${formatCop(led.completedTotal)}.`
      if (a.status === 'cancelled') return `Cita cancelada. Total ${formatCop(led.total)}.`
    }
    if (!next.collision && (b.start !== a.start || b.laneId !== a.laneId)) {
      return `Cita movida a las ${bogotaHM(a.start)}.`
    }
  }
  return null
}
