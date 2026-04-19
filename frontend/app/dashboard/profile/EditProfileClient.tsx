'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaffAction } from '../staff/actions'
import StaffProfileForm, { StaffProfileData } from '../staff/StaffProfileForm'
import { UserCircle } from 'lucide-react'

export default function EditProfileClient({ staff }: { staff: any }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleUpdate = async (data: StaffProfileData) => {
    setIsSaving(true)
    setIsSuccess(false)
    
    try {
      const res = await updateStaffAction(staff.id, {
        name: data.name,
        avatar_url: data.avatar_url,
        instagram: data.instagram,
        specialty: data.specialty,
        bio: data.bio
      })

      if (res.success) {
        setIsSuccess(true)
        setTimeout(() => {
          setIsSuccess(false)
          router.refresh()
        }, 3000)
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
    <div>
      {/* Header Summary for the employee */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.5rem', 
        marginBottom: '2.5rem',
        padding: '1.5rem',
        background: 'var(--color-bg-base)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg-base)', 
          overflow: 'hidden', border: '3px solid var(--color-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          {staff.avatar_url ? (
            <img src={staff.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
          ) : (
            <UserCircle size={40} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{staff.name}</h2>
          <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {staff.specialty || 'Profesional'}
          </div>
        </div>
      </div>

      {isSuccess && (
        <div className="alert alert-success mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <p>¡Perfil actualizado con éxito! Tus cambios ya son visibles en la vitrina.</p>
          </div>
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
        onCancel={() => router.push('/dashboard')}
      />
    </div>
  )
}
