/**
 * Server-side READ path for the real Time-Rail. This is the ONLY new data-access
 * code, and it reuses the project's existing infrastructure verbatim:
 *   - the InsForge server client (`createInsForgeServerClient(accessToken)`), and
 *   - tenant scoping via `.eq('tenant_id', …)` PLUS the user JWT (RLS runs as the
 *     user) — exactly the pattern every dashboard page already uses.
 *
 * It performs NO mutations and adds NO new API layer. It fetches today's rows,
 * hands them to the PURE `toRailDay` adapter, and returns a discriminated result
 * so the caller can render ok / empty / error without inventing data.
 *
 * Auth/RLS are UNCHANGED: the caller passes an already-authenticated client and
 * a `tenantId` resolved from the session profile. Because appointments carry PII
 * (customer_name), this path is authenticated-only — the PUBLIC landing keeps the
 * DEMO fixture (see PROJECT NOTE in the Step-18 report).
 */
import { toRailDay, type BackendAppointment, type BackendService, type BackendStaff, type BackendWorkingHours } from './adapter'
import type { RailBusiness, RailDay } from '../rail-core'
import type { createInsForgeServerClient } from '@/lib/insforge-server'

const BOGOTA_OFFSET_HOURS = -5
const DAY_MS = 24 * 60 * 60 * 1000
/** User-facing read error — never leaks DB/exception internals. */
const READ_ERROR_MESSAGE = 'No pudimos cargar tu agenda en este momento. Vuelve a intentarlo.'

/** The already-authenticated InsForge server client (read-only usage here). */
type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

export type RealRailResult =
  | { status: 'ok'; day: RailDay }
  | { status: 'empty'; business: RailBusiness; dateIso: string }
  | { status: 'error'; message: string }

const pad = (n: number): string => n.toString().padStart(2, '0')

/** Bogotá calendar date ('YYYY-MM-DD') for an instant. Fixed -5, deterministic. */
function bogotaDateIso(nowMs: number): string {
  const local = new Date(nowMs + BOGOTA_OFFSET_HOURS * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
}

/** Bogotá midnight (start of `dateIso`) as a UTC instant. */
function bogotaDayStartMs(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number)
  return Date.UTC(y, m - 1, d, -BOGOTA_OFFSET_HOURS, 0, 0, 0)
}

/** Day-of-week (0 = Sunday) of a plain calendar date — matches Postgres DOW. */
function dowOf(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Load the authenticated tenant's day and adapt it to a `RailDay`. `nowMs` is the
 * server request instant (resolved once, then passed through as `day.now` so SSR
 * and hydration agree — no client-side Date.now for initial render).
 */
export async function loadRealRailDay(
  insforge: InsForgeClient,
  tenantId: string,
  nowMs: number,
): Promise<RealRailResult> {
  const dateIso = bogotaDateIso(nowMs)
  const dayStart = bogotaDayStartMs(dateIso)
  const dayStartIso = new Date(dayStart).toISOString()
  const dayEndIso = new Date(dayStart + DAY_MS).toISOString()
  const dow = dowOf(dateIso)

  try {
    const [tenantRes, staffRes, servicesRes, apptRes, hoursRes] = await Promise.all([
      insforge.database.from('tenants').select('name, slug').eq('id', tenantId),
      insforge.database.from('staff').select('id, name, avatar_url, is_active').eq('tenant_id', tenantId),
      insforge.database.from('services').select('id, name, duration_mins, base_price').eq('tenant_id', tenantId),
      insforge.database
        .from('appointments')
        .select('id, staff_id, service_id, customer_name, start_time, end_time, status, total_price')
        .eq('tenant_id', tenantId)
        .gte('start_time', dayStartIso)
        .lt('start_time', dayEndIso),
      insforge.database
        .from('working_hours')
        .select('staff_id, day_of_week, start_time, end_time, is_active')
        .eq('tenant_id', tenantId)
        .eq('day_of_week', dow),
    ])

    const firstError =
      tenantRes?.error || staffRes?.error || servicesRes?.error || apptRes?.error || hoursRes?.error
    if (firstError) {
      // Log the raw error server-side; never surface DB internals to the user.
      console.error('[loadRealRailDay] query error for tenant', tenantId, firstError)
      return { status: 'error', message: READ_ERROR_MESSAGE }
    }

    const tenant = (tenantRes?.data as { name?: string; slug?: string }[] | null)?.[0]
    const business: RailBusiness = {
      id: tenantId,
      name: tenant?.name ?? 'Tu negocio',
      slug: tenant?.slug ?? '',
    }

    const day = toRailDay({
      business,
      dateIso,
      nowMs,
      staff: (staffRes?.data as BackendStaff[]) ?? [],
      services: (servicesRes?.data as BackendService[]) ?? [],
      appointments: (apptRes?.data as BackendAppointment[]) ?? [],
      workingHours: (hoursRes?.data as BackendWorkingHours[]) ?? [],
    })

    // A rail needs at least one lane (professional). No staff AND no appointments
    // = nothing to render → honest empty state, never a fabricated placeholder.
    if (day.lanes.length === 0) {
      return { status: 'empty', business, dateIso }
    }

    return { status: 'ok', day }
  } catch (e) {
    // Log the raw exception server-side; return a safe, user-facing message.
    console.error('[loadRealRailDay] unexpected error for tenant', tenantId, e)
    return { status: 'error', message: READ_ERROR_MESSAGE }
  }
}
