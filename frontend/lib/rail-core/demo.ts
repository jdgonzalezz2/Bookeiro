/**
 * ============================================================================
 *  DEMO-ONLY / DETERMINISTIC FIXTURE  —  NOT BACKEND DATA
 * ============================================================================
 *
 * An isolated, in-memory day for the MARKETING PROTOTYPE. It exists purely to
 * exercise `rail-core` without any network, InsForge, or real backend.
 *
 * This is NOT, and must never be treated as:
 *   - real tenant data          - real appointment data
 *   - real staff data           - authoritative production pricing
 *   - persisted state
 *
 * The real backend (Postgres via InsForge + the SQL RPCs) remains the single
 * source of truth. This fixture only establishes an INITIAL visual state;
 * cancellation / movement / completion mutations belong to the Step-4 state
 * machine, not here.
 *
 * DETERMINISM (hard requirement): no Date.now(), no Math.random(), no UUIDs,
 * no network, no browser/env values. Instants are built with `Date.UTC(...)`
 * (a pure function of its arguments), so the same day is produced on every
 * machine and after every reload. `now` is a fixed instant.
 *
 * VALUE PROVENANCE
 * ----------------------------------------------------------------------------
 *  REPO-DERIVED (from frontend/app/page.tsx landing mockups):
 *    - Business name .............. "La Cima Barbería"            (page.tsx:245)
 *    - Staff ...................... Julián, Daniela, Sofía        (page.tsx:101,111,121)
 *    - Customers .................. Andrés Charry, Camila Rojas, Laura Méndez
 *                                                                 (page.tsx:99,109,119)
 *    - "Corte + barba" = $45.000 (Julián) ....................... (page.tsx:253–256)
 *    - "Color" price $120.000 (from "Color + hidratación") ...... (page.tsx:118–122)
 *    - "Corte" price $35.000 (from "Fade degradado", a corte) ... (page.tsx:108–112)
 *    - Working hours 09:00–20:00 (from storefront "Horario hoy 09:00 - 20:00")
 *                                          (StorefrontClient.tsx hardcoded schedule)
 *
 *  INVENTED demo-fixture values (documented, easy to change):
 *    - Business/staff/appointment IDs (stable strings, e.g. "demo-julian")
 *    - Fixture date .............. 2026-01-05 (a Monday) + fixed now = 12:00
 *    - "Diseño de barba" price ... $25.000  (repo only prices "Diseño de cejas"
 *                                            at $18.000 — nearest reference)
 *    - Durations 30/60/90 min ... chosen as clean 30-min-grid multiples to
 *                                  exercise the rail. NOTE: the repo landing
 *                                  showed "Corte + barba" as 45 min and "Color"
 *                                  as 60 min; the fixture uses 60 and 90 so all
 *                                  durations align to the 30-min grid.
 *    - Extra customers .......... Mateo Ríos, Sebastián Peña, Valentina Ortiz
 * ============================================================================
 */
import type {
  Millis,
  Money,
  Person,
  Service,
  StoredStatus,
  WorkingWindow,
} from './index'
import { minutesToMs } from './index'
import type { RailAppointment, RailBusiness, RailDay, RailLane } from './view-model'

// ---------------------------------------------------------------------------
// Demo shapes. A demo appointment/lane/business is STRUCTURALLY just the shared
// rail view-model — these aliases preserve every existing import while proving
// the fixture and the backend adapter produce the exact same shape.
// ---------------------------------------------------------------------------

/** A demo appointment = a rail-core RailAppointment (Appointment + display name). */
export type DemoAppointment = RailAppointment
export type DemoLane = RailLane
export type DemoBusiness = RailBusiness

/**
 * The deterministic fixture day. It IS a `RailDay` (so it feeds the same
 * RailClient/reducer as real data), narrowed to `source: 'demo'` and stamped
 * with a hard `kind` marker so this object can never be mistaken for backend data.
 */
export interface DemoDay extends RailDay {
  /** Marks this object as the demo fixture — never real data. */
  readonly kind: 'demo-day'
  source: 'demo'
}

// ---------------------------------------------------------------------------
// Deterministic time. America/Bogota is a fixed UTC-5 (no DST); we resolve
// wall-clock fixture times to UTC epoch ms explicitly so the fixture is
// identical regardless of the host machine's timezone.
// ---------------------------------------------------------------------------

const BOGOTA_UTC_OFFSET_HOURS = -5 // fixed, no DST
const FIXTURE_YEAR = 2026
const FIXTURE_MONTH = 0 // January (0-indexed)
const FIXTURE_DAY = 5 // Monday 2026-01-05
export const DEMO_DATE_ISO = '2026-01-05'

/** Bogotá wall-clock (that fixture day) -> UTC epoch ms. Pure/deterministic. */
function bogota(hour: number, minute = 0): Millis {
  return Date.UTC(
    FIXTURE_YEAR,
    FIXTURE_MONTH,
    FIXTURE_DAY,
    hour - BOGOTA_UTC_OFFSET_HOURS, // Bogotá 09:00 -> 14:00 UTC
    minute,
    0,
    0,
  )
}

/** Fixed "now" for the whole fixture: 12:00 Bogotá. */
export const DEMO_NOW: Millis = bogota(12, 0)

/** Shared working window: 09:00–20:00 Bogotá (repo-derived storefront schedule). */
const DEMO_WINDOW: WorkingWindow = { startMs: bogota(9, 0), endMs: bogota(20, 0) }

