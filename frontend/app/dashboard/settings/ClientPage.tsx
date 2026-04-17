'use client'

import { useState } from 'react'
import { saveSettingsAction, uploadImageAction } from './actions'

export default function ClientPage({ tenant }: { tenant: any }) {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(tenant?.cover_image_url || '')
  
  const [formData, setFormData] = useState({
    primary_color: tenant?.primary_color || '#D4AF37',
    font_family: tenant?.font_family || 'Inter',
    theme: tenant?.theme || 'light',
    description: tenant?.description || '',
    tags: (tenant?.tags || []).join(', '),
    map_url: tenant?.map_url || '',
    instagram: tenant?.instagram || '',
    whatsapp: tenant?.whatsapp || '',
    address: tenant?.address || '',
  })

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>, 
    type: 'logo' | 'cover'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover
    const setUrl = type === 'logo' ? setLogoUrl : setCoverUrl
    const dbField = type === 'logo' ? 'logo_url' : 'cover_image_url'

    setUploading(true)
    setMessage(null)

    const fd = new FormData()
    fd.append('file', file)

    const result = await uploadImageAction(tenant.slug, type, fd)

    if (result.error || !result.url) {
      setMessage({ text: `Error al subir ${type}: ` + result.error, type: 'error' })
      setUploading(false)
      return
    }

    // Auto-save the image so they don't lose it if they reload
    await saveSettingsAction(tenant.id, { [dbField]: result.url })

    setUrl(result.url)
    setMessage({ text: `¡${type === 'logo' ? 'Logo' : 'Portada'} subida y guardada exitosamente!`, type: 'success' })
    setUploading(false)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    // Process comma separated tags into an array
    const processedTags = formData.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)

    const payload = {
      ...formData,
      tags: processedTags
    }

    const result = await saveSettingsAction(tenant.id, payload)

    if (result.error) {
      setMessage({ text: 'Error al guardar configuración: ' + result.error, type: 'error' })
    } else {
      setMessage({ text: '✅ Todos los cambios guardados correctamente.', type: 'success' })
    }
    setIsSaving(false)
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      {/* ── Subidas Visuales Instant ── */}
      <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
        <h2 className="auth-card-title" style={{ fontSize: '1.25rem' }}>Imágenes de Marca</h2>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          
          {/* Logo */}
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label">Logotipo (Perfil)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ 
                width: 80, height: 80, borderRadius: '50%', background: 'var(--color-glass)',
                border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
              }}>
                {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '✂️'}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo || isUploadingCover} style={{ fontSize: '0.8rem', width: '100%' }} />
                {isUploadingLogo && <small style={{ color: 'var(--color-primary)' }}>Subiendo...</small>}
              </div>
            </div>
          </div>

          {/* Portada */}
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label">Foto de Portada (Banner)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ 
                width: '100%', height: 80, borderRadius: 'var(--radius-md)', background: 'var(--color-glass)',
                border: '1px solid var(--color-border)', overflow: 'hidden'
              }}>
                {coverUrl ? <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem'}}>Sin portada</div>}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} disabled={isUploadingCover || isUploadingLogo} style={{ fontSize: '0.8rem', width: '100%' }} />
                {isUploadingCover && <small style={{ color: 'var(--color-primary)' }}>Subiendo...</small>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Formulario Completo ── */}
      <form onSubmit={handleSaveAll} className="auth-card" style={{ maxWidth: '100%' }}>
        <h2 className="auth-card-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Diseño y Contacto</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label">Color Principal</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input 
                type="color" 
                name="primary_color" 
                value={formData.primary_color} 
                onChange={handleTextChange} 
                style={{ width: 50, height: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'monospace' }}>{formData.primary_color}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tipografía Global</label>
            <select name="font_family" value={formData.font_family} onChange={handleTextChange} className="form-input">
              <option value="Inter">Inter (Moderna/SaaS)</option>
              <option value="Playfair Display">Playfair Display (Clásica/Elegante)</option>
              <option value="Space Grotesk">Space Grotesk (Urbana/Técnica)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tema del Portal Público</label>
            <select name="theme" value={formData.theme} onChange={handleTextChange} className="form-input">
              <option value="light">Storefront Luminoso (Claro - Recomendado)</option>
              <option value="dark">Storefront Oscuro (Nocturno)</option>
            </select>
          </div>

        </div>

        <div className="form-group">
          <label className="form-label">Descripción / Slogan (Bio)</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleTextChange} 
            className="form-input" 
            placeholder="La mejor experiencia clásica de barbería en tu ciudad..."
            rows={3}
          />
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label className="form-label">Etiquetas del Negocio (Separadas por coma)</label>
          <input 
            type="text"
            name="tags" 
            value={formData.tags} 
            onChange={handleTextChange} 
            className="form-input" 
            placeholder="Ej: Salón de belleza, Barbería Clásica, Spa de Uñas"
          />
          <small style={{ color: 'var(--color-text-muted)' }}>Estas aparecerán como tarjetas redondeadas en la cabecera de la vitrina.</small>
        </div>

        <div style={{ marginTop: '2rem', marginBottom: '1rem', borderTop: '1px solid var(--color-glass-border)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>Ubicación y Redes</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Dirección Escrita</label>
            <input type="text" name="address" value={formData.address} onChange={handleTextChange} className="form-input" placeholder="Calle 123..." />
          </div>
          <div className="form-group">
            <label className="form-label">Link de Google Maps / Waze</label>
            <input type="url" name="map_url" value={formData.map_url} onChange={handleTextChange} className="form-input" placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div className="form-group">
            <label className="form-label">Instagram (Usuario o Link)</label>
            <input type="text" name="instagram" value={formData.instagram} onChange={handleTextChange} className="form-input" placeholder="@tubarberia" />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp (Número con Código País)</label>
            <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleTextChange} className="form-input" placeholder="573001234567" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Cambios de Diseño y Contacto'}
        </button>
      </form>
    </div>
  )
}
