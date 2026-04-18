'use client'

import { useState } from 'react'
import { createStaffAction } from './actions'
import { Plus } from 'lucide-react'

export default function CreateStaffClient() {
  const [name, setName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSaving(true)
    setSuccessMsg('')
    
    const res = await createStaffAction(name, inviteEmail)
    if (res.success) {
      setSuccessMsg(`¡${name} añadido! ` + (inviteEmail ? `Invitación enviada a ${inviteEmail}` : ''))
      setName('')
      setInviteEmail('')
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(''), 5000)
    } else {
      alert('Error: ' + res.error)
    }
    
    setIsSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
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

      <div className="auth-card" style={{ maxWidth: '100%', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <label className="form-label">Añadir Nuevo Profesional</label>
        <input 
          type="text" className="form-input" 
          placeholder="Nombre del Barbero" 
          value={name} onChange={e => setName(e.target.value)} 
        />
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <label className="form-label">Vincular Email (Opcional)</label>
        <input 
          type="email" className="form-input" 
          placeholder="correo@barbero.com" 
          value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} 
        />
      </div>
      <button onClick={handleAdd} className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px', display: 'flex', alignItems: 'center', gap: '0.4rem' }} disabled={isSaving || !name.trim()}>
        {isSaving ? 'Añadiendo...' : <><Plus size={16} /> Añadir</>}
      </button>
    </div>
  </div>
  )
}
