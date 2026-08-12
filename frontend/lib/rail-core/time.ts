/**
 * rail-core / time — pure grid + money-formatting utilities.
 * No Date.now(), no browser APIs. `Intl` is part of ECMAScript, not the DOM,
 * so formatting stays pure and deterministic.
 */
import type { Millis } from './types'

/**
 * The 30-minute booking grid step, in ms. Documented mirror of the availability
 * generator's `steppingMs = 30 * 60 * 1000` in app/[slug]/actions.ts.
 */
export const GRID_STEP_MS = 30 * 60 * 1000

/** Minutes -> milliseconds. */
export const minutesToMs = (mins: number): Millis => mins * 60 * 1000

const COP_FORMAT = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Format money as COP in es-CO with ZERO decimals (e.g. 45000 -> "$45.000").
 * Rounds to whole pesos for display only — it never mutates a stored value.
 */
export function formatCop(amount: number): string {
  return COP_FORMAT.format(Math.round(amount))
}
