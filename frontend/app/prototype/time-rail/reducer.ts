/**
 * STEP 4 — DemoDay client-side state machine (pure, framework-independent).
 *
 * A single reducer drives the prototype via React's useReducer. This module has
 * NO React import so it is unit-testable on its own. It reuses rail-core types
 * and rules; it never duplicates business logic.
 *
 * (Imports are RELATIVE, not the `@/` alias, so the reducer + its tests compile
 * and run under plain `tsc`/`node:test` without a bundler to resolve paths.)
 *
 * STATE vs DERIVED — the reducer stores ONLY:
 *   now, window, services, lanes(appointments), selectedId, tentative, collision, seq
 * Everything else — availability, slots, in-progress, ledger, the now-line — is
 * DERIVED from these via rail-core at render/query time, never stored here.
 *
 * DEFERRED (Step 5/7): collision detection, nearestValidSlot / Calm Correction,
 * and pointer/keyboard MOVEMENT. No placeholder logic is invented for them.
 */
import type { WorkingWindow, Service, RailDay } from '../../../lib/rail-core'
import { minutesToMs, isFree, nearestValidSlot, GRID_STEP_MS } from '../../../lib/rail-core'
import type { DemoLane, DemoAppointment } from '../../../lib/rail-core/demo'

/** Client-only, never persisted. The mandatory step between an available slot
 *  and a confirmed appointment. It carries no StoredStatus by design. */
export interface TentativeAppointment {
  laneId: string
  serviceId: string
  start: number
  end: number
  price: number
}

/**
 * Transient collision info (never persisted). Records a placement attempt that
 * failed rail-core.isFree(). `proposed` is rail-core.nearestValidSlot()'s result
 * (the Calm Correction target); `null` => "sin espacio hoy".
 */
export interface CollisionInfo {
  laneId: string
  desiredStart: number
  desiredEnd: number
  proposed: { start: number; end: number } | null
}

/**
 * Transient move interaction (drag OR keyboard). Not persisted. Holds only the
 * desired PREVIEW position; the appointment itself is not mutated until commit,
 * so a cancelled move restores the original by simply clearing this.
 */
export interface MoveState {
  id: string
  originalLaneId: string
  originalStart: number
  originalEnd: number
  durationMs: number
  serviceId: string
  /** current target lane (may differ from original for a cross-lane move) */
  laneId: string
  /** grid-snapped desired start (preview only) */
  desiredStart: number
}

export interface DemoState {
  now: number
  window: WorkingWindow
  services: Service[]
  lanes: DemoLane[]
  // --- transient interaction state (not persisted) ---
  selectedId: string | null
  tentative: TentativeAppointment | null
  collision: CollisionInfo | null
  moving: MoveState | null
  /** Monotonic counter for deterministic new-appointment IDs (no Date/random). */
  seq: number
}

export type DemoAction =
  | { type: 'SELECT'; id: string }
  | { type: 'CLEAR' }
  | { type: 'LOAD_DAY'; day: RailDay; preserveSelectionId?: string | null }
  | { type: 'CREATE_TENTATIVE'; laneId: string; serviceId: string; start: number }
  | { type: 'CANCEL_TENTATIVE' }
  | { type: 'CONFIRM_TENTATIVE'; customerName?: string }
  | { type: 'COMPLETE_APPOINTMENT'; id: string }
  | { type: 'CANCEL_APPOINTMENT'; id: string }
  | { type: 'MOVE_START'; id: string }
  | { type: 'MOVE_TO'; laneId: string; desiredStart: number }
  | { type: 'MOVE_COMMIT' }
  | { type: 'MOVE_CANCEL' }

/** A pending/confirmed appointment can still transition; terminal ones cannot. */
export function isActionable(status: DemoAppointment['status']): boolean {
  return status === 'confirmed' || status === 'pending'
}

/** Snap an instant to the 30-minute grid anchored at `anchor` (rail-core step). */
function snapToGrid(t: number, anchor: number): number {
  return anchor + Math.round((t - anchor) / GRID_STEP_MS) * GRID_STEP_MS
}

export function findAppointment(state: DemoState, id: string): DemoAppointment | null {
  for (const lane of state.lanes) {
    const a = lane.appointments.find((x) => x.id === id)
    if (a) return a
  }
  return null
}

