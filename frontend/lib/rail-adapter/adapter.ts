/**
 * rail-adapter — the ONLY place backend rows become a `RailDay`.
 *
 * Responsibility: SHAPE + TIMEZONE, nothing else. It maps InsForge/Postgres rows
 * (staff / services / appointments / working_hours) onto the pure rail-core view
 * model. It deliberately contains NO scheduling or money logic:
 *
 *   - collision / availability / slots  → rail-core (computeSlots, isFree, …)
 *   - ledger totals / deposit           → rail-core (deriveLedger)
 *   - appointment visual state          → rail-core (deriveAppointmentState)
 *
 * The adapter never invents availability, prices, or ledger values. Persisted
 * data (Postgres) stays authoritative; this module only translates it.
 *
 * PURITY: no network, no `Date.now()`, no `Math.random()`. `nowMs` is passed in
 * by the caller (resolved once at the server boundary) so the same inputs always
 * produce the same `RailDay` — testable and SSR/hydration-stable.
 *
 * TIMEZONE: America/Bogotá is a FIXED UTC-5 (no DST). This matches rail-core's
 * geometry (`bogotaHM`) and the DemoDay fixture, so axis labels line up. Absolute
 * instants (appointment `start_time`/`end_time`, full timestamptz) are parsed with
 * `Date.parse` and need no offset math; only wall-clock `working_hours` TIME values
 * are resolved onto the target date at the fixed offset.
 *
 * NOTE (pre-existing inconsistency, not changed here): app/[slug]/actions.ts
 * resolves working_hours using the SERVER's local timezone (`new Date(y,m,d,…)`),
 * which is non-deterministic on a UTC host. This adapter uses the fixed Bogotá
 * offset instead — the correct, deterministic behaviour the rail already assumes.
 */
import type { Millis, Money, RailBusiness, RailDay, RailLane, StoredStatus } from '../rail-core'
import type { RailAppointment } from '../rail-core/view-model'
import type { Person, Service } from '../rail-core/types'

/** Fixed Bogotá offset (no DST). Mirrors rail-core geometry + DemoDay. */
const BOGOTA_OFFSET_HOURS = -5
const HALF_HOUR_MS = 30 * 60 * 1000
/** Axis fallback when a day has neither working hours nor appointments. */
const DEFAULT_OPEN_HOUR = 9
const DEFAULT_CLOSE_HOUR = 20

// ---------------------------------------------------------------------------
// Backend row shapes (tolerant supersets of the SELECTed columns). Numeric
// columns (NUMERIC) may arrive as number OR string from PostgREST, hence the
// `number | string` unions coerced by `toMoney`.
// ---------------------------------------------------------------------------

export interface BackendStaff {
  id: string
  name: string | null
  avatar_url?: string | null
  is_active?: boolean | null
}

export interface BackendService {
  id: string
  name: string | null
  duration_mins?: number | null
  base_price?: number | string | null
}

export interface BackendAppointment {
  id: string
  staff_id: string | null
  service_id: string | null
  customer_name?: string | null
  start_time: string
  end_time: string
  status: string
  total_price?: number | string | null
}

export interface BackendWorkingHours {
  staff_id: string | null
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_active?: boolean | null
}

