/**
 * PRESENTATION-ONLY geometry for the static Time-Rail prototype.
 *
 * This maps rail-core instants (epoch ms) onto the horizontal axis. It contains
 * NO domain rules — collision, availability, ledger, the 30-min grid step and
 * `now` all come from rail-core. The only thing here is pixel/percent geometry
 * and time-of-day LABEL formatting (rail-core intentionally has no time labels).
 */
import { GRID_STEP_MS } from '../../../lib/rail-core'

/**
 * Bogotá is a fixed UTC-5 (no DST). This mirrors the DemoDay fixture's offset and
 * is used ONLY to render "HH:MM" axis/block labels — never to compute `now` (that
 * stays the rail-core / DemoDay value).
 */
const BOGOTA_OFFSET_HOURS = -5

/** Position of instant `t` as a percentage across the working window. */
export const pct = (t: number, startMs: number, endMs: number): number =>
  ((t - startMs) / (endMs - startMs)) * 100

/** Left/width geometry (in %) for a block spanning [startMs, endMs]. */
export function blockGeom(
  startMs: number,
  endMs: number,
  winStart: number,
  winEnd: number,
): { left: number; width: number } {
  const left = pct(startMs, winStart, winEnd)
  return { left, width: pct(endMs, winStart, winEnd) - left }
}

/** Format an instant as Bogotá wall-clock "HH:MM" (presentation only). */
export function bogotaHM(ms: number): string {
  const d = new Date(ms)
  const h = (((d.getUTCHours() + BOGOTA_OFFSET_HOURS) % 24) + 24) % 24
  const m = d.getUTCMinutes()
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export interface AxisTick {
  leftPct: number
  /** Labelled only on the hour; 30-min minor ticks are unlabelled. */
  label: string | null
  major: boolean
}

/**
 * Build axis ticks across the window using rail-core's 30-min GRID_STEP_MS,
 * so the axis grid and slot geometry share one definition of "30 minutes".
 */
export function buildAxisTicks(startMs: number, endMs: number): AxisTick[] {
  const ticks: AxisTick[] = []
  for (let t = startMs; t <= endMs; t += GRID_STEP_MS) {
    const major = new Date(t).getUTCMinutes() === 0
    ticks.push({ leftPct: pct(t, startMs, endMs), label: major ? bogotaHM(t) : null, major })
  }
  return ticks
}
