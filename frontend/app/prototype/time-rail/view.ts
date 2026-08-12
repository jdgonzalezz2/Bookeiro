/**
 * Shared presentation helpers used by BOTH the horizontal (desktop/tablet) and
 * vertical (mobile) projections — so neither orientation duplicates them. The
 * domain part (deriveAppointmentState) lives in rail-core; this only labels it.
 */
import { deriveAppointmentState } from '@/lib/rail-core'
import type { DemoAppointment } from '@/lib/rail-core/demo'

export type BlockState = 'confirmed' | 'in-progress' | 'completed' | 'cancelled'

export const STATE_LABEL: Record<BlockState, string> = {
  confirmed: 'Confirmada',
  'in-progress': 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

/** Cancelled is stored; everything else is derived by rail-core. */
export function blockState(a: DemoAppointment, now: number): BlockState {
  if (a.status === 'cancelled') return 'cancelled'
  return deriveAppointmentState(a, now)
}
