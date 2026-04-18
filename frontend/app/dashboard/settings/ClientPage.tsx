'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveSettingsAction, uploadImageAction, generateImageFromAIAction } from './actions'
import { Check, ChevronRight, Sparkles, Palette, ExternalLink, LayoutDashboard } from 'lucide-react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

const COLOR_PRESETS = [
  { name: 'Dorado Luxury', value: '#D4AF37', border: '#B5952F' },
  { name: 'Ónix Clásico', value: '#111111', border: '#000000' },
  { name: 'Azul Zen', value: '#2B4C59', border: '#1C313B' },
  { name: 'Esmeralda', value: '#064E3B', border: '#022C22' },
  { name: 'Púrpura Vibrant', value: '#7C3AED', border: '#5B21B6' }
]

export default function ClientPage({ tenant }: { tenant: any }) {
  const router = useRouter()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [step, setStep] = useState(1)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false)
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(tenant?.cover_image_url || '')
  
  const [formData, setFormData] = useState({
    layout_style: tenant?.layout_style || 'classic',
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

  const handleAIGeneration = async (type: 'logo' | 'cover') => {
    const setGenerating = type === 'logo' ? setIsGeneratingLogo : setIsGeneratingCover
    const setUrl = type === 'logo' ? setLogoUrl : setCoverUrl
    setGenerating(true)
    setMessage(null)

    const result = await generateImageFromAIAction(tenant.id, tenant.slug, tenant.name || 'Empresa Premium', type)

    if (result.error || !result.url) {
      setMessage({ text: `Error con IA: ` + result.error, type: 'error' })
    } else {
      setUrl(result.url)
      setMessage({ text: `¡${type === 'logo' ? 'Logo' : 'Portada'} generada exitosamente con Inteligencia Artificial! 🪄`, type: 'success' })
    }
    setGenerating(false)
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
      setShowSuccessModal(true)
    }
    setIsSaving(false)
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const STEPS = [
    { title: "Estructura", desc: "Layout de la vitrina" },
    { title: "Identidad", desc: "Logotipos e imágenes" },
    { title: "Diseño", desc: "Colores y tipografía" },
    { title: "Contacto", desc: "Redes y vitrina" }
  ]

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: step === 1 ? '800px' : '1100px', 
      margin: '0 auto', 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '2.5rem', 
      transition: 'max-width 0.3s ease' 
    }}>
      <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '2rem' }}>
          {message.text}
        </div>
      )}

      {/* -- Wizard Header -- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '24px', left: 0, right: 0, height: 2, background: 'var(--color-glass-border)', zIndex: 0 }} />
        
        {STEPS.map((s, i) => {
          const isActive = step === i + 1
          const isCompleted = step > i + 1
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '0.75rem', width: '25%', position: 'relative' }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'var(--color-primary)' : isCompleted ? 'var(--color-primary-light)' : 'var(--color-glass)',
                color: isActive || isCompleted ? '#FFF' : 'var(--color-text-muted)',
                fontWeight: 600, border: isActive ? 'none' : `1px solid ${isCompleted ? 'var(--color-primary)' : 'var(--color-border)'}`,
                boxShadow: isActive ? '0 0 0 4px rgba(201, 168, 76, 0.15)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isCompleted ? <Check size={20} /> : i + 1}
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                  {s.title}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>

        {/* -- Sección 1: Estructura -- */}
        {step === 1 && (
          <div className="settings-section-card" style={{ animation: 'fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Estructura Visuál (Layout)</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Selecciona cómo quieres que se distribuya el contenido en tu portal interactivo. Podrás cambiar esto cuando quieras.</p>

            <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {/* LAYOUT CLASICO */}
              <button type="button" onClick={() => setFormData(prev => ({...prev, layout_style: 'classic'}))} style={{ textAlign: 'left', background: 'var(--color-bg-surface)', border: formData.layout_style === 'classic' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: formData.layout_style === 'classic' ? 1 : 0.7 }}>
                <div style={{ width: '100%', height: 110, background: '#1C1917', borderRadius: '6px', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    {/* Cover Photo */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: '#292524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1rem', opacity: 0.5 }}>📷</span>
                    </div>
                    {/* Logo */}
                    <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid #1C1917', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12px' }}>✂️</span>
                    </div>
                    {/* Content below */}
                    <div style={{ position: 'absolute', top: '75%', left: '15%', right: '15%', height: '4px', background: '#D4AF37', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', top: '85%', left: '35%', right: '35%', height: '3px', background: '#e5e7eb', borderRadius: '2px', opacity: 0.5 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>Página Clásica</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>Impactante. Una fotografía gigante en la parte superior, tipo portada de revista de moda.</p>
                </div>
              </button>

              {/* LAYOUT SPLIT */}
              <button type="button" onClick={() => setFormData(prev => ({...prev, layout_style: 'split'}))} style={{ textAlign: 'left', background: 'var(--color-bg-surface)', border: formData.layout_style === 'split' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: formData.layout_style === 'split' ? 1 : 0.7 }}>
                <div style={{ width: '100%', height: 110, background: '#1C1917', borderRadius: '6px', display: 'flex', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <div style={{ width: '45%', height: '100%', background: '#292524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1rem', opacity: 0.5 }}>📷</span>
                    </div>
                    <div style={{ width: '55%', height: '100%', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', background: '#FAFAF9' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '8px' }}>✂️</span></div>
                      <div style={{ width: '80%', height: '5px', background: '#444', borderRadius: '2px' }} />
                      <div style={{ width: '50%', height: '4px', background: '#ccc', borderRadius: '2px' }} />
                      <div style={{ width: '100%', height: '12px', background: 'var(--color-primary)', borderRadius: '2px', marginTop: '4px' }} />
                    </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>Página Dividida</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>Moderna y elegante. Mitad de pantalla para imagen y mitad para que reserven rápido.</p>
                </div>
              </button>

              {/* LAYOUT MINIMAL */}
              <button type="button" onClick={() => setFormData(prev => ({...prev, layout_style: 'minimal'}))} style={{ textAlign: 'left', background: 'var(--color-bg-surface)', border: formData.layout_style === 'minimal' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: formData.layout_style === 'minimal' ? 1 : 0.7 }}>
                <div style={{ width: '100%', height: 110, background: '#FAFAF9', borderRadius: '6px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <div style={{ height: '35%', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div style={{ width: '30px', height: '4px', background: '#1C1917', borderRadius: '2px' }} />
                      </div>
                      <div style={{ width: '20px', height: '4px', background: '#ccc', borderRadius: '2px' }} />
                    </div>
                    <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '60%', height: '6px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                      <div style={{ width: '80%', height: '4px', background: '#ccc', borderRadius: '2px' }} />
                      <div style={{ width: '40%', height: '4px', background: '#ccc', borderRadius: '2px' }} />
                    </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' }}>Página Directa</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>Sin foto de portada. Muy directa enfocada estrictamente en mostrar los servicios.</p>
                </div>
              </button>
            </div>
          </div>
        )}
        
        {/* -- Sección 2: Imágenes (Antiguo 1) -- */}
        {step === 2 && (
          <div className="settings-section-card" style={{ animation: 'fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Imágenes de Marca</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Sube el logotipo de tu barbería y una foto de portada de alta calidad que se verá en la cabecera de tu página pública.</p>

            <div className="settings-grid">
              {/* Logo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Logotipo (Perfil)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: 72, height: 72, borderRadius: '50%', background: 'var(--color-glass)', border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                    }}>
                      {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem' }}>✂️</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo || isUploadingCover || isGeneratingLogo || isGeneratingCover} className="form-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }} />
                      {isUploadingLogo && <small style={{ color: 'var(--color-primary)', display: 'block', marginTop: '4px' }}>Subiendo...</small>}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <button type="button" onClick={() => handleAIGeneration('logo')} disabled={isGeneratingLogo || isUploadingLogo} style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px dashed var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Sparkles size={16} /> {isGeneratingLogo ? 'Generando magia...' : 'Generar Logo con DALL-E'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Portada (Condicional) */}
              {formData.layout_style === 'minimal' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Foto de Portada</label>
                  <div style={{ background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>🚫</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>El estilo de página <strong>Directa/Minimalista</strong> no utiliza portadas masivas. Solo mantén tu logotipo arriba.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Foto de Portada</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ 
                      width: '100%', height: 72, borderRadius: 'var(--radius-md)', background: 'var(--color-glass)',
                      border: '1px solid var(--color-border)', overflow: 'hidden'
                    }}>
                      {coverUrl ? <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem'}}>Sin portada</div>}
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} disabled={isUploadingCover || isUploadingLogo || isGeneratingLogo || isGeneratingCover} className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }} />
                      {isUploadingCover && <small style={{ color: 'var(--color-primary)', display: 'block', marginTop: '4px' }}>Subiendo...</small>}
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                      <button type="button" onClick={() => handleAIGeneration('cover')} disabled={isGeneratingCover || isUploadingCover} style={{ width: '100%', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px dashed var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Sparkles size={16} /> {isGeneratingCover ? 'Generando panorama...' : 'Generar Portada con IA'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- Sección 3: Apariencia (Antiguo 2) -- */}
        {step === 3 && (
          <div className="settings-section-card" style={{ animation: 'fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Aspecto Visual</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Define los colores corporativos y la tipografía para que el portal coincida con tu marca.</p>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Palette size={18}/> Paleta de Color Principal</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
                {COLOR_PRESETS.map((preset) => (
                  <button 
                    key={preset.value} 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, primary_color: preset.value }))}
                    style={{ 
                      display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', 
                      background: 'none', border: 'none', cursor: 'pointer', opacity: formData.primary_color === preset.value ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: preset.value, border: `2px solid ${preset.border}`, transform: formData.primary_color === preset.value ? 'scale(1.15)' : 'scale(1)', boxShadow: formData.primary_color === preset.value ? `0 0 15px ${preset.value}66` : 'none' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: formData.primary_color === preset.value ? 600 : 400, color: 'var(--color-text-primary)' }}>{preset.name}</span>
                  </button>
                ))}
                
                {/* Selector Custom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', paddingLeft: '1rem', borderLeft: '1px solid var(--color-border)' }}>
                  <input type="color" name="primary_color" value={formData.primary_color} onChange={handleTextChange} style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Personalizado</span>
                </div>
              </div>
            </div>

            <div className="settings-grid">
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
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, theme: 'light' }))} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', background: '#FAFAF9', border: formData.theme === 'light' ? '2px solid var(--color-primary)' : '1px solid #E7E5E4', color: '#1C1917', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    Claro
                  </button>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, theme: 'dark' }))} style={{ flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', background: '#111827', border: formData.theme === 'dark' ? '2px solid var(--color-primary)' : '1px solid #374151', color: '#F9FAFB', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    Oscuro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -- Sección 4: Contacto (Antiguo 3) -- */}
        {step === 4 && (
          <div className="settings-section-card" style={{ animation: 'fade-in 0.3s ease' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Perfil Público y Redes</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Información vital para que tus clientes te encuentren, sepan qué servicios ofreces y descubran cómo llegar a ti.</p>

            <div className="form-group">
              <label className="form-label">Slogan o Biografía</label>
              <textarea name="description" value={formData.description} onChange={handleTextChange} className="form-input" placeholder="Ej: La mejor experiencia clásica de barbería en tu ciudad..." rows={3} />
            </div>

            <div className="form-group">
              <label className="form-label">Etiquetas del Negocio</label>
              <input type="text" name="tags" value={formData.tags} onChange={handleTextChange} className="form-input" placeholder="Ej: Salón de belleza, Barbería Clásica, Spa de Uñas" />
              <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '6px' }}>Múltiples etiquetas separadas por comas.</small>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-glass-border)', margin: '1rem 0' }} />

            <div className="settings-grid">
              <div className="form-group">
                <label className="form-label">Dirección (Local)</label>
                <input type="text" name="address" value={formData.address} onChange={handleTextChange} className="form-input" placeholder="Ej: Av. Principal 123..." />
              </div>
              <div className="form-group">
                <label className="form-label">Link Mapa (Google/Waze)</label>
                <input type="url" name="map_url" value={formData.map_url} onChange={handleTextChange} className="form-input" placeholder="https://maps.app.goo.gl/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Perfil de Instagram</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <span style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}>@</span>
                  <input type="text" name="instagram" value={formData.instagram} onChange={handleTextChange} placeholder="tubarberia" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0.75rem', color: 'var(--color-text-primary)' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Línea WhatsApp</label>
                <PhoneInput
                  country={'co'}
                  value={formData.whatsapp}
                  onChange={(phone) => setFormData(prev => ({ ...prev, whatsapp: phone }))}
                  containerClass="phone-input-container phone-input-dashboard"
                  buttonClass="phone-input-button"
                  inputClass="phone-input-field"
                  disableDropdown={false}
                  countryCodeEditable={false}
                  enableSearch={true}
                  searchPlaceholder="Buscar país..."
                />
              </div>
            </div>
          </div>
        )}

        {/* -- Controles de Navegación del Asistente -- */}
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handlePrev} 
            disabled={step === 1 || isSaving}
            style={{ opacity: step === 1 ? 0 : 1, transition: 'opacity 0.2s', padding: '0.75rem 1.5rem', fontWeight: 600 }}
          >
            ← Volver
          </button>
          
          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontWeight: 600 }}>
              Siguiente Paso <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={handleSaveAll} className="btn btn-primary" disabled={isSaving} style={{ padding: '0.75rem 2rem', fontWeight: 600, background: 'var(--color-text-primary)', color: 'var(--color-bg-base)' }}>
              {isSaving ? 'Guardando...' : 'Guardar y Finalizar'}
            </button>
          )}
        </div>

      </form>
      </div>

      {/* -- Live Preview -- */}
      {step >= 2 && (
        <div style={{ flex: '1 1 350px', position: 'sticky', top: '1rem', height: 'fit-content' }}>
          <LivePreview formData={formData} logoUrl={logoUrl} coverUrl={coverUrl} tenantName={tenant?.name || 'Mi Negocio'} tenantSlug={tenant?.slug || 'minegocio'} />
        </div>
      )}

      {/* -- Modal de Éxito -- */}
      {showSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-in 0.2s ease' }}>
          <div style={{ background: 'var(--color-bg-base)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', width: '90%', maxWidth: 450, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ width: 64, height: 64, background: '#10B981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Check size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>¡Portal Publicado!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              Tu configuración ha sido guardada con éxito. Ya puedes ver cómo luce en vivo o volver a tu panel principal.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href={`/${tenant.slug}`} target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--color-primary)', color: '#fff', padding: '0.875rem', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={18} /> Ver mi página pública
              </Link>
              <button type="button" onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '0.875rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                <LayoutDashboard size={18} /> Volver al Dashboard
              </button>
              <button type="button" onClick={() => setShowSuccessModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', padding: '0.5rem', marginTop: '0.5rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                Cerrar y seguir editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LivePreview({ formData, logoUrl, coverUrl, tenantName, tenantSlug }: { formData: any, logoUrl: string, coverUrl: string, tenantName: string, tenantSlug: string }) {
  const isDark = formData.theme === 'dark'
  const bgColor = isDark ? '#111827' : '#FFFFFF'
  const textColor = isDark ? '#F9FAFB' : '#111827'
  const subtextColor = isDark ? '#9CA3AF' : '#6B7280'
  const cardBg = isDark ? '#1F2937' : '#F3F4F6'
  
  const coverBg = coverUrl ? `url(${coverUrl})` : `linear-gradient(135deg, ${formData.primary_color}88, ${isDark ? '#000' : '#ddd'})`
  
  const renderTags = () => {
    let tagsList = []
    if (typeof formData.tags === 'string') {
        tagsList = formData.tags.split(',').map((t: string) => t.trim()).filter((t:string)=>t)
    } else if (Array.isArray(formData.tags)) {
        tagsList = formData.tags
    }
    return tagsList.slice(0, 3).map((tag: string, i: number) => (
      <span key={i} style={{ padding: '0.2rem 0.6rem', background: cardBg, borderRadius: '999px', fontSize: '0.65rem', border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}` }}>
        {tag}
      </span>
    ))
  }

  const LogoEl = ({ size = 64 }: { size?: number}) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: logoUrl ? '#fff' : formData.primary_color, border: `2px solid ${bgColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: size/2 }}>✂️</span>}
    </div>
  )

  const InfoEl = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: formData.font_family === 'Inter' ? 'inherit' : formData.font_family }}>{tenantName}</h3>
      <p style={{ fontSize: '0.75rem', color: subtextColor, lineHeight: 1.4, margin: 0 }}>
        {formData.description || 'La experiencia que mereces, un servicio exclusivo.'}
      </p>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {renderTags()}
      </div>
    </div>
  )

  const ServiceCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
      {[1, 2].map(i => (
        <div key={i} style={{ padding: '0.75rem', background: cardBg, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}` }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Servicio Ejemplo {i}</div>
              <div style={{ fontSize: '0.65rem', color: subtextColor }}>45 min • Premium</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span style={{ fontSize: '0.8rem', fontWeight: 600, color: formData.primary_color }}>$20.00</span>
               <div style={{ width: 24, height: 24, borderRadius: '4px', background: formData.primary_color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>+</div>
            </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ 
      width: '100%', 
      background: 'var(--color-bg-surface)', 
      border: '1px solid var(--color-border)', 
      borderRadius: 'var(--radius-lg)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      animation: 'fade-in 0.4s ease'
    }}>
      {/* Fake Browser Header */}
      <div style={{ padding: '0.5rem 1rem', background: 'var(--color-glass)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
        <a href={`/${tenantSlug}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '1rem', flex: 1, height: 20, background: 'var(--color-bg-base)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--color-text-muted)', textDecoration: 'none', cursor: 'pointer' }}>
          bookeiro.com/{tenantSlug} <ExternalLink size={10} />
        </a>
      </div>

      {/* Viewport */}
      <div style={{ 
        height: 500, 
        background: bgColor, 
        color: textColor, 
        fontFamily: formData.font_family === 'Inter' ? `var(--font-sans)` : `"${formData.font_family}", sans-serif`,
        overflowY: 'auto'
      }}>
        
        {formData.layout_style === 'classic' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 160, backgroundImage: coverBg, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ marginTop: -32, marginBottom: '1rem' }}><LogoEl size={64} /></div>
              <InfoEl />
              <ServiceCards />
            </div>
          </div>
        )}

        {formData.layout_style === 'split' && (
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ width: '40%', backgroundImage: coverBg, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 500 }} />
            <div style={{ width: '60%', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1rem' }}><LogoEl size={48} /></div>
              <InfoEl />
              <ServiceCards />
            </div>
          </div>
        )}

        {formData.layout_style === 'minimal' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <LogoEl size={40} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{tenantName}</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <InfoEl />
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Nuestros Servicios</h4>
                <ServiceCards />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