export interface ToRailDayInput {
  business: RailBusiness
  /** Target calendar day (Bogotá) as 'YYYY-MM-DD'. */
  dateIso: string
  /** Reference "now" (epoch ms), resolved once by the caller at the server edge. */
  nowMs: Millis
  staff: BackendStaff[]
  services: BackendService[]
  appointments: BackendAppointment[]
  workingHours: BackendWorkingHours[]
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const STORED_STATUSES: ReadonlySet<string> = new Set(['pending', 'confirmed', 'cancelled', 'completed'])

function normalizeStatus(s: string): StoredStatus {
  // The DB CHECK constraint guarantees one of the four; default defensively.
  return (STORED_STATUSES.has(s) ? s : 'confirmed') as StoredStatus
}

function toMoney(v: number | string | null | undefined): Money {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

function parseDateIso(dateIso: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateIso.split('-').map(Number)
  return { year, month, day }
}

/** Bogotá wall-clock on the target date → UTC epoch ms. Pure/deterministic. */
function bogotaWallToMs(dateIso: string, hour: number, minute: number): Millis {
  const { year, month, day } = parseDateIso(dateIso)
  // Bogotá 09:00 (offset -5) → 14:00 UTC, i.e. hour - (-5) = hour + 5.
  return Date.UTC(year, month - 1, day, hour - BOGOTA_OFFSET_HOURS, minute, 0, 0)
}

/** Day-of-week (0 = Sunday .. 6 = Saturday) of the plain calendar date.
 *  Matches Postgres EXTRACT(DOW) and the storefront's working_hours convention. */
function dayOfWeek(dateIso: string): number {
  const { year, month, day } = parseDateIso(dateIso)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Parse a Postgres TIME ('HH:MM' or 'HH:MM:SS') → {h, m}; null if unparseable. */
function parseTime(t: string | null | undefined): { h: number; m: number } | null {
  if (!t) return null
  const parts = t.split(':').map(Number)
  const h = parts[0]
  const m = parts[1] ?? 0
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return { h, m }
}

/** Snap an instant outward to the 30-min grid (floor for start, ceil for end)
 *  so axis ticks stay clean while never clipping real appointments. */
function floorToGrid(ms: Millis): Millis {
  return Math.floor(ms / HALF_HOUR_MS) * HALF_HOUR_MS
}
function ceilToGrid(ms: Millis): Millis {
  return Math.ceil(ms / HALF_HOUR_MS) * HALF_HOUR_MS
}

// ---------------------------------------------------------------------------
// Row → domain (shared by toRailDay AND the mutation reconciler, so a single
// appointment returned by a mutation RPC is mapped EXACTLY like a read row).
// ---------------------------------------------------------------------------

/**
 * Map ONE backend appointment row to a `RailAppointment`, or `null` if it is
 * malformed (no staff, unparseable/degenerate time range) — dropped, never guessed.
 */
export function rowToRailAppointment(a: BackendAppointment): RailAppointment | null {
  if (!a.staff_id) return null
  const start = Date.parse(a.start_time)
  const end = Date.parse(a.end_time)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return {
    id: a.id,
    laneId: a.staff_id,
    serviceId: a.service_id ?? '',
    start,
    end,
    status: normalizeStatus(a.status),
    price: toMoney(a.total_price),
    customerName: a.customer_name ?? '',
  }
}

/**
 * Axis window for a day: span every lane window AND every appointment so nothing
 * is clipped, snapped OUTWARD to the 30-min grid. Fallback: 09:00–20:00 Bogotá.
 * Shared so a post-mutation day keeps a consistent axis.
 */
export function computeAxisWindow(lanes: RailLane[], dateIso: string): { startMs: Millis; endMs: Millis } {
  const startCandidates: Millis[] = []
  const endCandidates: Millis[] = []
  for (const lane of lanes) {
    if (lane.window) {
      startCandidates.push(lane.window.startMs)
      endCandidates.push(lane.window.endMs)
    }
    for (const a of lane.appointments) {
      startCandidates.push(a.start)
      endCandidates.push(a.end)
    }
  }
  let startMs: Millis
  let endMs: Millis
  if (startCandidates.length && endCandidates.length) {
    startMs = floorToGrid(Math.min(...startCandidates))
    endMs = ceilToGrid(Math.max(...endCandidates))
  } else {
    startMs = bogotaWallToMs(dateIso, DEFAULT_OPEN_HOUR, 0)
    endMs = bogotaWallToMs(dateIso, DEFAULT_CLOSE_HOUR, 0)
  }
  if (endMs <= startMs) endMs = startMs + HALF_HOUR_MS // degenerate guard
  return { startMs, endMs }
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

/**
 * Transform backend rows into a `RailDay` (source: 'real'). Malformed rows are
 * DROPPED, never guessed: an appointment with an unparseable/degenerate time
 * range or no staff is skipped. Callers may inspect `staff`/`appointments`
 * lengths beforehand to decide empty vs. error states.
 */
export function toRailDay(input: ToRailDayInput): RailDay {
  const { business, dateIso, nowMs } = input
  const dow = dayOfWeek(dateIso)

  // --- Services catalog (id → Service). base_price is the authoritative catalog
  //     price; per-appointment price uses the appointment's own total_price. ---
  const services: Service[] = input.services.map((s) => ({
    id: s.id,
    name: s.name ?? '—',
    durationMins: s.duration_mins ?? 30,
    price: toMoney(s.base_price),
  }))

  // --- Appointments → RailAppointment, grouped by staff (lane). ---
  const byStaff = new Map<string, RailAppointment[]>()
  for (const a of input.appointments) {
    const appt = rowToRailAppointment(a)
    if (!appt) continue
    const list = byStaff.get(appt.laneId)
    if (list) list.push(appt)
    else byStaff.set(appt.laneId, [appt])
  }

  // --- Working-hours window per staff for the target day-of-week. ---
  const windowByStaff = new Map<string, { startMs: Millis; endMs: Millis }>()
  for (const wh of input.workingHours) {
    if (!wh.staff_id || wh.day_of_week !== dow || wh.is_active === false) continue
    const s = parseTime(wh.start_time)
    const e = parseTime(wh.end_time)
    if (!s || !e) continue
    const startMs = bogotaWallToMs(dateIso, s.h, s.m)
    const endMs = bogotaWallToMs(dateIso, e.h, e.m)
    if (endMs <= startMs) continue
    windowByStaff.set(wh.staff_id, { startMs, endMs })
  }

  // --- Lanes: every ACTIVE staff member, plus any staff referenced by an
  //     appointment today (so no appointment is ever orphaned/hidden). ---
  const laneStaffIds: string[] = []
  const seen = new Set<string>()
  const staffById = new Map<string, BackendStaff>()
  for (const st of input.staff) {
    staffById.set(st.id, st)
    if (st.is_active !== false && !seen.has(st.id)) {
      seen.add(st.id)
      laneStaffIds.push(st.id)
    }
  }
  for (const staffId of byStaff.keys()) {
    if (!seen.has(staffId)) {
      seen.add(staffId)
      laneStaffIds.push(staffId)
    }
  }

  const lanes: RailLane[] = laneStaffIds.map((staffId) => {
    const st = staffById.get(staffId)
    const person: Person = {
      id: staffId,
      name: st?.name ?? '—',
      avatarUrl: st?.avatar_url ?? null,
    }
    const appointments = (byStaff.get(staffId) ?? []).slice().sort((x, y) => x.start - y.start)
    const window = windowByStaff.get(staffId) ?? null
    return { person, window, appointments }
  })

  return {
    source: 'real',
    business,
    dateIso,
    dayStartMs: bogotaWallToMs(dateIso, 0, 0),
    now: nowMs,
    window: computeAxisWindow(lanes, dateIso),
    services,
    lanes,
  }
}
