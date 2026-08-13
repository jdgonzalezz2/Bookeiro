'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteStaffAction } from './actions'

interface DeleteStaffButtonProps {
  staffId: string
  staffName: string
}

export default function DeleteStaffButton({ staffId, staffName }: DeleteStaffButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres borrar a "${staffName}" permanentemente?\n\n¡ADVERTENCIA! Se borrarán también todas sus citas históricas y horarios.`
    )
    
    if (!confirmed) return

    setLoading(true)
    try {
      const result = await deleteStaffAction(staffId)
      if (result.error) {
        alert(`Error al borrar: ${result.error}`)
      } else {
        // revalidatePath handles UI update, but alert might be nice for confirmation
        // alert('Profesional borrado con éxito.')
      }
    } catch (err) {
      alert('Error inesperado al intentar borrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-ghost"
      style={{ 
        padding: '0.6rem', 
        minWidth: 'auto', 
        borderRadius: '12px', 
        color: 'var(--color-error)',
        background: 'rgba(192, 90, 62, 0.06)',
        border: '1px solid rgba(192, 90, 62, 0.14)',
        opacity: loading ? 0.5 : 1
      }}
      title="Borrar profesional permanentemente"
    >
      <Trash2 size={18} />
    </button>
  )
}
