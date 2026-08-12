/**
 * Step 8 — the projection layer. ONE TimeRail, two orientations.
 *
 * Time fractions come from geometry.ts (the single geometry base). This only
 * maps a fraction to the axis-appropriate CSS property: x (left/width) for
 * horizontal, y (top/height) for vertical. NO domain logic — an appointment's
 * duration ALWAYS determines its visual extent, in either orientation.
 */
import type { CSSProperties } from 'react'
import { pct, blockGeom } from './geometry'

export type Orientation = 'horizontal' | 'vertical'

/** Position + extent for a block spanning [startMs, endMs], per orientation. */
export function blockStyle(
  startMs: number,
  endMs: number,
  winStart: number,
  winEnd: number,
  orientation: Orientation,
): CSSProperties {
  const { left, width } = blockGeom(startMs, endMs, winStart, winEnd)
  return orientation === 'horizontal'
    ? { left: `${left}%`, width: `${width}%` }
    : { top: `${left}%`, height: `${width}%` }
}

/** Position for a single instant (now-line, tick, slot), per orientation. */
export function pointStyle(
  ms: number,
  winStart: number,
  winEnd: number,
  orientation: Orientation,
): CSSProperties {
  const p = pct(ms, winStart, winEnd)
  return orientation === 'horizontal' ? { left: `${p}%` } : { top: `${p}%` }
}
