'use client'

import { useState, useRef } from 'react'
import { Camera, User, Mail, Award, AtSign, Loader2, X, Save, Plus } from 'lucide-react'
import { createClient } from '@insforge/sdk'

export interface StaffProfileData {
  name: string
  invite_email: string
  instagram: string
  specialty: string
  bio: string
  avatar_url: string
}

interface StaffProfileFormProps {
  initialData?: Partial<StaffProfileData>
  onSubmit: (data: StaffProfileData) => Promise<void>
  onCancel?: () => void
  isSaving: boolean
  mode: 'edit' | 'create'
}

export default function StaffProfileForm({ initialData, onSubmit, onCancel, isSaving, mode }: StaffProfileFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [inviteEmail, setInviteEmail] = useState(initialData?.invite_email || '')
  const [instagram, setInstagram] = useState(initialData?.instagram || '')
  const [specialty, setSpecialty] = useState(initialData?.specialty || '')
  const [bio, setBio] = useState(initialData?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || '')
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      let finalAvatarUrl = avatarUrl
      
      // 1. Upload new Avatar if changed
      if (avatarFile) {
        const { data, error: uploadError } = await insforge.storage
          .from('avatars')
          .uploadAuto(avatarFile)
        
        if (uploadError) throw new Error('Error al subir foto: ' + uploadError.message)
        finalAvatarUrl = data?.url || ''
      } else if (!avatarPreview) {
        // If preview was cleared
        finalAvatarUrl = ''
      }

      await onSubmit({
        name,
        invite_email: inviteEmail,
        avatar_url: finalAvatarUrl,
        instagram,
        specialty,
        bio
      })
      
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="auth-card" style={{ padding: '2.5rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '24px', width: '100%', maxWidth: 'none' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Avatar Upload Container */}
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '35px', 
                background: 'var(--color-bg-primary)', 
                border: '2px dashed var(--color-border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={32} style={{ color: 'var(--color-text-secondary)' }} />
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '4px', textAlign: 'center', fontSize: '10px', color: 'white' }}>
                {mode === 'create' ? 'Añadir Foto' : 'Cambiar Foto'}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden accept="image/*" />
            {avatarPreview && (
              <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null); setAvatarUrl('') }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '250px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {mode === 'create' ? 'Nuevo Profesional' : 'Editar Perfil'}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              {mode === 'create' ? 'Completa el perfil para destacar a tu equipo.' : 'Mantén actualizada la información del barbero.'}
            </p>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '2rem' 
        }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} /> Nombre Completo
            </label>
            <input 
              type="text" className="form-input" 
              placeholder="Ej. Juan Pérez" 
              value={name} onChange={e => setName(e.target.value)} 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: mode === 'edit' ? 0.6 : 1 }}>
              <Mail size={14} /> Correo de Invitación
            </label>
            <input 
              type="email" className="form-input" 
              placeholder="juan@ejemplo.com" 
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} 
              required={mode === 'create'}
              disabled={mode === 'edit'} // No permitir cambiar el email de invitación después (o requiere flujo más complejo)
              style={{ opacity: mode === 'edit' ? 0.6 : 1 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={14} /> Especialidad
            </label>
            <input 
              type="text" className="form-input" 
              placeholder="Ej. Experto en Degradados" 
              value={specialty} onChange={e => setSpecialty(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AtSign size={14} /> Instagram Handle
            </label>
            <input 
              type="text" className="form-input" 
              placeholder="@usuario" 
              value={instagram} onChange={e => setInstagram(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Pequeña Biografía</label>
          <textarea 
            className="form-input" 
            placeholder="Describe sus habilidades o experiencia..." 
            value={bio} onChange={e => setBio(e.target.value)}
            style={{ minHeight: '80px', paddingTop: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel} 
              style={{ 
                flex: 1, 
                height: '52px', 
                background: 'var(--color-bg-primary)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '16px', 
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-primary)'}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '52px', fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem' }} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <><Loader2 className="animate-spin" size={20} /> Guardando...</>
            ) : (
              <>
                {mode === 'create' ? <Plus size={20} /> : <Save size={20} />}
                {mode === 'create' ? 'Crear Perfil e Invitar' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
