'use client'

import { useState } from 'react'
import { createStaffAction } from './actions'

export default function CreateStaffClient() {
  const [name, setName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setIsSaving(true)
    
    const res = await createStaffAction(name, inviteEmail)
    if (res.success) {
      setName('')
      setInviteEmail('')
    } else {
      alert('Error: ' + res.error)
    }
    
    setIsSaving(false)
  }

  return (
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
      <button onClick={handleAdd} className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px' }} disabled={isSaving || !name.trim()}>
        {isSaving ? 'Añadiendo...' : 'Añadir ➕'}
      </button>
    </div>
  )
}
