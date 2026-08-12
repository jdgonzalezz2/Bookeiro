'use client'
/**
 * Step 8 — MOBILE vertical projection of the ONE TimeRail.
 *
 * This is a PRESENTATION projection, not a second implementation. It receives
 * the shared reducer `state` + `dispatch` and reuses rail-core (computeSlots)
 * and the projection layer. Time flows DOWN (time -> y); one staff lane is shown
 * at a time via a chip switcher. Every mutation goes through the SAME reducer
 * actions (CREATE_TENTATIVE / SELECT / MOVE_*), so collision, Calm Correction,
 * validation and the Ledger are identical to desktop.
 *
 * `mobileLaneId` (which lane is visible) is presentation-only React state — it
 * never touches appointments, the reducer's appointment data, or the Ledger.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { computeSlots, formatCop, GRID_STEP_MS } from '@/lib/rail-core'
import type { DemoAppointment } from '@/lib/rail-core/demo'
import { isActionable, type DemoAction, type DemoState } from './reducer'
import { bogotaHM, buildAxisTicks } from './geometry'
import { blockStyle, pointStyle } from './projection'
import { STATE_LABEL, blockState } from './view'
import { appointmentLabel } from './a11y'

const HALF_HOUR_PX = 46 // fixed vertical scale -> reserved geometry, no layout shift

export default function MobileRail({
  state,
  dispatch,
  readOnly = false,
  onCommitMove,
}: {
  state: DemoState
  dispatch: (a: DemoAction) => void
  readOnly?: boolean
  /** Real mode: route move-commit through the parent's optimistic+persist path. */
  onCommitMove?: () => void
}) {
  const commitMove = () => (onCommitMove ? onCommitMove() : dispatch({ type: 'MOVE_COMMIT' }))
  const { startMs, endMs } = state.window
  const now = state.now
  const [mobileLaneId, setMobileLaneId] = useState(state.lanes[0].person.id)
  const lane = state.lanes.find((l) => l.person.id === mobileLaneId) ?? state.lanes[0]
  const moving = state.moving
  const collision = state.collision
  const t = state.tentative
  const serviceName = (id: string) => state.services.find((s) => s.id === id)?.name ?? '—'
  const defaultServiceId = state.services[0]?.id

  // Keep the visible lane in sync with an in-progress move's target lane.
  useEffect(() => {
    if (moving && moving.laneId !== mobileLaneId) setMobileLaneId(moving.laneId)
  }, [moving, mobileLaneId])

  const trackHeight = ((endMs - startMs) / GRID_STEP_MS) * HALF_HOUR_PX
  const ticks = buildAxisTicks(startMs, endMs)
  // Memoized on `lane`: a drag doesn't change the lane, so availability isn't
  // recomputed frame-by-frame (Step 10).
  const freeSlots = useMemo(
    () => (lane.window ? computeSlots(lane.window, lane.appointments, 30, now) : []),
    [lane, now],
  )

  const trackRef = useRef<HTMLDivElement | null>(null)
  const apptElRefs = useRef<Map<string, HTMLElement>>(new Map())
  const focusPending = useRef<string | null>(null)
  const drag = useRef<{
    id: string
    pointerId: number
    pointerType: string
    grabOffsetTime: number
    startX: number
    startY: number
    laneBaseX: number
    moved: boolean
    active: boolean
    longPress: ReturnType<typeof setTimeout> | null
  } | null>(null)

  useEffect(() => {
    if (focusPending.current) {
      apptElRefs.current.get(focusPending.current)?.focus()
      focusPending.current = null
    }
  })

  const timeAtClientY = (clientY: number): number => {
    const el = trackRef.current
    if (!el) return startMs
    const rect = el.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    return startMs + frac * (endMs - startMs)
  }
  const beginMove = (a: DemoAppointment, atClientY: number) => {
    if (readOnly) return // real data is read-only until mutation persistence (Step 19+)
    const d = drag.current
    if (!d) return
    d.grabOffsetTime = timeAtClientY(atClientY) - a.start
    d.active = true
    dispatch({ type: 'MOVE_START', id: a.id })
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      id: a.id, pointerId: e.pointerId, pointerType: e.pointerType,
      grabOffsetTime: 0, startX: e.clientX, startY: e.clientY, laneBaseX: e.clientX,
      moved: false, active: false, longPress: null,
    }
    if (e.pointerType !== 'mouse' && isActionable(a.status)) {
      drag.current.longPress = setTimeout(() => {
        if (drag.current && !drag.current.moved) beginMove(a, drag.current.startY)
      }, 400)
    }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
    if (!d.active) {
      if (d.pointerType === 'mouse') {
        if (dist > 4 && isActionable(a.status)) beginMove(a, d.startY)
        else return
      } else {
        if (dist > 8 && d.longPress) {
          clearTimeout(d.longPress) // moved before long-press -> let the page scroll
          d.longPress = null
        }
        return
      }
    }
    if (!d.active) return
    e.preventDefault()
    d.moved = true
    // Vertical drag -> desired TIME. Horizontal drag past a threshold -> switch staff.
    let laneId = moving?.laneId ?? mobileLaneId
    const dx = e.clientX - d.laneBaseX
    if (Math.abs(dx) > 60) {
      const idx = state.lanes.findIndex((l) => l.person.id === laneId)
      const next = Math.max(0, Math.min(state.lanes.length - 1, idx + (dx > 0 ? 1 : -1)))
      laneId = state.lanes[next].person.id
      d.laneBaseX = e.clientX
    }
    dispatch({ type: 'MOVE_TO', laneId, desiredStart: timeAtClientY(e.clientY) - d.grabOffsetTime })
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (d.longPress) {
      clearTimeout(d.longPress)
      d.longPress = null
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // already released
    }
    if (d.active) commitMove()
    else if (!d.moved) dispatch({ type: 'SELECT', id: a.id })
    drag.current = null
  }
  const onPointerCancel = () => {
    const d = drag.current
    if (!d) return
    if (d.longPress) clearTimeout(d.longPress)
    if (d.active) dispatch({ type: 'MOVE_CANCEL' })
    drag.current = null
  }
  // Roving grid focus over the single visible lane's cells (slots + appts by time)
  const cells = [
    ...freeSlots.map((s) => ({ key: `m|slot|${s.start}`, type: 'slot' as const, start: s.start })),
    ...lane.appointments.map((a) => ({ key: `m|appt|${a.id}`, type: 'appt' as const, start: a.start, appt: a })),
  ].sort((x, y) => x.start - y.start)
  const firstKey = cells[0]?.key ?? null
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const activeKey = focusKey ?? firstKey
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map())
  const focusWanted = useRef<string | null>(null)
  useEffect(() => {
    if (focusWanted.current) {
      cellRefs.current.get(focusWanted.current)?.focus()
      focusWanted.current = null
    }
  })
  const navigate = (delta: number) => {
    const idx = Math.max(0, cells.findIndex((c) => c.key === activeKey))
    const target = cells[Math.max(0, Math.min(cells.length - 1, idx + delta))]
    if (target) {
      focusWanted.current = target.key
      setFocusKey(target.key)
    }
  }

  const selectChip = (id: string) => {
    setMobileLaneId(id)
    setFocusKey(null)
    if (state.moving) dispatch({ type: 'MOVE_TO', laneId: id, desiredStart: state.moving.desiredStart })
  }
  const switchLane = (delta: number) => {
    const idx = state.lanes.findIndex((l) => l.person.id === mobileLaneId)
    const next = state.lanes[Math.max(0, Math.min(state.lanes.length - 1, idx + delta))]
    if (next) selectChip(next.person.id)
  }

  type MCell =
    | { key: string; type: 'slot'; start: number }
    | { key: string; type: 'appt'; start: number; appt: DemoAppointment }
  const onCellKeyDown = (e: ReactKeyboardEvent<HTMLElement>, cell: MCell) => {
    const m = state.moving
    if (cell.type === 'appt' && m && m.id === cell.appt.id) {
      const idx = state.lanes.findIndex((l) => l.person.id === m.laneId)
      if (e.key === 'ArrowUp') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: m.laneId, desiredStart: m.desiredStart - GRID_STEP_MS }) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: m.laneId, desiredStart: m.desiredStart + GRID_STEP_MS }) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: state.lanes[Math.max(0, idx - 1)].person.id, desiredStart: m.desiredStart }) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: state.lanes[Math.min(state.lanes.length - 1, idx + 1)].person.id, desiredStart: m.desiredStart }) }
      else if (e.key === 'Enter') { e.preventDefault(); focusPending.current = cell.appt.id; commitMove() }
      else if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'MOVE_CANCEL' }) }
      return
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1); return }
    if (e.key === 'ArrowLeft') { e.preventDefault(); switchLane(-1); return }
    if (e.key === 'ArrowRight') { e.preventDefault(); switchLane(1); return }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (cell.type === 'slot') {
        if (!readOnly && defaultServiceId) dispatch({ type: 'CREATE_TENTATIVE', laneId: lane.person.id, serviceId: defaultServiceId, start: cell.start })
      } else dispatch({ type: 'SELECT', id: cell.appt.id })
      return
    }
    if (!readOnly && (e.key === 'm' || e.key === 'M') && cell.type === 'appt' && isActionable(cell.appt.status)) {
      e.preventDefault()
      dispatch({ type: 'MOVE_START', id: cell.appt.id })
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'CLEAR' }) }
  }

  return (
    <div className="rp-mobile">
      <div className="rp-m-chips" role="tablist" aria-label="Profesional">
        {state.lanes.map((l) => {
          const active = l.person.id === mobileLaneId
          return (
            <button
              key={l.person.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`rp-m-chip${active ? ' rp-m-chip-active' : ''}`}
              onClick={() => selectChip(l.person.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); switchLane(1) }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); switchLane(-1) }
              }}
            >
              {l.person.name}
            </button>
          )
        })}
      </div>

      <div
        className="rp-m-body"
        role="grid"
        aria-label={`Agenda de ${lane.person.name} — rejilla vertical`}
        style={{ height: `${trackHeight}px` }}
      >
        <div className="rp-m-axis" aria-hidden="true">
          {ticks.map((tk, i) =>
            tk.label ? (
              <span key={i} className="rp-mono rp-m-tick" style={pointStyle(startMs + i * GRID_STEP_MS, startMs, endMs, 'vertical')}>
                {tk.label}
              </span>
            ) : null,
          )}
        </div>

        <div className="rp-m-track" role="row" aria-label={`Agenda de ${lane.person.name}`} ref={trackRef}>
          {freeSlots.map((s) => {
            const key = `m|slot|${s.start}`
            return (
              <span
                key={key}
                className="rp-m-slot"
                role="gridcell"
                tabIndex={activeKey === key ? 0 : -1}
                aria-label={`Espacio libre a las ${bogotaHM(s.start)}, agenda de ${lane.person.name}.${readOnly ? '' : ' Enter para reservar.'}`}
                ref={(el) => {
                  if (el) cellRefs.current.set(key, el)
                  else cellRefs.current.delete(key)
                }}
                style={pointStyle(s.start, startMs, endMs, 'vertical')}
                onKeyDown={(e) => onCellKeyDown(e, { key, type: 'slot', start: s.start })}
                onClick={() =>
                  !readOnly &&
                  defaultServiceId &&
                  dispatch({ type: 'CREATE_TENTATIVE', laneId: lane.person.id, serviceId: defaultServiceId, start: s.start })
                }
              />
            )
          })}

          {lane.appointments.map((a) => {
            const st = blockState(a, now)
            const key = `m|appt|${a.id}`
            return (
              <div
                key={a.id}
                className="rp-appt rp-m-appt"
                data-state={st}
                data-selected={state.selectedId === a.id ? 'true' : undefined}
                data-moving={moving?.id === a.id ? 'true' : undefined}
                role="gridcell"
                tabIndex={activeKey === key ? 0 : -1}
                aria-label={`${appointmentLabel(a, serviceName(a.serviceId), STATE_LABEL[st])}${!readOnly && isActionable(a.status) ? ' Pulsa M para mover.' : ''}`}
                ref={(el) => {
                  if (el) {
                    apptElRefs.current.set(a.id, el)
                    cellRefs.current.set(key, el)
                  } else {
                    apptElRefs.current.delete(a.id)
                    cellRefs.current.delete(key)
                  }
                }}
                style={blockStyle(a.start, a.end, startMs, endMs, 'vertical')}
                onPointerDown={(e) => onPointerDown(e, a)}
                onPointerMove={(e) => onPointerMove(e, a)}
                onPointerUp={(e) => onPointerUp(e, a)}
                onPointerCancel={onPointerCancel}
                onKeyDown={(e) => onCellKeyDown(e, { key, type: 'appt', start: a.start, appt: a })}
              >
                <span className="rp-appt-svc">{serviceName(a.serviceId)}</span>
                <span className="rp-mono rp-appt-time">
                  {bogotaHM(a.start)}–{bogotaHM(a.end)}
                </span>
                <span className="rp-mono rp-appt-price">{formatCop(a.price)}</span>
              </div>
            )
          })}

          {moving && moving.laneId === lane.person.id && (
            <div
              className="rp-move-ghost rp-m-move-ghost"
              aria-hidden="true"
              style={blockStyle(moving.desiredStart, moving.desiredStart + moving.durationMs, startMs, endMs, 'vertical')}
            >
              <span className="rp-move-ghost-label rp-mono">{bogotaHM(moving.desiredStart)}</span>
            </div>
          )}

          {collision && collision.laneId === lane.person.id && (
            <div
              className="rp-collision-ghost rp-m-collision-ghost"
              aria-hidden="true"
              style={blockStyle(collision.desiredStart, collision.desiredEnd, startMs, endMs, 'vertical')}
            >
              <span className="rp-collision-label">Ocupado</span>
            </div>
          )}

          {t && t.laneId === lane.person.id && (
            <div
              className="rp-appt rp-m-appt rp-appt-tentative"
              style={blockStyle(t.start, t.end, startMs, endMs, 'vertical')}
            >
              <span className="rp-appt-svc">{serviceName(t.serviceId)}</span>
              <span className="rp-mono rp-appt-time">
                {bogotaHM(t.start)}–{bogotaHM(t.end)}
              </span>
              <span className="rp-mono rp-appt-price">{formatCop(t.price)}</span>
            </div>
          )}

          <span className="rp-m-now-line" style={pointStyle(now, startMs, endMs, 'vertical')} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
