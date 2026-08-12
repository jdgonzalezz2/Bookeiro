'use server'

import { createInsForgeServerClient } from '@/lib/insforge-server'

// Since it's a public flow, we use the server client (which uses anon key if no user, but can call RPCs)
// Actually, to call RPC or read DB efficiently, we just use the default configured InsForge client inside the server.

function getAnonClient() {
  return createInsForgeServerClient() 
}

export async function getTenantServices(tenantId: string) {
  const insforge = getAnonClient()
  const { data, error } = await insforge.database
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (error) console.error(error)
  return data || []
}

export async function getTenantStaff(tenantId: string) {
  const insforge = getAnonClient()
  const { data, error } = await insforge.database
    .from('staff')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (error) console.error(error)
  return data || []
}

export async function getAvailableSlots(tenantId: string, staffId: string, dateStr: string, durationMins: number) {
  const insforge = getAnonClient()
  
  // 1. Get day of week (0-6)
  // Need to correctly parse dateStr (YYYY-MM-DD) avoiding timezone shift
  const [year, month, day] = dateStr.split('-').map(Number)
  const queryDate = new Date(year, month - 1, day)
  const dayOfWeek = queryDate.getDay() // 0 = Sunday

  // 2. Fetch working hours for that day
  const { data: hours } = await insforge.database
    .from('working_hours')
    .select('start_time, end_time')
    .eq('staff_id', staffId)
    .eq('tenant_id', tenantId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  if (!hours || !hours.start_time || !hours.end_time) {
    return [] // No trabaja
  }

  // 3. Fetch existing appointments for that day
  // Rango del día en UTC
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59).toISOString()

  // Use the get_busy_slots RPC (SECURITY DEFINER, no PII) instead of reading
  // appointments directly — the public read policy was removed to avoid exposing
  // customer_name / customer_phone to the anon key.
  const { data: appointments } = await insforge.database.rpc('get_busy_slots', {
    p_staff_id: staffId,
    p_from: startOfDay,
    p_to: endOfDay,
  })

  const booked = ((appointments as { busy_start: string; busy_end: string }[]) || []).map(a => ({
    start: new Date(a.busy_start).getTime(),
    end: new Date(a.busy_end).getTime()
  }))

  // 4. Generate Slots
  // parse times (e.g. '09:00:00')
  const [sh, sm] = hours.start_time.split(':').map(Number)
  const [eh, em] = hours.end_time.split(':').map(Number)

  const workStart = new Date(year, month - 1, day, sh, sm, 0).getTime()
  const workEnd = new Date(year, month - 1, day, eh, em, 0).getTime()

  const slots = []
  let currentStart = workStart

  // Generar fragmentos cada 30 min (o según base standard de duración). 
  // Let's step by 15 mins for maximum flexibility, or 30. Better step by duration or 30 min?
  // Let's do 30 mins stepping for cleaner UX.
  const steppingMs = 30 * 60 * 1000
  const durationMs = durationMins * 60 * 1000

  // Optional constraint: Don't show slots in the past if today
  const nowMs = Date.now()

  while (currentStart + durationMs <= workEnd) {
    const currentEnd = currentStart + durationMs
    
    // Check if overlap
    const hasOverlap = booked.some(b => {
      // Overlap logic: A start < B end AND A end > B start
      return currentStart < b.end && currentEnd > b.start
    })

    if (!hasOverlap && currentStart > nowMs) {
      slots.push({
        startIso: new Date(currentStart).toISOString(),
        endIso: new Date(currentEnd).toISOString(),
        label: new Date(currentStart).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      })
    }

    currentStart += steppingMs // Shift start by 30 mins
  }

  return slots
}

export async function submitBooking(
  tenantId: string,
  staffId: string,
  serviceId: string,
  name: string,
  phone: string,
  startIso: string,
  endIso: string,
  price: number,
  email?: string
) {
  const insforge = getAnonClient()

  // NOTE: `p_total_price` is IGNORED by the book_appointment RPC — the price is
  // computed server-side from services/staff_services so a client cannot book at
  // an arbitrary price. We still pass it only for backward signature compat.
  const params: Record<string, unknown> = {
    p_tenant_id: tenantId,
    p_staff_id: staffId,
    p_service_id: serviceId,
    p_customer_name: name,
    p_customer_phone: phone,
    p_start_time: startIso,
    p_end_time: endIso,
    p_total_price: price,
  }

  // Email is optional (used for appointment reminders). Only send the extra RPC
  // arg when the customer actually provided one — booking without an email keeps
  // using the original 8-arg signature and never depends on migration 13.
  const trimmedEmail = email?.trim()
  if (trimmedEmail) {
    params.p_customer_email = trimmedEmail
  }

  const { data, error } = await insforge.database.rpc('book_appointment', params)

  if (error) {
    return { error: error.message }
  }

  return { success: true, appointmentId: data }
}
