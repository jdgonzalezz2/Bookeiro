// @ts-nocheck
import { createClient } from 'https://esm.sh/@insforge/sdk@latest'

// CORS Headers for client-side invocation
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async function handler(req: Request) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, payload } = await req.json()

    // ── Logic for Staff Invitations ──
    if (type === 'staff_invite') {
      const { email, staffName, tenantName } = payload
      
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: #111; padding: 40px 20px; text-align: center;">
            <h1 style="color: #c9a84c; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Bookeiro</h1>
          </div>
          <div style="padding: 48px; color: #1a1a1a; line-height: 1.6;">
            <h2 style="margin-top: 0; font-size: 24px; font-weight: 700;">¡Hola ${staffName}! 👋</h2>
            <p style="font-size: 16px; color: #444;">Has sido invitado a unirte al equipo de <strong style="color: #111;">${tenantName}</strong> en Bookeiro.</p>
            <p style="font-size: 16px; color: #444;">A partir de ahora podrás gestionar tu agenda, ver tus citas y controlar tu disponibilidad desde tu panel personal.</p>
            
            <div style="margin: 40px 0; text-align: center;">
              <a href="https://bookeiro.com/login" style="background: #c9a84c; color: #000; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(201, 168, 76, 0.2);">
                Aceptar Invitación e Ir a mi Panel
              </a>
            </div>
            
            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f0f0f0;">
              <p style="font-size: 14px; color: #888; margin: 0;">
                Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
              </p>
            </div>
          </div>
        </div>
      `;

      console.log(`[InsMessage] Iniciando envío real a: ${email}`)
      
      const apiKey = Deno.env.get('RESEND_API_KEY')
      
      if (!apiKey) {
        throw new Error('Servicio no configurado: Falta RESEND_API_KEY en los secretos.')
      }

      // Enviar el correo usando la API de Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Bookeiro <onboarding@resend.dev>', // Email por defecto de prueba de Resend
          to: [email],
          subject: `¡Has sido invitado a unirte a ${tenantName}!`,
          html: emailHtml
        })
      })

      const resData = await res.json()
      
      if (!res.ok) {
        throw new Error(`Error en Resend: ${resData.message || res.statusText}`)
      }

      console.log(`[InsMessage] Email enviado con éxito. ID: ${resData.id}`)
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Invitación enviada correctamente a ${email}`,
        id: resData.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({ error: 'Tipo de mensaje no soportado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}
