'use client'

import { useState } from 'react'
import { createStaffAction } from './actions'
import StaffProfileForm, { StaffProfileData } from './StaffProfileForm'
import { Plus, X } from 'lucide-react'

export default function CreateStaffClient() {
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleCreate = async (data: StaffProfileData) => {
    setIsSaving(true)
    setSuccessMsg('')
    
    try {
      const res = await createStaffAction({
        name: data.name,
        invite_email: data.invite_email,
        avatar_url: data.avatar_url,
        instagram: data.instagram,
        specialty: data.specialty,
        bio: data.bio
      })

      if (res.success) {
        setSuccessMsg(`¡${data.name} añadido exitosamente! Se ha enviado la invitación.`)
        setShowForm(false) // Hide form on success
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        throw new Error(res.error)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '100%' }}>
      
      {!showForm ? (
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          style={{ 
            alignSelf: 'flex-start',
            padding: '1rem 2rem',
            fontSize: '1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(201,168,76,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <Plus size={22} /> Añadir Nuevo Profesional
        </button>
      ) : (
        <div style={{ animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both', position: 'relative' }}>
          <button 
            onClick={() => setShowForm(false)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              zIndex: 10,
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <X size={18} />
          </button>
          
          <StaffProfileForm 
            mode="create"
            isSaving={isSaving}
            onSubmit={handleCreate}
          />
        </div>
      )}

      {successMsg && (
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.1)', 
          border: '1px solid rgba(16, 185, 129, 0.2)', 
          color: '#10B981', 
          padding: '1rem', 
          borderRadius: 'var(--radius-lg)', 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          ✅ {successMsg}
        </div>
      )}
    </div>
  )
}
