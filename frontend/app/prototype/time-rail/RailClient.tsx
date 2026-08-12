'use client'
/**
 * STEP 4 — client island that hydrates the static Rail from the DemoDay reducer.
 *
 * It renders the SAME geometry/DOM as the Step-3 SSR output (so hydration
 * attaches, no structural replacement). The initial state has no selection and
 * no tentative, so the first render is identical to the static version;
 * interaction controls appear only AFTER a click.
 *
 * Interactions here are CLICK-ONLY (select / create-tentative-on-free-slot /
 * confirm / complete / cancel). Drag, keyboard move-mode, collision correction,
 * responsive projection, a11y live regions and animation are DEFERRED (Step 5+).
 *
 * All derived values (ledger, slots, in-progress, now-line) come from rail-core
 * every render — nothing derived is stored in reducer state.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { computeSlots, deriveLedger, formatCop, GRID_STEP_MS } from '@/lib/rail-core'
import type { RailDay } from '@/lib/rail-core'
import type { DemoAppointment } from '@/lib/rail-core/demo'
import { applyAuthoritativeAppointment, type MutationResult, type MutationErrorCode } from '@/lib/rail-adapter'
import { demoReducer, initDemoState, findAppointment, isActionable, type DemoState } from './reducer'

/**
 * Persistence handlers (server actions) for REAL data. When present, commits are
 * optimistic then reconciled/rolled-back against the server's authoritative row.
 * Absent = DemoDay: purely client-side, NEVER calls a real API (spec §13).
 */
export interface RailPersistence {
  create: (input: { staffId: string; serviceId: string; startIso: string; customerName: string; customerPhone?: string }) => Promise<MutationResult>
  move: (input: { appointmentId: string; staffId: string; startIso: string }) => Promise<MutationResult>
  cancel: (input: { appointmentId: string }) => Promise<MutationResult>
  complete: (input: { appointmentId: string }) => Promise<MutationResult>
}

type MutationUiState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'success' }
  | { status: 'error'; code: MutationErrorCode; message: string }
import { blockGeom, pct, bogotaHM } from './geometry'
import { STATE_LABEL, blockState } from './view'
import { appointmentLabel, announcementFor } from './a11y'
import MobileRail from './MobileRail'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Financial Accumulation — rolls the COP figure from its previous value to
 * `value`, ONLY when `value` actually changes. No roll on mount/hydration; the
 * roll is interruptible and is skipped entirely under prefers-reduced-motion.
 * The true amount is always `formatCop(value)`; ledger correctness never depends
 * on the roll finishing (the accessible summary/announcement use the real value).
 */
function MoneyRoll({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)
  const rafRef = useRef<number | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true // no roll on mount/hydration -> SSR value preserved
      displayRef.current = value
      setDisplay(value)
      return
    }
    if (prefersReducedMotion() || displayRef.current === value) {
      setDisplay(value) // reduced motion or no real change -> apply immediately
      displayRef.current = value
      return
    }
    const from = displayRef.current
    const to = value
    const startTs = performance.now()
    const durationMs = 420
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTs) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      displayRef.current = current
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
        displayRef.current = to
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current) // interruptible
        rafRef.current = null
      }
    }
  }, [value])

  return <span className={className}>{formatCop(display)}</span>
}

