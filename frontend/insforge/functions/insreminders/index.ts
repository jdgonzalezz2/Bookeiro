// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────────
// insreminders — Motor de recordatorios de citas por email (P1.2 v1).
//
// Invocada por un SCHEDULE de InsForge (p. ej. cada 15–30 min). En cada corrida:
//   1. Lee las citas 'confirmed' con email cuyo recordatorio 24h o 2h esté por
//      enviarse y aún no se haya enviado (idempotente vía flags en la tabla).
//   2. Envía el email vía Resend.
//   3. Marca el flag correspondiente para no duplicar.
//
// Usa createAdminClient (acceso service-role, entorno de confianza) para leer
// las citas con PII y actualizar los flags saltando RLS de forma controlada.
//
// SECRETOS/ENV requeridos (configurar con `npx @insforge/cli secrets add ...`):
//   INSFORGE_URL       URL base del proyecto (https://h4hp9j49.us-east.insforge.app)
//   INSFORGE_API_KEY   admin/API key del proyecto (ik_...). NUNCA en el frontend.
//   RESEND_API_KEY     API key de Resend (misma que usa insmessage).
//   REMINDER_SECRET    (opcional) si se define, la invocación debe traer el header
//                      `x-reminder-secret` con ese valor — evita disparos públicos.
// ─────────────────────────────────────────────────────────────────────────────
import { createAdminClient } from 'https://esm.sh/@insforge/sdk@latest'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-reminder-secret',
}

const HOUR = 60 * 60 * 1000

function fmtBogota(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota',
  }).format(d)
  const time = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
  }).format(d)
  return { date, time }
}

function reminderHtml(opts: {
  customerName: string
  tenantName: string
  serviceName: string
  staffName: string
  dateLabel: string
  timeLabel: string
  address?: string | null
  when: '24h' | '2h'
}) {
  const lead = opts.when === '2h'
    ? `Tu cita es muy pronto — en aproximadamente 2 horas.`
    : `Te recordamos que tienes una cita mañana.`
  const addressBlock = opts.address
    ? `<p style="font-size:15px;color:#444;margin:4px 0;"><strong>Dónde:</strong> ${opts.address}</p>`
    : ''
  return `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:20px auto;border:1px solid #eee;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <div style="background:#111;padding:36px 20px;text-align:center;">
        <h1 style="color:#c9a84c;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${opts.tenantName}</h1>
      </div>
      <div style="padding:44px;color:#1a1a1a;line-height:1.6;">
        <h2 style="margin-top:0;font-size:22px;font-weight:700;">¡Hola ${opts.customerName}! 👋</h2>
        <p style="font-size:16px;color:#444;">${lead}</p>
        <div style="margin:28px 0;padding:20px 24px;background:#faf8f2;border:1px solid #f0e9d6;border-radius:12px;">
          <p style="font-size:15px;color:#444;margin:4px 0;"><strong>Servicio:</strong> ${opts.serviceName}</p>
          <p style="font-size:15px;color:#444;margin:4px 0;"><strong>Con:</strong> ${opts.staffName}</p>
          <p style="font-size:15px;color:#444;margin:4px 0;"><strong>Cuándo:</strong> ${opts.dateLabel} · ${opts.timeLabel}</p>
          ${addressBlock}
        </div>
        <p style="font-size:15px;color:#444;">Si no puedes asistir, por favor avísale al negocio con tiempo. ¡Te esperamos!</p>
        <div style="margin-top:44px;padding-top:22px;border-top:1px solid #f0f0f0;">
          <p style="font-size:13px;color:#999;margin:0;">Recordatorio enviado por Bookeiro en nombre de ${opts.tenantName}.</p>
        </div>
      </div>
    </div>
  `
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Bookeiro <onboarding@resend.dev>', to: [to], subject, html }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend: ${data?.message || res.statusText}`)
  return data?.id
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Guard opcional contra disparos públicos.
    const secret = Deno.env.get('REMINDER_SECRET')
    if (secret && req.headers.get('x-reminder-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const baseUrl = Deno.env.get('INSFORGE_URL')
    const apiKey = Deno.env.get('INSFORGE_API_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!baseUrl || !apiKey) throw new Error('Faltan INSFORGE_URL / INSFORGE_API_KEY en los secretos.')
    if (!resendKey) throw new Error('Falta RESEND_API_KEY en los secretos.')

    const admin = createAdminClient({ baseUrl, apiKey })

    // Expira citas 'pending' con abono sin pagar (+15 min) y libera el slot.
    // Se reusa este schedule (cada ~15 min) para no crear uno aparte.
    try {
      await admin.database.rpc('expire_stale_pending_appointments')
    } catch (e) {
      console.error(`[insreminders] expire error: ${e?.message}`)
    }

    const now = Date.now()
    const in24h = new Date(now + 24 * HOUR).toISOString()
    const in2h = new Date(now + 2 * HOUR).toISOString()
    const nowIso = new Date(now).toISOString()

    // Traemos las citas confirmadas, futuras, con email, dentro de la ventana de
    // 24h y con AL MENOS un recordatorio pendiente. El filtrado fino (24h vs 2h)
    // se decide en JS por claridad.
    const { data: rows, error } = await admin.database
      .from('appointments')
      .select('id, customer_name, customer_email, start_time, reminder_sent_24h, reminder_sent_2h, tenants(name, address), services(name), staff(name)')
      .eq('status', 'confirmed')
      .not('customer_email', 'is', null)
      .gt('start_time', nowIso)
      .lte('start_time', in24h)
      .or('reminder_sent_24h.eq.false,reminder_sent_2h.eq.false')

    if (error) throw new Error(`DB: ${error.message}`)

    const results = { scanned: (rows || []).length, sent24h: 0, sent2h: 0, failed: 0 }

    for (const a of rows || []) {
      const startMs = new Date(a.start_time).getTime()
      const to = a.customer_email
      if (!to) continue

      // ¿Qué recordatorio corresponde ahora?
      //  2h: dentro de 2h y aún no enviado.
      //  24h: dentro de 24h pero a más de 2h, y aún no enviado.
      let when: '24h' | '2h' | null = null
      if (!a.reminder_sent_2h && startMs <= now + 2 * HOUR) {
        when = '2h'
      } else if (!a.reminder_sent_24h && startMs > now + 2 * HOUR && startMs <= now + 24 * HOUR) {
        when = '24h'
      }
      if (!when) continue

      const tenantName = a.tenants?.name || 'tu negocio'
      const { date, time } = fmtBogota(a.start_time)
      const html = reminderHtml({
        customerName: a.customer_name || 'cliente',
        tenantName,
        serviceName: a.services?.name || 'tu servicio',
        staffName: a.staff?.name || 'tu profesional',
        dateLabel: date,
        timeLabel: time,
        address: a.tenants?.address,
        when,
      })
      const subject = when === '2h'
        ? `Tu cita en ${tenantName} es hoy a las ${time}`
        : `Recordatorio: tu cita en ${tenantName}`

      try {
        await sendEmail(resendKey, to, subject, html)
        const patch = when === '2h' ? { reminder_sent_2h: true } : { reminder_sent_24h: true }
        await admin.database.from('appointments').update(patch).eq('id', a.id)
        if (when === '2h') results.sent2h++
        else results.sent24h++
      } catch (e) {
        results.failed++
        console.error(`[insreminders] Falló envío a cita ${a.id}: ${e.message}`)
      }
    }

    console.log(`[insreminders] ${JSON.stringify(results)}`)
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
}
