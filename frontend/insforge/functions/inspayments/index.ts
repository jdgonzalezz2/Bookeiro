// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// inspayments — Webhook de eventos de Wompi (P1.1 C3).
//
// Wompi hace POST a esta función cuando cambia el estado de una transacción.
// Flujo:
//   1. Busca el pago por `reference` (admin client) → obtiene el negocio.
//   2. Valida la FIRMA del evento con el secreto de eventos del negocio:
//        checksum = SHA256( valores de signature.properties + timestamp + events_secret )
//      comparado contra signature.checksum (o el header X-Event-Checksum).
//   3. Si es válida: actualiza payments; si APPROVED confirma la cita (pending→
//      confirmed); si DECLINED/VOIDED/ERROR cancela la cita pendiente (libera slot).
//   4. Responde 200 SIEMPRE (Wompi reintenta ante no-2xx).
//
// El secreto de eventos jamás sale del backend. Secretos requeridos (ya existen
// del motor de recordatorios): INSFORGE_URL, INSFORGE_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────
import { createAdminClient } from 'https://esm.sh/@insforge/sdk@latest'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-event-checksum',
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Resuelve un path tipo "transaction.status" dentro del objeto data.
function resolvePath(obj: any, path: string): string {
  return String(path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj) ?? '')
}

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 })

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const baseUrl = Deno.env.get('INSFORGE_URL')
    const apiKey = Deno.env.get('INSFORGE_API_KEY')
    if (!baseUrl || !apiKey) return ok({ ignored: 'backend no configurado' })

    const evt = await req.json().catch(() => null)
    const tx = evt?.data?.transaction
    const reference: string | undefined = tx?.reference
    if (!reference) return ok({ ignored: 'sin referencia' })

    const admin = createAdminClient({ baseUrl, apiKey })

    // 1) Ubicar el pago por referencia → negocio.
    const { data: payment } = await admin.database
      .from('payments')
      .select('id, tenant_id, appointment_id, status')
      .eq('reference', reference)
      .single()
    if (!payment) return ok({ ignored: 'pago no encontrado' })

    // 2) Validar la firma con el secreto de eventos del negocio.
    const { data: secrets } = await admin.database
      .from('tenant_payment_secrets')
      .select('wompi_events_secret')
      .eq('tenant_id', payment.tenant_id)
      .single()
    const eventsSecret = secrets?.wompi_events_secret
    if (!eventsSecret) return ok({ ignored: 'negocio sin secreto de eventos' })

    const props: string[] = evt?.signature?.properties || []
    const concatenated = props.map((p) => resolvePath(evt.data, p)).join('') + String(evt.timestamp) + eventsSecret
    const expected = await sha256Hex(concatenated)
    const provided = String(evt?.signature?.checksum || req.headers.get('x-event-checksum') || '').toLowerCase()
    if (provided !== expected) {
      // Firma inválida: no tocar nada, pero responder 200 para no invitar reintentos.
      console.error(`[inspayments] Firma inválida para reference ${reference}`)
      return ok({ ignored: 'firma inválida' })
    }

    // 3) Aplicar el estado.
    const status: string = tx?.status || 'ERROR'
    await admin.database
      .from('payments')
      .update({ status, wompi_transaction_id: tx?.id ?? null, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    if (status === 'APPROVED') {
      // Confirma la cita solo si sigue pendiente (idempotente).
      await admin.database
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', payment.appointment_id)
        .eq('status', 'pending')
    } else if (status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR') {
      // Pago fallido: libera el cupo si la cita seguía pendiente.
      await admin.database
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', payment.appointment_id)
        .eq('status', 'pending')
    }

    console.log(`[inspayments] reference=${reference} status=${status} → cita ${payment.appointment_id}`)
    return ok({ success: true, reference, status })
  } catch (error: any) {
    console.error(`[inspayments] Error: ${error.message}`)
    // 200 igual: un 500 haría que Wompi reintente en bucle por un bug nuestro.
    return ok({ error: error.message })
  }
}
