'use server'

import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'

export async function saveSettingsAction(tenantId: string, data: any) {
  const accessToken = await getAccessToken()
  if (!accessToken) return { error: 'No tienes sesión activa.' }

  const insforge = createInsForgeServerClient(accessToken)
  
  const { error } = await insforge.database
    .from('tenants')
    .update(data)
    .eq('id', tenantId)

  if (error) {
    return { error: error.message }
  }
  return { success: true }
}

export async function uploadImageAction(tenantSlug: string, type: 'logo' | 'cover', formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: 'No se envió ningún archivo.' }

  const accessToken = await getAccessToken()
  if (!accessToken) return { error: 'No autorizado.' }
  
  const insforge = createInsForgeServerClient(accessToken)

  const fileExt = file.name.split('.').pop()
  const fileName = `${tenantSlug}-${type}-${Math.random()}.${fileExt}`
  const filePath = `images/${fileName}`

  const { error: uploadError } = await insforge.storage
    .from('tenant_assets')
    .upload(filePath, file)

  if (uploadError) {
    return { error: uploadError.message }
  }

  const urlResponse = insforge.storage.from('tenant_assets').getPublicUrl(filePath) as any
  const newUrl = urlResponse?.data?.publicUrl || urlResponse?.publicUrl || urlResponse
  
  return { url: newUrl }
}

export async function generateImageFromAIAction(tenantId: string, tenantSlug: string, businessName: string, type: 'logo' | 'cover') {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { error: 'La llave de OpenAI (OPENAI_API_KEY) no está configurada en .env.local' }
  }

  const prompt = type === 'logo'
    ? `An elegant, minimalist, and premium abstract logotype for a high-end beauty salon or barbershop named "${businessName}". The design should be clean, modern, flat vector style, placed on a transparent or clean dark/light background. No text, only the iconic symbol.`
    : `A stunning, high quality, cinematic and elegant background cover photo for a premium salon or barbershop named "${businessName}". Soft lighting, luxurious textures, modern interior design feel, blur or bokeh effect. Beautiful architectural aesthetics.`

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      })
    })

    if (!aiResponse.ok) {
        const errObj = await aiResponse.json()
        return { error: 'Error generando imagen con IA: ' + (errObj?.error?.message || aiResponse.statusText) }
    }

    const data = await aiResponse.json()
    const base64 = data.data[0].b64_json

    // Convert B64 to Blob
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/png' })

    const accessToken = await getAccessToken()
    if (!accessToken) return { error: 'No autorizado para subir al storage.' }
    const insforge = createInsForgeServerClient(accessToken)

    const fileName = `${tenantSlug}-${type}-ai-${Math.random()}.png`
    const filePath = `images/${fileName}`

    const { error: uploadError } = await insforge.storage
      .from('tenant_assets')
      .upload(filePath, blob as any, { contentType: 'image/png' })

    if (uploadError) {
      return { error: 'Se generó la imagen pero falló su guardado: ' + uploadError.message }
    }

    const urlResponse = insforge.storage.from('tenant_assets').getPublicUrl(filePath) as any
    const finalUrl = urlResponse?.data?.publicUrl || urlResponse?.publicUrl || urlResponse

    // Automatically update the tenant record
    const dbField = type === 'logo' ? 'logo_url' : 'cover_image_url'
    await insforge.database.from('tenants').update({ [dbField]: finalUrl }).eq('id', tenantId)

    return { url: finalUrl }
  } catch (err: any) {
    return { error: 'Error del servidor durante la generación: ' + err.message }
  }
}
