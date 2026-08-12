'use server'

/**
 * Server-authoritative appointment mutations for the authenticated agenda.
 *
 * The FRONTEND IS NOT THE AUTHORITY. Each action:
 *   1. resolves the tenant + identity from the SESSION (getCurrentProfile / JWT),
 *      never from client input — client-provided tenant/price/permission is ignored;
 *   2. calls the canonical DB write path (book_appointment for CREATE; the
 *      move/cancel/complete RPCs for the rest), which perform the FINAL atomic
 *      collision/authorization checks (see migrations 10 + 12);
 *   3. returns the AUTHORITATIVE appointment row so the client reconciles state;
 *   4. maps any raised DB error to a typed, user-safe message — raw errors are
 *      never returned to the client.
 *
 * RLS/auth are preserved: every call goes through createInsForgeServerClient with
 * the user's access token, so auth.uid() (and thus the RPC authorization + RLS)
 * runs as the authenticated user. No service-role/privileged secret is used.
 */
import { getCurrentProfile } from '@/lib/auth'
import { getAccessToken } from '@/lib/cookies'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import { mutationError, type MutationResult } from '@/lib/rail-adapter'
import type { BackendAppointment } from '@/lib/rail-adapter/adapter'
import { mapMutationError } from '@/lib/rail-adapter/mutation'

const APPT_COLS = 'id, staff_id, service_id, customer_name, start_time, end_time, status, total_price'

type Client = ReturnType<typeof createInsForgeServerClient>

/** Resolve an authenticated, tenant-bound client, or an unauthorized error. */
async function authed(): Promise<
  | { ok: true; insforge: Client; tenantId: string }
  | { ok: false; error: MutationResult }
> {
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) {
    return { ok: false, error: mutationError('unauthorized') }
  }
  const token = await getAccessToken()
  return { ok: true, insforge: createInsForgeServerClient(token), tenantId: profile.tenant_id }
}

/** Normalize a PostgREST RPC error into a searchable string for mapMutationError. */
function rawOf(error: { message?: string; details?: string; hint?: string } | null | undefined): string {
  if (!error) return ''
  return [error.message, error.details, error.hint].filter(Boolean).join(' ')
}

/** RPCs return the composite appointments row; PostgREST may wrap it in an array. */
function rowOf(data: unknown): BackendAppointment | null {
  const r = Array.isArray(data) ? data[0] : data
  return (r as BackendAppointment) ?? null
}

export interface CreateInput {
  staffId: string
  serviceId: string
  startIso: string
  customerName: string
  customerPhone?: string
}

/**
 * CREATE via the canonical book_appointment RPC. Tenant is session-derived;
 * duration is read from the tenant's own service catalog (server-authoritative);
 * PRICE is computed inside the RPC (the passed 0 is ignored).
 */
export async function createAppointmentAction(input: CreateInput): Promise<MutationResult> {
  const a = await authed()
  if (!a.ok) return a.error
  const { insforge, tenantId } = a

  if (!input.staffId || !input.serviceId || !input.startIso || !input.customerName.trim()) {
    return mutationError('server_error')
  }

  try {
    // Authoritative duration from the tenant's own service (also validates the service).
    const { data: svc, error: svcErr } = await insforge.database
      .from('services')
      .select('duration_mins')
      .eq('id', input.serviceId)
      .eq('tenant_id', tenantId)
      .single()
    if (svcErr || !svc) return mutationError('invalid_service')

    const startMs = Date.parse(input.startIso)
    if (!Number.isFinite(startMs)) return mutationError('server_error')
    const durationMins = (svc as { duration_mins?: number }).duration_mins ?? 30
    const endIso = new Date(startMs + durationMins * 60000).toISOString()

    const { data: newId, error } = await insforge.database.rpc('book_appointment', {
      p_tenant_id: tenantId, // SESSION-derived, never client input
      p_staff_id: input.staffId,
      p_service_id: input.serviceId,
      p_customer_name: input.customerName.trim(),
      p_customer_phone: input.customerPhone?.trim() ?? '',
      p_start_time: input.startIso,
      p_end_time: endIso,
      p_total_price: 0, // IGNORED by the RPC — price is server-authoritative
    })
    if (error) return mapMutationError(rawOf(error))

    const { data: created, error: readErr } = await insforge.database
      .from('appointments')
      .select(APPT_COLS)
      .eq('id', newId as string)
      .eq('tenant_id', tenantId)
      .single()
    if (readErr || !created) return mutationError('server_error')
    return { ok: true, appointment: created as BackendAppointment }
  } catch {
    return mutationError('server_error')
  }
}

export interface MoveInput {
  appointmentId: string
  staffId: string
  startIso: string
}

/** MOVE via the move_appointment RPC (atomic collision + authorization + hours). */
export async function moveAppointmentAction(input: MoveInput): Promise<MutationResult> {
  const a = await authed()
  if (!a.ok) return a.error
  if (!input.appointmentId || !input.staffId || !input.startIso) return mutationError('server_error')

  try {
    const { data, error } = await a.insforge.database.rpc('move_appointment', {
      p_appointment_id: input.appointmentId,
      p_staff_id: input.staffId,
      p_start_time: input.startIso,
    })
    if (error) return mapMutationError(rawOf(error))
    const appt = rowOf(data)
    return appt ? { ok: true, appointment: appt } : mutationError('server_error')
  } catch {
    return mutationError('server_error')
  }
}

/** CANCEL via the cancel_appointment RPC (terminal, authorized, never deletes). */
export async function cancelAppointmentAction(input: { appointmentId: string }): Promise<MutationResult> {
  const a = await authed()
  if (!a.ok) return a.error
  if (!input.appointmentId) return mutationError('server_error')

  try {
    const { data, error } = await a.insforge.database.rpc('cancel_appointment', {
      p_appointment_id: input.appointmentId,
    })
    if (error) return mapMutationError(rawOf(error))
    const appt = rowOf(data)
    return appt ? { ok: true, appointment: appt } : mutationError('server_error')
  } catch {
    return mutationError('server_error')
  }
}

/** COMPLETE via the complete_appointment RPC (terminal, authorized). */
export async function completeAppointmentAction(input: { appointmentId: string }): Promise<MutationResult> {
  const a = await authed()
  if (!a.ok) return a.error
  if (!input.appointmentId) return mutationError('server_error')

  try {
    const { data, error } = await a.insforge.database.rpc('complete_appointment', {
      p_appointment_id: input.appointmentId,
    })
    if (error) return mapMutationError(rawOf(error))
    const appt = rowOf(data)
    return appt ? { ok: true, appointment: appt } : mutationError('server_error')
  } catch {
    return mutationError('server_error')
  }
}