function updateStatus(
  state: DemoState,
  id: string,
  status: DemoAppointment['status'],
): DemoLane[] {
  return state.lanes.map((lane) =>
    lane.appointments.some((a) => a.id === id)
      ? { ...lane, appointments: lane.appointments.map((a) => (a.id === id ? { ...a, status } : a)) }
      : lane,
  )
}

/**
 * Build the initial reducer state from any RailDay (the deterministic demo
 * fixture OR an adapted backend day — same shape, same rules). Behaviour is
 * identical to before; only the accepted type widened from DemoDay to RailDay.
 */
export function initDemoState(day: RailDay): DemoState {
  return {
    now: day.now,
    window: { startMs: day.window.startMs, endMs: day.window.endMs },
    services: day.services.map((s) => ({ ...s })),
    lanes: day.lanes.map((l) => ({
      person: { ...l.person },
      window: l.window,
      appointments: l.appointments.map((a) => ({ ...a })),
    })),
    selectedId: null,
    tentative: null,
    collision: null,
    moving: null,
    seq: 0,
  }
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'SELECT': {
      if (!findAppointment(state, action.id)) return state
      return { ...state, selectedId: action.id, tentative: null, collision: null }
    }

    case 'CLEAR':
      return { ...state, selectedId: null, tentative: null, collision: null }

    // Replace the whole board with an AUTHORITATIVE day (used by real-data
    // reconcile after a successful mutation, and rollback after a rejected one).
    // Transient interaction is cleared; selection is preserved only if that
    // appointment still exists in the new day. No scheduling rules here.
    case 'LOAD_DAY': {
      const base = initDemoState(action.day)
      const keep =
        action.preserveSelectionId != null &&
        base.lanes.some((l) => l.appointments.some((a) => a.id === action.preserveSelectionId))
      return { ...base, selectedId: keep ? action.preserveSelectionId! : null }
    }

    case 'CREATE_TENTATIVE': {
      const svc = state.services.find((s) => s.id === action.serviceId)
      if (!svc) return state
      const lane = state.lanes.find((l) => l.person.id === action.laneId)
      if (!lane) return state
      const candidate = { start: action.start, end: action.start + minutesToMs(svc.durationMins) }

      // Collision detection — the ONE canonical rule (cancelled ignored inside).
      if (isFree(lane.appointments, candidate)) {
        return {
          ...state,
          tentative: {
            laneId: lane.person.id, serviceId: svc.id,
            start: candidate.start, end: candidate.end, price: svc.price,
          },
          selectedId: null,
          collision: null,
        }
      }

      // Collision -> Calm Correction. Never commit; never mutate the blocker.
      const proposed = nearestValidSlot(lane.window, lane.appointments, action.start, svc.durationMins, state.now)
      const collision: CollisionInfo = {
        laneId: lane.person.id, desiredStart: candidate.start, desiredEnd: candidate.end, proposed,
      }
      if (!proposed) {
        // Honest empty state: "sin espacio hoy".
        return { ...state, tentative: null, selectedId: null, collision }
      }
      // The tentative settles into the proposed valid slot.
      return {
        ...state,
        tentative: {
          laneId: lane.person.id, serviceId: svc.id,
          start: proposed.start, end: proposed.end, price: svc.price,
        },
        selectedId: null,
        collision,
      }
    }

    case 'CANCEL_TENTATIVE':
      return { ...state, tentative: null, collision: null }

    case 'CONFIRM_TENTATIVE': {
      const t = state.tentative
      // No tentative -> no-op. This is what makes "available -> confirmed"
      // impossible without first passing through the tentative state.
      if (!t) return state

      const lane = state.lanes.find((l) => l.person.id === t.laneId)
      if (!lane) return state

      // ---- Step 5: collision validation BEFORE commit (mirror of the RPC's
      // pre-insert overlap check). No transition may bypass this; an invalid
      // tentative is re-corrected via Calm Correction, never committed. ----
      if (!isFree(lane.appointments, { start: t.start, end: t.end })) {
        const svc = state.services.find((s) => s.id === t.serviceId)
        const durationMins = svc ? svc.durationMins : Math.round((t.end - t.start) / 60000)
        const proposed = nearestValidSlot(lane.window, lane.appointments, t.start, durationMins, state.now)
        const collision: CollisionInfo = {
          laneId: t.laneId, desiredStart: t.start, desiredEnd: t.end, proposed,
        }
        if (!proposed) return { ...state, tentative: null, collision }
        return { ...state, tentative: { ...t, start: proposed.start, end: proposed.end }, collision }
      }

      const seq = state.seq + 1
      const appt: DemoAppointment = {
        id: `demo-appt-new-${seq}`,
        laneId: t.laneId,
        serviceId: t.serviceId,
        start: t.start,
        end: t.end,
        status: 'confirmed',
        price: t.price,
        customerName: action.customerName ?? 'Cliente demo',
      }
      const lanes = state.lanes.map((lane) =>
        lane.person.id === t.laneId
          ? { ...lane, appointments: [...lane.appointments, appt] }
          : lane,
      )
      return { ...state, lanes, tentative: null, selectedId: appt.id, collision: null, seq }
    }

    case 'COMPLETE_APPOINTMENT': {
      const appt = findAppointment(state, action.id)
      if (!appt || !isActionable(appt.status)) return state // completed/cancelled are terminal
      return { ...state, lanes: updateStatus(state, action.id, 'completed') }
    }

    case 'CANCEL_APPOINTMENT': {
      const appt = findAppointment(state, action.id)
      if (!appt || !isActionable(appt.status)) return state // completed/cancelled are terminal
      return { ...state, lanes: updateStatus(state, action.id, 'cancelled') }
    }

    // ---- MOVE: one business path shared by pointer drag and keyboard ---------
    case 'MOVE_START': {
      const appt = findAppointment(state, action.id)
      if (!appt || !isActionable(appt.status)) return state // completed/cancelled not movable
      return {
        ...state,
        moving: {
          id: appt.id,
          originalLaneId: appt.laneId,
          originalStart: appt.start,
          originalEnd: appt.end,
          durationMs: appt.end - appt.start,
          serviceId: appt.serviceId,
          laneId: appt.laneId,
          desiredStart: appt.start,
        },
        selectedId: appt.id,
        tentative: null,
        collision: null,
      }
    }

    case 'MOVE_TO': {
      if (!state.moving) return state
      return {
        ...state,
        moving: {
          ...state.moving,
          laneId: action.laneId,
          desiredStart: snapToGrid(action.desiredStart, state.window.startMs),
        },
      }
    }

    case 'MOVE_CANCEL':
      // The appointment was never mutated during the move -> clearing restores it.
      return { ...state, moving: null, collision: null }

    case 'MOVE_COMMIT': {
      const m = state.moving
      if (!m) return state
      const orig = findAppointment(state, m.id)
      const targetLane = state.lanes.find((l) => l.person.id === m.laneId)
      if (!orig || !targetLane) return { ...state, moving: null }

      const start = snapToGrid(m.desiredStart, state.window.startMs)
      const candidate = { start, end: start + m.durationMs }
      // Collision must ignore the appointment being moved (esp. same-lane moves).
      const others = targetLane.appointments.filter((a) => a.id !== m.id)
      const w = targetLane.window
      const svc = state.services.find((s) => s.id === m.serviceId)
      const durationMins = svc ? svc.durationMins : Math.round(m.durationMs / 60000)

      // Validate: working hours + not-past + isFree (the ONE canonical predicate).
      const valid =
        w !== null &&
        candidate.start >= Math.max(state.now, w.startMs) &&
        candidate.end <= w.endMs &&
        isFree(others, candidate)

      let committed: { start: number; end: number }
      let collision: CollisionInfo | null = null
      if (valid) {
        committed = candidate
      } else {
        const proposed = nearestValidSlot(w, others, candidate.start, durationMins, state.now)
        if (!proposed) {
          // No valid slot: leave the appointment unchanged; surface "sin espacio".
          return {
            ...state,
            moving: null,
            collision: { laneId: m.laneId, desiredStart: candidate.start, desiredEnd: candidate.end, proposed: null },
          }
        }
        committed = proposed
        collision = { laneId: m.laneId, desiredStart: candidate.start, desiredEnd: candidate.end, proposed }
      }

      // Preserve service/customer/price/status/duration; only relocate in time/lane.
      const moved: DemoAppointment = { ...orig, laneId: m.laneId, start: committed.start, end: committed.end }
      const lanes = state.lanes.map((lane) => {
        const without = lane.appointments.filter((a) => a.id !== m.id)
        if (lane.person.id === m.laneId) return { ...lane, appointments: [...without, moved] }
        if (without.length !== lane.appointments.length) return { ...lane, appointments: without }
        return lane
      })
      return { ...state, lanes, moving: null, selectedId: m.id, collision }
    }

    default:
      return state
  }
}
