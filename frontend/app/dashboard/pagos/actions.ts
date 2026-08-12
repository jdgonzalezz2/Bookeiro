'use server'

import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { getCurrentProfile } from '@/lib/auth'

export interface PaymentSettingsInput {
  deposit_enabled: boolean
  deposit_percent: number
  is_sandbox: boolean
  wompi_public_key: string
  wompi_integrity_secret?: string
  wompi_events_secret?: string
}

/**
 * Guarda la configuración de pagos Wompi del negocio.
 * - Los flags no sensibles (deposit_enabled/percent) van a tenants.
 * - Las llaves van a tenant_payment_secrets (RLS solo-dueño). Los secretos
 *   (integrity/events) solo se actualizan si llegan no vacíos, para no borrarlos
 *   cuando el dueño guarda sin re-escribirlos.
 * El tenant se deriva de la SESIÓN (nunca del cliente).
 */
export async function savePaymentSettingsAction(input: PaymentSettingsInput) {
  try {
    const profile = await getCurrentProfile()
    if (!profile || profile.role !== 'owner' || !profile.tenant_id) {
      return { error: 'No autorizado.' }
    }

    const token = await getAccessToken()
    const insforge = createInsForgeServerClient(token)
    const tenantId = profile.tenant_id

    const percent = Math.round(Number(input.deposit_percent))
    if (input.deposit_enabled) {
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        return { error: 'El porcentaje de abono debe estar entre 1 y 100.' }
      }
      if (!input.wompi_public_key?.trim()) {
        return { error: 'Para cobrar abonos necesitas la llave pública de Wompi.' }
      }
    }

    // 1) Flags no sensibles en tenants.
    const { error: tErr } = await insforge.database
      .from('tenants')
      .update({
        deposit_enabled: input.deposit_enabled,
        deposit_percent: Number.isFinite(percent) && percent >= 1 && percent <= 100 ? percent : 50,
      })
      .eq('id', tenantId)
    if (tErr) return { error: tErr.message }

    // 2) Secretos (upsert manual; los secretos solo se tocan si vienen no vacíos).
    const secretPatch: Record<string, unknown> = {
      wompi_public_key: input.wompi_public_key?.trim() || null,
      is_sandbox: input.is_sandbox,
      updated_at: new Date().toISOString(),
    }
    const integ = input.wompi_integrity_secret?.trim()
    if (integ) secretPatch.wompi_integrity_secret = integ
    const evt = input.wompi_events_secret?.trim()
    if (evt) secretPatch.wompi_events_secret = evt

    const { data: existing } = await insforge.database
      .from('tenant_payment_secrets')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .single()

    if (existing) {
      const { error: sErr } = await insforge.database
        .from('tenant_payment_secrets')
        .update(secretPatch)
        .eq('tenant_id', tenantId)
      if (sErr) return { error: sErr.message }
    } else {
      const { error: sErr } = await insforge.database
        .from('tenant_payment_secrets')
        .insert([{ tenant_id: tenantId, ...secretPatch }])
      if (sErr) return { error: sErr.message }
    }

    return { success: true }
  } catch {
    return { error: 'Error inesperado al guardar la configuración de pagos.' }
  }
}
