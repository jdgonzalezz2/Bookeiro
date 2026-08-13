'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteServiceAction } from './actions'

interface DeleteServiceButtonProps {
  serviceId: string
  serviceName: string
}

export default function DeleteServiceButton({ serviceId, serviceName }: DeleteServiceButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${serviceName}"?\n\nEsta acción no se puede deshacer.`)
    if (!confirmed) return

    setLoading(true)
    const res = await deleteServiceAction(serviceId)
    if (!res.success) {
      alert(`Error al eliminar: ${res.error}`)
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-ghost" 
      style={{ 
        color: 'var(--color-error)',
        padding: '0.6rem',
        minWidth: 'auto',
        borderRadius: '12px',
        opacity: loading ? 0.5 : 1
      }}
      title="Eliminar servicio"
    >
      <Trash2 size={18} />
    </button>
  )
}
