/**
 * Pure helpers for applying a server-authoritative mutation result to the client.
 *
 * The backend is the authority. After a successful mutation the RPC returns the
 * REAL appointment row; `applyAuthoritativeAppointment` folds that one row into
 * the existing `RailDay` (replace-by-id across lanes, re-sort, re-derive the axis
 * window) so the client reflects the DATABASE, never a guess. `deriveLedger`
 * over the result then updates money — no ledger arithmetic lives here.
 *
 * `mapMutationError` turns a raised DB error into a typed, user-safe message —
 * raw database errors are NEVER shown to the user.
 *
 * ZERO React, ZERO network — unit-testable in isolation.
 */
import { computeAxisWindow, rowToRailAppointment, type BackendAppointment } from './adapter'
import type { Person, RailDay, RailLane } from '../rail-core'

export type MutationErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'not_actionable'
  | 'collision'
  | 'outside_hours'
  | 'invalid_staff'
  | 'invalid_service'
  | 'server_error'

export interface MutationError {
  ok: false
  code: MutationErrorCode
  message: string
}

export type MutationResult =
  | { ok: true; appointment: BackendAppointment }
  | MutationError

/** Friendly, honest Spanish messages per error code — never raw DB text. */
const MESSAGES: Record<MutationErrorCode, string> = {
  unauthorized: 'No tienes permiso para modificar esta cita.',
  not_found: 'La cita ya no existe.',
  not_actionable: 'Esta cita ya no se puede modificar.',
  collision: 'Este horario acaba de ocuparse.',
  outside_hours: 'Ese horario está fuera de la jornada del profesional.',
  invalid_staff: 'Ese profesional no pertenece a tu negocio.',
  invalid_service: 'Ese servicio no está disponible.',
  server_error: 'No se pudo guardar el cambio. Vuelve a intentarlo.',
}

/** Map a raised DB/exception message (by its PREFIX convention) to a typed error. */
export function mapMutationError(raw: string | null | undefined): MutationError {
  const s = (raw ?? '').toUpperCase()
  const code: MutationErrorCode = s.includes('COLLISION')
    ? 'collision'
    : s.includes('OUTSIDE_HOURS')
      ? 'outside_hours'
      : s.includes('NOT_ACTIONABLE')
        ? 'not_actionable'
        : s.includes('NOT_FOUND')
          ? 'not_found'
          : s.includes('UNAUTHORIZED')
            ? 'unauthorized'
            : s.includes('INVALID_STAFF')
              ? 'invalid_staff'
              : s.includes('INVALID_SERVICE')
                ? 'invalid_service'
                : 'server_error'
  return { ok: false, code, message: MESSAGES[code] }
}

/** Build a typed error result directly from a code (used by server actions). */
export function mutationError(code: MutationErrorCode): MutationError {
  return { ok: false, code, message: MESSAGES[code] }
}

/**
 * Fold ONE authoritative appointment row into a RailDay. Removes the appointment
 * (by id) from wherever it currently is (it may have changed lanes/status),
 * re-inserts it into its authoritative lane sorted by start, and re-derives the
 * axis window. Same RailDay model; identity is the row's own `id`.
 */
export function applyAuthoritativeAppointment(day: RailDay, row: BackendAppointment): RailDay {
  const appt = rowToRailAppointment(row)
  if (!appt) return day // malformed authoritative row — leave state as-is

  // Remove this appointment id from every lane (handles cross-lane moves).
  let lanes: RailLane[] = day.lanes.map((lane) => {
    const filtered = lane.appointments.filter((a) => a.id !== appt.id)
    return filtered.length === lane.appointments.length ? lane : { ...lane, appointments: filtered }
  })

  // Insert into the authoritative lane (create a placeholder lane only if the
  // staff somehow isn't present yet — in practice the lane already exists).
  const targetIdx = lanes.findIndex((l) => l.person.id === appt.laneId)
  if (targetIdx === -1) {
    const person: Person = { id: appt.laneId, name: '—', avatarUrl: null }
    lanes = [...lanes, { person, window: null, appointments: [appt] }]
  } else {
    const target = lanes[targetIdx]
    const appointments = [...target.appointments, appt].sort((x, y) => x.start - y.start)
    lanes = lanes.map((l, i) => (i === targetIdx ? { ...l, appointments } : l))
  }

  return { ...day, lanes, window: computeAxisWindow(lanes, day.dateIso) }
}
