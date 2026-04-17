'use client'

import { useState } from 'react'
import { saveWorkingHoursAction } from '../actions'
import { Save, CheckCircle2 } from 'lucide-react'

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
]

export default function HorariosClient({ staffId, initialHours }: { staffId: string, initialHours: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null)

  // Initialize state with default 09:00 - 18:00 if not set
  const [schedule, setSchedule] = useState(() => {
    const map = new Map(initialHours.map(h => [h.day_of_week, h]))
    return DAYS.map(d => {
      const existing = map.get(d.id)
      return {
        day_of_week: d.id,
        is_active: existing ? existing.is_active : false,
        start_time: existing ? existing.start_time.substring(0, 5) : '09:00', // slice '09:00:00' to '09:00'
        end_time: existing ? existing.end_time.substring(0, 5) : '18:00'
      }
    })
  })

  const handleChange = (index: number, field: string, value: any) => {
    const newSchedule = [...schedule]
    newSchedule[index] = { ...newSchedule[index], [field]: value }
    setSchedule(newSchedule)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    // Solo mandamos los activos a la DB para limpieza
    const activeHours = schedule.filter(s => s.is_active).map(s => ({
      ...s,
      start_time: s.start_time + ':00', // DB reqs HH:MM:SS
      end_time: s.end_time + ':00'
    }))

    const result = await saveWorkingHoursAction(staffId, activeHours)
    if (result.success) {
      setMessage({ text: 'Horarios guardados con éxito. Tu motor de reservas ya tiene en cuenta estas franjas.', type: 'success' })
    } else {
      setMessage({ text: 'Error: ' + result.error, type: 'error' })
    }
    setIsSaving(false)
  }

  return (
    <div className="auth-card" style={{ maxWidth: '100%' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Disponibilidad por Día</h2>
      
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {message.type === 'success' && <CheckCircle2 size={18} />}
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        {schedule.map((day, idx) => (
          <div key={day.day_of_week} style={{ 
            display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', 
            background: day.is_active ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255,255,255,0.02)', 
            border: day.is_active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            
            <div style={{ width: '120px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: day.is_active ? 600 : 400, color: day.is_active ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                <input 
                  type="checkbox" 
                  checked={day.is_active} 
                  onChange={(e) => handleChange(idx, 'is_active', e.target.checked)}
                  style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--color-primary)' }}
                />
                {DAYS.find(d => d.id === day.day_of_week)?.name}
              </label>
            </div>

            {day.is_active ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Entrada</label>
                  <input 
                    type="time" 
                    value={day.start_time} 
                    onChange={(e) => handleChange(idx, 'start_time', e.target.value)} 
                    className="form-input"
                    style={{ padding: '0.4rem' }}
                  />
                </div>
                <span style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)' }}>-</span>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.2rem' }}>Salida</label>
                  <input 
                    type="time" 
                    value={day.end_time} 
                    onChange={(e) => handleChange(idx, 'end_time', e.target.value)} 
                    className="form-input"
                    style={{ padding: '0.4rem' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Día de Descanso
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Nuevo Horario</>}
      </button>
    </div>
  )
}