export default function RailClient({
  day,
  readOnly = false,
  persistence,
}: {
  day: RailDay
  readOnly?: boolean
  persistence?: RailPersistence
}) {
  const [state, dispatch] = useReducer(demoReducer, day, initDemoState)

  // --- Real-data persistence orchestration (no-op in demo mode) ---------------
  // The last SERVER-authoritative day; the base for every reconcile/rollback.
  const authoritativeDayRef = useRef<RailDay>(day)
  const [mutation, setMutation] = useState<MutationUiState>({ status: 'idle' })
  const mutationBusy = mutation.status === 'saving'
  // Quick-add customer fields (real create needs a name; phone optional).
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')

  /**
   * Optimistic → persist → reconcile/rollback. `optimistic` applies the existing
   * reducer transition instantly; `call` hits the server; on success we fold the
   * AUTHORITATIVE row into the last authoritative day and LOAD_DAY it; on failure
   * we LOAD_DAY the pre-mutation authoritative day (rollback) and surface the error.
   */
  const runPersist = (optimistic: () => void, call: () => Promise<MutationResult>, selectionId: string | null) => {
    const base = authoritativeDayRef.current
    optimistic()
    setMutation({ status: 'saving' })
    call()
      .then((res) => {
        if (res.ok) {
          const nextDay = applyAuthoritativeAppointment(base, res.appointment)
          authoritativeDayRef.current = nextDay
          dispatch({ type: 'LOAD_DAY', day: nextDay, preserveSelectionId: res.appointment.id ?? selectionId })
          setMutation({ status: 'success' })
        } else {
          dispatch({ type: 'LOAD_DAY', day: base }) // rollback to authoritative
          setMutation({ status: 'error', code: res.code, message: res.message })
        }
      })
      .catch(() => {
        dispatch({ type: 'LOAD_DAY', day: base })
        setMutation({ status: 'error', code: 'server_error', message: 'No se pudo guardar el cambio. Vuelve a intentarlo.' })
      })
  }

  // Auto-dismiss a success flash so the rail returns to idle.
  useEffect(() => {
    if (mutation.status !== 'success') return
    const id = setTimeout(() => setMutation({ status: 'idle' }), 2200)
    return () => clearTimeout(id)
  }, [mutation])

  const { startMs, endMs } = state.window
  const now = state.now
  const nowPct = pct(now, startMs, endMs)
  const ticks: number[] = []
  for (let t = startMs; t <= endMs; t += 30 * 60000) ticks.push(t)

  const ledger = deriveLedger(state.lanes.flatMap((l) => l.appointments)) // derived every render
  const { total, completedTotal, deposit } = ledger
  // DEMO-ONLY illustrative split (Bible 50/50). NOT a real ledger value, NOT in
  // rail-core, NOT stored — computed from deriveLedger's total purely for display.
  const illustrativeShare = Math.round(total * 0.5)
  const ledgerSummary = `Total ${formatCop(total)}. Anticipo 50% ${formatCop(deposit)}. Completado ${formatCop(completedTotal)}.`

  // Polite live-region announcement for movement / Calm Correction / completion /
  // cancellation / confirmation (+ resulting ledger). Derived by the pure
  // announcementFor(); skips hydration (first commit) and unrelated renders.
  // Motion-independent, so it fires under prefers-reduced-motion too.
  const [announce, setAnnounce] = useState('')
  const prevStateRef = useRef<DemoState | null>(null)
  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = state
    if (prev === null) return // hydration: no announcement
    const msg = announcementFor(prev, state)
    if (msg) setAnnounce(msg)
  }, [state])

  const serviceName = (id: string) => state.services.find((s) => s.id === id)?.name ?? '—'
  const defaultServiceId = state.services[0]?.id // "Corte" (30 min) for demo tentatives

  const selected = state.selectedId ? findAppointment(state, state.selectedId) : null
  const t = state.tentative
  const collision = state.collision

  // Demo-only: deterministically attempt to place a Corte on an already-occupied
  // cell (the earliest upcoming confirmed appointment) so Step 5's collision +
  // Calm Correction can be exercised without drag.
  const simulateCollision = () => {
    if (!defaultServiceId) return
    const target = state.lanes
      .flatMap((l) => l.appointments)
      .filter((a) => a.status === 'confirmed' && a.start >= now)
      .sort((a, b) => a.start - b.start)[0]
    if (!target) return
    dispatch({ type: 'CREATE_TENTATIVE', laneId: target.laneId, serviceId: defaultServiceId, start: target.start })
  }

  const moving = state.moving

  // --- Commit routers: demo dispatches client-only; real adds server persistence.
  // MOVE derives its committed target from a PURE reducer preview (no rule
  // duplication — it IS the reducer), so the server validates the exact slot the
  // client shows (post Calm Correction). --------------------------------------
  const commitMove = () => {
    if (!state.moving) return
    const id = state.moving.id
    if (!persistence) {
      dispatch({ type: 'MOVE_COMMIT' })
      return
    }
    if (mutationBusy) return
    const preview = demoReducer(state, { type: 'MOVE_COMMIT' })
    const moved = findAppointment(preview, id)
    // No valid slot ("sin espacio"): show it locally, nothing to persist.
    if ((preview.collision && !preview.collision.proposed) || !moved) {
      dispatch({ type: 'MOVE_COMMIT' })
      return
    }
    runPersist(
      () => dispatch({ type: 'MOVE_COMMIT' }),
      () => persistence.move({ appointmentId: id, staffId: moved.laneId, startIso: new Date(moved.start).toISOString() }),
      id,
    )
  }

  const commitCreate = () => {
    const tent = state.tentative
    if (!tent) return
    const name = custName.trim()
    if (!persistence) {
      dispatch({ type: 'CONFIRM_TENTATIVE', customerName: name || undefined })
      return
    }
    if (mutationBusy || !name) return
    // Preview: if confirming re-corrects (collision), don't persist — show correction.
    const preview = demoReducer(state, { type: 'CONFIRM_TENTATIVE', customerName: name })
    if (preview.tentative) {
      dispatch({ type: 'CONFIRM_TENTATIVE', customerName: name })
      return
    }
    const phone = custPhone.trim()
    runPersist(
      () => dispatch({ type: 'CONFIRM_TENTATIVE', customerName: name }),
      () => persistence.create({ staffId: tent.laneId, serviceId: tent.serviceId, startIso: new Date(tent.start).toISOString(), customerName: name, customerPhone: phone || undefined }),
      null,
    )
    setCustName('')
    setCustPhone('')
  }

  const commitCancel = (id: string) => {
    if (!persistence) {
      dispatch({ type: 'CANCEL_APPOINTMENT', id })
      return
    }
    if (mutationBusy) return
    runPersist(() => dispatch({ type: 'CANCEL_APPOINTMENT', id }), () => persistence.cancel({ appointmentId: id }), id)
  }

  const commitComplete = (id: string) => {
    if (!persistence) {
      dispatch({ type: 'COMPLETE_APPOINTMENT', id })
      return
    }
    if (mutationBusy) return
    runPersist(() => dispatch({ type: 'COMPLETE_APPOINTMENT', id }), () => persistence.complete({ appointmentId: id }), id)
  }

  // --- ARIA-grid roving focus. Cells (free slots + appointments) are ordered by
  // start time per lane (row). Arrow keys move focus; the reducer is untouched. ---
  // Memoized on state.lanes: a drag (MOVE_TO) does not change lanes, so unrelated
  // lanes' availability is NOT recomputed frame-by-frame (Step 10).
  const laneFreeSlots = useMemo(
    () => state.lanes.map((lane) => (lane.window ? computeSlots(lane.window, lane.appointments, 30, now) : [])),
    [state.lanes, now],
  )
  type Cell =
    | { key: string; type: 'slot'; laneId: string; start: number }
    | { key: string; type: 'appt'; laneId: string; start: number; appt: DemoAppointment }
  const gridCells: Cell[][] = state.lanes.map((lane, i) =>
    [
      ...laneFreeSlots[i].map((s): Cell => ({ key: `${lane.person.id}|slot|${s.start}`, type: 'slot', laneId: lane.person.id, start: s.start })),
      ...lane.appointments.map((a): Cell => ({ key: `${lane.person.id}|appt|${a.id}`, type: 'appt', laneId: lane.person.id, start: a.start, appt: a })),
    ].sort((x, y) => x.start - y.start),
  )
  const firstCellKey = gridCells.find((r) => r.length)?.[0]?.key ?? null
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const activeKey = focusKey ?? firstCellKey // SSR-stable initial tab stop
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map())
  const focusWanted = useRef<string | null>(null)

  const navigate = (rowDelta: number, colDelta: number) => {
    let row = gridCells.findIndex((r) => r.some((c) => c.key === activeKey))
    if (row < 0) row = 0
    let col = Math.max(0, gridCells[row].findIndex((c) => c.key === activeKey))
    row = Math.max(0, Math.min(gridCells.length - 1, row + rowDelta))
    col = Math.max(0, Math.min(Math.max(0, gridCells[row].length - 1), col + colDelta))
    const target = gridCells[row]?.[col]
    if (target) {
      focusWanted.current = target.key
      setFocusKey(target.key)
    }
  }
  useEffect(() => {
    if (focusWanted.current) {
      cellRefs.current.get(focusWanted.current)?.focus()
      focusWanted.current = null
    }
  })

  const onCellKeyDown = (e: ReactKeyboardEvent<HTMLElement>, cell: Cell) => {
    const m = state.moving
    if (cell.type === 'appt' && m && m.id === cell.appt.id) {
      const idx = state.lanes.findIndex((l) => l.person.id === m.laneId)
      if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: m.laneId, desiredStart: m.desiredStart - GRID_STEP_MS }) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: m.laneId, desiredStart: m.desiredStart + GRID_STEP_MS }) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: state.lanes[Math.max(0, idx - 1)].person.id, desiredStart: m.desiredStart }) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); dispatch({ type: 'MOVE_TO', laneId: state.lanes[Math.min(state.lanes.length - 1, idx + 1)].person.id, desiredStart: m.desiredStart }) }
      else if (e.key === 'Enter') { e.preventDefault(); focusPending.current = cell.appt.id; setFocusKey(`${m.laneId}|appt|${cell.appt.id}`); commitMove() }
      else if (e.key === 'Escape') { e.preventDefault(); dispatch({ type: 'MOVE_CANCEL' }) }
      return
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(0, -1); return }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(0, 1); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1, 0); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1, 0); return }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (cell.type === 'slot') {
        if (!readOnly && defaultServiceId) dispatch({ type: 'CREATE_TENTATIVE', laneId: cell.laneId, serviceId: defaultServiceId, start: cell.start })
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

  // --- Pointer MOVE machinery. Both pointer and keyboard dispatch the SAME
  // reducer actions, so business rules live only in the reducer. Refs (not
  // per-cell state) hold ephemeral drag data, so untouched lanes don't re-render. ---
  const laneTrackRefs = useRef<(HTMLDivElement | null)[]>([])
  const apptElRefs = useRef<Map<string, HTMLElement>>(new Map())
  const focusPending = useRef<string | null>(null)
  const drag = useRef<{
    id: string
    pointerId: number
    pointerType: string
    grabOffsetTime: number
    startX: number
    startY: number
    moved: boolean
    active: boolean
    longPress: ReturnType<typeof setTimeout> | null
  } | null>(null)

  // Restore focus to a moved appointment after a keyboard commit (a cross-lane
  // move remounts the block under a new parent, which would otherwise drop focus).
  useEffect(() => {
    if (focusPending.current) {
      apptElRefs.current.get(focusPending.current)?.focus()
      focusPending.current = null
    }
  })

  const timeAtClientX = (clientX: number): number => {
    const el = laneTrackRefs.current.find(Boolean)
    if (!el) return startMs
    const rect = el.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return startMs + frac * (endMs - startMs)
  }
  const laneAtClientY = (clientY: number): string => {
    let bestId = moving?.laneId ?? state.lanes[0].person.id
    let bestDist = Infinity
    for (let i = 0; i < state.lanes.length; i++) {
      const el = laneTrackRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientY >= r.top && clientY <= r.bottom) return state.lanes[i].person.id
      const dist = Math.abs(clientY - (r.top + r.bottom) / 2)
      if (dist < bestDist) {
        bestDist = dist
        bestId = state.lanes[i].person.id
      }
    }
    return bestId
  }
  const beginPointerMove = (a: DemoAppointment, atClientX: number) => {
    if (readOnly) return // real data is read-only until mutation persistence (Step 19+)
    const d = drag.current
    if (!d) return
    d.grabOffsetTime = timeAtClientX(atClientX) - a.start // keep the grab point under the pointer
    d.active = true
    dispatch({ type: 'MOVE_START', id: a.id })
  }

  const onBlockPointerDown = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      id: a.id, pointerId: e.pointerId, pointerType: e.pointerType,
      grabOffsetTime: 0, startX: e.clientX, startY: e.clientY,
      moved: false, active: false, longPress: null,
    }
    if (e.pointerType !== 'mouse' && isActionable(a.status)) {
      // touch/pen: long-press to enter move mode (a quick tap stays a select)
      drag.current.longPress = setTimeout(() => {
        if (drag.current && !drag.current.moved) beginPointerMove(a, drag.current.startX)
      }, 400)
    }
  }
  const onBlockPointerMove = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
    if (!d.active) {
      if (d.pointerType === 'mouse') {
        if (dist > 4 && isActionable(a.status)) beginPointerMove(a, d.startX)
        else return
      } else {
        if (dist > 8 && d.longPress) {
          clearTimeout(d.longPress) // moved before long-press fired -> let the page scroll
          d.longPress = null
        }
        return
      }
    }
    if (!d.active) return
    e.preventDefault()
    d.moved = true
    dispatch({ type: 'MOVE_TO', laneId: laneAtClientY(e.clientY), desiredStart: timeAtClientX(e.clientX) - d.grabOffsetTime })
  }
  const onBlockPointerUp = (e: ReactPointerEvent<HTMLDivElement>, a: DemoAppointment) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    if (d.longPress) {
      clearTimeout(d.longPress)
      d.longPress = null
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // capture may already be released
    }
    if (d.active) commitMove() // release resolves synchronously
    else if (!d.moved) dispatch({ type: 'SELECT', id: a.id }) // tap/click
    drag.current = null
  }
  const onBlockPointerCancel = () => {
    const d = drag.current
    if (!d) return
    if (d.longPress) clearTimeout(d.longPress)
    if (d.active) dispatch({ type: 'MOVE_CANCEL' })
    drag.current = null
  }
  // Real create needs a customer name; disable confirm until it's provided.
  const createDisabled = mutationBusy || (!!persistence && !custName.trim())
  const customerFields = persistence ? (
    <div className="rp-cust">
      <input
        className="rp-cust-input"
        placeholder="Nombre del cliente"
        aria-label="Nombre del cliente"
        value={custName}
        onChange={(e) => setCustName(e.target.value)}
      />
      <input
        className="rp-cust-input"
        placeholder="Teléfono (opcional)"
        aria-label="Teléfono del cliente"
        value={custPhone}
        onChange={(e) => setCustPhone(e.target.value)}
      />
    </div>
  ) : null

  return (
    <>
      {/* DESKTOP / TABLET — horizontal projection (time = x). CSS shows this at
          >= 768px; the mobile vertical projection shows below it at < 768px.
          Both render server-side and consume the SAME state/reducer/rail-core. */}
      <div className="rp-desktop">
      <div className="rp-scroll">
        <div className="rp-board" role="grid" aria-label="Agenda del día — rejilla de citas">
          {/* AXIS (visual time scale; times live in each cell's accessible name) */}
          <div className="rp-row rp-axis-row" aria-hidden="true">
            <div className="rp-gutter rp-axis-gutter">Hoy</div>
            <div className="rp-track rp-axis">
              {ticks.map((tk, i) => {
                const major = new Date(tk).getUTCMinutes() === 0
                return (
                  <div
                    key={i}
                    className={`rp-tick${major ? ' rp-tick-major' : ''}`}
                    style={{ left: `${pct(tk, startMs, endMs)}%` }}
                  >
                    {major && <span className="rp-mono rp-tick-label">{bogotaHM(tk)}</span>}
                  </div>
                )
              })}
              <div className="rp-now-flag" style={{ left: `${nowPct}%` }}>
                <span className="rp-mono">{bogotaHM(now)}</span>
              </div>
            </div>
          </div>

          {/* LANES */}
          {state.lanes.map((lane, laneIndex) => {
            const freeSlots = laneFreeSlots[laneIndex]
            return (
              <div className="rp-row rp-lane-row" role="row" key={lane.person.id}>
                <div className="rp-gutter" role="rowheader">
                  <span className="rp-avatar" aria-hidden="true">
                    {lane.person.name.charAt(0)}
                  </span>
                  <span className="rp-lane-name">{lane.person.name}</span>
                  <span className="rp-mono rp-lane-meta">{freeSlots.length} libres</span>
                </div>

                <div
                  className="rp-track rp-lane-track"
                  role="presentation"
                  ref={(el) => {
                    laneTrackRefs.current[laneIndex] = el
                  }}
                >
                  {freeSlots.map((s) => {
                    const key = `${lane.person.id}|slot|${s.start}`
                    return (
                      <span
                        key={key}
                        className="rp-slot"
                        role="gridcell"
                        tabIndex={activeKey === key ? 0 : -1}
                        aria-label={`Espacio libre a las ${bogotaHM(s.start)}, agenda de ${lane.person.name}.${readOnly ? '' : ' Enter para reservar.'}`}
                        ref={(el) => {
                          if (el) cellRefs.current.set(key, el)
                          else cellRefs.current.delete(key)
                        }}
                        style={{ left: `${pct(s.start, startMs, endMs)}%` }}
                        onKeyDown={(e) => onCellKeyDown(e, { key, type: 'slot', laneId: lane.person.id, start: s.start })}
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
                    const g = blockGeom(a.start, a.end, startMs, endMs)
                    const key = `${lane.person.id}|appt|${a.id}`
                    return (
                      <div
                        key={a.id}
                        className="rp-appt"
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
                        style={{ left: `${g.left}%`, width: `${g.width}%` }}
                        title={`${serviceName(a.serviceId)} · ${STATE_LABEL[st]}`}
                        onPointerDown={(e) => onBlockPointerDown(e, a)}
                        onPointerMove={(e) => onBlockPointerMove(e, a)}
                        onPointerUp={(e) => onBlockPointerUp(e, a)}
                        onPointerCancel={onBlockPointerCancel}
                        onKeyDown={(e) => onCellKeyDown(e, { key, type: 'appt', laneId: lane.person.id, start: a.start, appt: a })}
                      >
                        <span className="rp-appt-svc">{serviceName(a.serviceId)}</span>
                        <span className="rp-mono rp-appt-time">
                          {bogotaHM(a.start)}–{bogotaHM(a.end)}
                        </span>
                        <span className="rp-appt-client">{a.customerName}</span>
                        <span className="rp-mono rp-appt-price">{formatCop(a.price)}</span>
                      </div>
                    )
                  })}

                  {/* Tentative block (client-only) */}
                  {t && t.laneId === lane.person.id && (
                    <div
                      className="rp-appt rp-appt-tentative"
                      style={{
                        left: `${blockGeom(t.start, t.end, startMs, endMs).left}%`,
                        width: `${blockGeom(t.start, t.end, startMs, endMs).width}%`,
                      }}
                    >
                      <span className="rp-appt-svc">{serviceName(t.serviceId)}</span>
                      <span className="rp-mono rp-appt-time">
                        {bogotaHM(t.start)}–{bogotaHM(t.end)}
                      </span>
                      <span className="rp-appt-client">Tentativa</span>
                      <span className="rp-mono rp-appt-price">{formatCop(t.price)}</span>
                    </div>
                  )}

                  {/* Move preview ghost (drag / keyboard), snapped to the grid */}
                  {moving && moving.laneId === lane.person.id && (
                    <div
                      className="rp-move-ghost"
                      aria-hidden="true"
                      style={{
                        left: `${blockGeom(moving.desiredStart, moving.desiredStart + moving.durationMs, startMs, endMs).left}%`,
                        width: `${blockGeom(moving.desiredStart, moving.desiredStart + moving.durationMs, startMs, endMs).width}%`,
                      }}
                    >
                      <span className="rp-move-ghost-label rp-mono">{bogotaHM(moving.desiredStart)}</span>
                    </div>
                  )}

                  {/* Collision ghost at the desired (occupied) position */}
                  {collision && collision.laneId === lane.person.id && (
                    <div
                      className="rp-collision-ghost"
                      aria-hidden="true"
                      style={{
                        left: `${blockGeom(collision.desiredStart, collision.desiredEnd, startMs, endMs).left}%`,
                        width: `${blockGeom(collision.desiredStart, collision.desiredEnd, startMs, endMs).width}%`,
                      }}
                    >
                      <span className="rp-collision-label">Ocupado</span>
                    </div>
                  )}

                  <span className="rp-now-line" style={{ left: `${nowPct}%` }} aria-hidden="true" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>

      <MobileRail state={state} dispatch={dispatch} readOnly={readOnly} onCommitMove={persistence ? commitMove : undefined} />

      {/* Demo-only control to trigger a collision without drag (Step 5 verify).
          Hidden for real data, which is read-only. */}
      {!readOnly && (
        <div className="rp-demo-controls">
          <button className="rp-btn rp-btn-ghost" onClick={simulateCollision}>
            Simular colisión (demo)
          </button>
        </div>
      )}

      {/* Contextual action bar. Order of precedence: active move > collision
          (Calm Correction) > tentative > selection. */}
      {(moving || collision || t || selected) && (
        <div className="rp-actionbar">
          {moving ? (
            <>
              <span className="rp-actionbar-info">
                Moviendo {serviceName(moving.serviceId)} ·{' '}
                <span className="rp-mono">{bogotaHM(moving.desiredStart)}</span> · usa las flechas, Enter confirma, Esc cancela.
              </span>
              <div className="rp-actionbar-btns">
                <button className="rp-btn rp-btn-primary" onClick={commitMove} disabled={mutationBusy}>
                  Confirmar
                </button>
                <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'MOVE_CANCEL' })}>
                  Cancelar
                </button>
              </div>
            </>
          ) : collision ? (
            collision.proposed ? (
              <>
                <span className="rp-actionbar-info rp-actionbar-collision">
                  Horario ocupado; movido a las{' '}
                  <span className="rp-mono">{bogotaHM(collision.proposed.start)}</span>.
                </span>
                {t && customerFields}
                <div className="rp-actionbar-btns">
                  {t ? (
                    <>
                      <button className="rp-btn rp-btn-primary" onClick={commitCreate} disabled={createDisabled}>
                        Confirmar
                      </button>
                      <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'CANCEL_TENTATIVE' })}>
                        Descartar
                      </button>
                    </>
                  ) : (
                    <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'CLEAR' })}>
                      Cerrar
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="rp-actionbar-info rp-actionbar-collision">
                  Sin espacio hoy en esa agenda.
                </span>
                <div className="rp-actionbar-btns">
                  <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'CLEAR' })}>
                    Cerrar
                  </button>
                </div>
              </>
            )
          ) : t ? (
            <>
              <span className="rp-actionbar-info">
                Cita tentativa · <span className="rp-mono">{bogotaHM(t.start)}–{bogotaHM(t.end)}</span> ·{' '}
                {serviceName(t.serviceId)} · <span className="rp-mono">{formatCop(t.price)}</span>
              </span>
              {customerFields}
              <div className="rp-actionbar-btns">
                <button className="rp-btn rp-btn-primary" onClick={commitCreate} disabled={createDisabled}>
                  Confirmar
                </button>
                <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'CANCEL_TENTATIVE' })}>
                  Descartar
                </button>
              </div>
            </>
          ) : selected ? (
            <>
              <span className="rp-actionbar-info">
                {serviceName(selected.serviceId)} · {selected.customerName} ·{' '}
                {STATE_LABEL[blockState(selected, now)]}
              </span>
              <div className="rp-actionbar-btns">
                {!readOnly && isActionable(selected.status) && (
                  <>
                    <button
                      className="rp-btn rp-btn-ghost"
                      onClick={() => dispatch({ type: 'MOVE_START', id: selected.id })}
                    >
                      Mover
                    </button>
                    <button
                      className="rp-btn rp-btn-primary"
                      onClick={() => commitComplete(selected.id)}
                      disabled={mutationBusy}
                    >
                      Completar
                    </button>
                    <button
                      className="rp-btn rp-btn-danger"
                      onClick={() => commitCancel(selected.id)}
                      disabled={mutationBusy}
                    >
                      Cancelar
                    </button>
                  </>
                )}
                <button className="rp-btn rp-btn-ghost" onClick={() => dispatch({ type: 'CLEAR' })}>
                  Cerrar
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Persistence status — restrained: amber saving, sage success, terracotta
          error/collision. Motion-independent (same result under reduced motion). */}
      {persistence && mutation.status !== 'idle' && (
        <div className="rp-mutation" data-status={mutation.status} role="status" aria-live="polite">
          {mutation.status === 'saving'
            ? 'Guardando…'
            : mutation.status === 'success'
              ? 'Guardado.'
              : mutation.message}
        </div>
      )}

      {/* LEDGER — every figure derived by rail-core.deriveLedger from live state.
          The visual layer is aria-hidden; the accessible layer is the sr-only
          summary + a polite live region, so money is never communicated by
          motion or colour alone. */}
      <footer className="rp-ledger">
        <div className="rp-ledger-visual" aria-hidden="true">
          <div className="rp-ledger-row">
            <div className="rp-ledger-item">
              <span className="rp-ledger-label">Total</span>
              <MoneyRoll value={total} className="rp-mono rp-ledger-total" />
            </div>
            <div className="rp-ledger-item">
              <span className="rp-ledger-label">Completado</span>
              <MoneyRoll value={completedTotal} className="rp-mono rp-ledger-value" />
            </div>
            <div className="rp-ledger-item">
              <span className="rp-ledger-label">Anticipo 50%</span>
              <MoneyRoll value={deposit} className="rp-mono rp-ledger-value" />
            </div>
          </div>
          <div className="rp-ledger-illustrative">
            <span className="rp-ledger-illus-tag">{readOnly ? 'Ilustrativo' : 'Demo'}</span>
            División ilustrativa 50/50 · Barbero <span className="rp-mono">{formatCop(illustrativeShare)}</span> · Casa{' '}
            <span className="rp-mono">{formatCop(illustrativeShare)}</span> — ilustrativo, el backend no modela comisión.
          </div>
        </div>
        <p className="rp-sr-only">{ledgerSummary}</p>
        <div className="rp-sr-only" role="status" aria-live="polite">
          {announce}
        </div>
      </footer>

      {persistence ? (
        <p className="rp-note">
          Agenda en vivo desde tu backend. Arrastra una cita para moverla, tócala para completarla o
          cancelarla, o toca un espacio libre para reservar. Cada cambio se valida y se guarda en el
          servidor; si el horario acaba de ocuparse, se revierte y te avisa.
        </p>
      ) : readOnly ? (
        <p className="rp-note">
          Agenda en vivo desde tu backend, en modo lectura. Explora las citas con clic o teclado (flechas
          para navegar). Mover, reservar y completar aún no guardan cambios — llegan en el siguiente paso.
        </p>
      ) : (
        <p className="rp-note">
          Datos de demostración deterministas — no son reales. Arrastra una cita para moverla, tócala
          para ver acciones o toca un espacio libre para reservar. Si cae sobre un horario ocupado, se
          reacomoda sola al hueco válido más cercano. También funciona con teclado (M para mover ·
          flechas · Enter para confirmar).
        </p>
      )}
    </>
  )
}
