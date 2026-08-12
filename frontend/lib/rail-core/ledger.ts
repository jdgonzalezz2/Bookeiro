/**
 * rail-core / ledger — the money summary, derived ENTIRELY from appointments.
 * No decorative counters, no hard-coded totals, and NO commission: a barber/house
 * commission is not modeled in the backend and must not be faked here.
 */
import type { Appointment, Ledger } from './types'
import { isBillable } from './status'

/**
 *   billable       = appointments where status !== 'cancelled'
 *   total          = sum(billable.price)
 *   completedTotal = sum(price where status === 'completed')
 *   deposit        = total * 0.5   (platform-retained upfront deposit ONLY)
 *
 * The 0.5 mirrors finance/FinanceClient.tsx (`totalGross * 0.5`) and is the
 * platform deposit — NOT a barber/house split.
 */
export function deriveLedger(appointments: readonly Appointment[]): Ledger {
  let total = 0
  let completedTotal = 0
  for (const a of appointments) {
    if (!isBillable(a)) continue
    total += a.price
    if (a.status === 'completed') completedTotal += a.price
  }
  return { total, completedTotal, deposit: total * 0.5 }
}