// ---------------------------------------------------------------------------
// Services — the ONLY four service types (per the approved blueprint).
// `price` mirrors the backend's already-resolved base price (numeric COP).
// ---------------------------------------------------------------------------

const SVC_CORTE = 'demo-svc-corte'
const SVC_CORTE_BARBA = 'demo-svc-corte-barba'
const SVC_BARBA = 'demo-svc-diseno-barba'
const SVC_COLOR = 'demo-svc-color'

function demoServices(): Service[] {
  return [
    { id: SVC_CORTE, name: 'Corte', durationMins: 30, price: 35000 }, // repo-adjacent price
    { id: SVC_CORTE_BARBA, name: 'Corte + barba', durationMins: 60, price: 45000 }, // repo price ($45.000)
    { id: SVC_BARBA, name: 'Diseño de barba', durationMins: 30, price: 25000 }, // INVENTED price
    { id: SVC_COLOR, name: 'Color', durationMins: 90, price: 120000 }, // repo price ($120.000)
  ]
}

// ---------------------------------------------------------------------------
// People (stable IDs; no invented avatar URLs -> null).
// ---------------------------------------------------------------------------

const JULIAN: Person = { id: 'demo-julian', name: 'Julián', avatarUrl: null }
const DANIELA: Person = { id: 'demo-daniela', name: 'Daniela', avatarUrl: null }
const SOFIA: Person = { id: 'demo-sofia', name: 'Sofía', avatarUrl: null }

/** Stable initial for a person (presentation convenience; still deterministic). */
export const initialOf = (p: Person): string => p.name.charAt(0).toUpperCase()

// ---------------------------------------------------------------------------
// Appointment builder. `end` is computed from the service duration (reusing
// rail-core's `minutesToMs`) — `end` is intrinsic stored data (end_time), not a
// derived Rail value, so building it here avoids transcription errors.
// Price is taken from the service catalog (single source; no per-staff override
// in the demo — documented).
// ---------------------------------------------------------------------------

function make(
  id: string,
  serviceId: string,
  laneId: string,
  startHour: number,
  startMinute: number,
  status: StoredStatus,
  customerName: string,
): DemoAppointment {
  const svc = demoServices().find((s) => s.id === serviceId)
  if (!svc) throw new Error(`demo fixture: unknown serviceId ${serviceId}`)
  const start = bogota(startHour, startMinute)
  const end = start + minutesToMs(svc.durationMins)
  const price: Money = svc.price
  return { id, laneId, serviceId, start, end, status, price, customerName }
}

// ---------------------------------------------------------------------------
// The seeded day. Deterministic layout around now = 12:00:
//
//   Julián : 10:00–11:00 Corte+barba (completed)   13:00–13:30 Corte (confirmed)
//   Daniela: 11:00–11:30 Diseño (completed)         14:00–15:30 Color (confirmed)
//   Sofía  : 09:00–09:30 Corte (CANCELLED)          16:00–17:00 Corte+barba (confirmed)
//
// Exercises: available + occupied space, 30/60/90-min durations, confirmed +
// completed + cancelled, all three lanes, big open gaps (move) and occupied
// blocks (collision / Calm Correction). No non-cancelled same-lane overlaps.
// ---------------------------------------------------------------------------

function demoLanes(): DemoLane[] {
  return [
    {
      person: JULIAN,
      window: DEMO_WINDOW,
      appointments: [
        make('demo-appt-001', SVC_CORTE_BARBA, JULIAN.id, 10, 0, 'completed', 'Andrés Charry'),
        make('demo-appt-002', SVC_CORTE, JULIAN.id, 13, 0, 'confirmed', 'Mateo Ríos'),
      ],
    },
    {
      person: DANIELA,
      window: DEMO_WINDOW,
      appointments: [
        make('demo-appt-003', SVC_BARBA, DANIELA.id, 11, 0, 'completed', 'Sebastián Peña'),
        make('demo-appt-004', SVC_COLOR, DANIELA.id, 14, 0, 'confirmed', 'Camila Rojas'),
      ],
    },
    {
      person: SOFIA,
      window: DEMO_WINDOW,
      appointments: [
        make('demo-appt-005', SVC_CORTE, SOFIA.id, 9, 0, 'cancelled', 'Laura Méndez'),
        make('demo-appt-006', SVC_CORTE_BARBA, SOFIA.id, 16, 0, 'confirmed', 'Valentina Ortiz'),
      ],
    },
  ]
}

/**
 * Build a FRESH deterministic DemoDay. Returns a new object graph each call
 * (so later mutation steps get their own copy), but always structurally equal.
 */
export function createDemoDay(): DemoDay {
  return {
    kind: 'demo-day',
    source: 'demo',
    business: { id: 'demo-la-cima', name: 'La Cima Barbería', slug: 'la-cima' },
    dateIso: DEMO_DATE_ISO,
    dayStartMs: bogota(0, 0),
    now: DEMO_NOW,
    window: { startMs: DEMO_WINDOW.startMs, endMs: DEMO_WINDOW.endMs },
    services: demoServices(),
    lanes: demoLanes(),
  }
}

/**
 * Demo-only helper to exercise the "no trabaja" concept WITHOUT inventing a
 * fourth staff member: returns a copy of a lane with no working window and no
 * appointments, which rail-core's rules already treat as unavailable.
 */
export function withDayOff(lane: DemoLane): DemoLane {
  return { person: lane.person, window: null, appointments: [] }
}
