'use client'

import { useState } from 'react'
import { updateStaffAction } from '../actions'
import StaffProfileForm, { StaffProfileData } from '../StaffProfileForm'

interface EditStaffProfileClientProps {
  staff: any
}

export default function EditStaffProfileClient({ staff }: EditStaffProfileClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleUpdate = async (data: StaffProfileData) => {
    setIsSaving(true)
    setSuccessMsg('')
    
    try {
      const res = await updateStaffAction(staff.id, {
        name: data.name,
        avatar_url: data.avatar_url,
        instagram: data.instagram,
        specialty: data.specialty,
        bio: data.bio
      })

      if (res.success) {
        setSuccessMsg('¡Perfil actualizado correctamente!')
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

      <StaffProfileForm 
        mode="edit"
        initialData={{
          name: staff.name,
          invite_email: staff.invite_email || '',
          avatar_url: staff.avatar_url || '',
          instagram: staff.instagram || '',
          specialty: staff.specialty || '',
          bio: staff.bio || ''
        }}
        isSaving={isSaving}
        onSubmit={handleUpdate}
      />
    </div>
  )
}
