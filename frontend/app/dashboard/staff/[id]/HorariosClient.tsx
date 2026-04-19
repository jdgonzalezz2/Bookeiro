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
    <div style={{ width: '100%', animation: 'slideUp 0.4s ease-out' }}>
      <div style={{ 
        background: 'var(--color-bg-secondary)', 
        border: '1px solid var(--color-border)', 
        borderRadius: '24px', 
        padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>Disponibilidad Semanal</h2>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Define los días y horas que este profesional estará disponible para citas.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="btn btn-primary" 
            style={{ 
              height: '48px', 
              padding: '0 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem',
              boxShadow: '0 4px 15px rgba(201,168,76,0.2)'
            }}
          >
            {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
          </button>
        </div>
        
        {message && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1rem 1.25rem', 
            borderRadius: '12px', 
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: message.type === 'success' ? '#10B981' : '#EF4444',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            {message.type === 'success' && <CheckCircle2 size={18} />}
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          {schedule.map((day, idx) => (
            <div key={day.day_of_week} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '2rem', 
              padding: '1.25rem 1.5rem', 
              background: day.is_active ? 'var(--color-bg-surface)' : 'rgba(255,255,255,0.01)', 
              border: '1px solid',
              borderColor: day.is_active ? 'var(--color-primary-muted)' : 'var(--color-border)', 
              borderRadius: '18px',
              transition: 'all 0.3s ease',
              boxShadow: day.is_active ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Active accent line */}
              {day.is_active && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--color-primary)' }} />
              )}
              
              <div style={{ width: '140px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Custom Switch Toggle */}
                <div 
                  onClick={() => handleChange(idx, 'is_active', !day.is_active)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '20px',
                    background: day.is_active ? 'var(--color-primary)' : 'var(--color-bg-muted)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: day.is_active ? '20px' : '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: day.is_active ? '#000' : 'var(--color-text-muted)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
                
                <span style={{ 
                  fontWeight: 600, 
                  fontSize: '1.05rem',
                  color: day.is_active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  transition: 'color 0.3s ease'
                }}>
                  {DAYS.find(d => d.id === day.day_of_week)?.name}
                </span>
              </div>

              {day.is_active ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Entrada</span>
                      <input 
                        type="time" 
                        value={day.start_time} 
                        onChange={(e) => handleChange(idx, 'start_time', e.target.value)} 
                        style={{ 
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                    <div style={{ height: '1px', width: '12px', background: 'var(--color-border)', marginTop: '1.2rem' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>Salida</span>
                      <input 
                        type="time" 
                        value={day.end_time} 
                        onChange={(e) => handleChange(idx, 'end_time', e.target.value)} 
                        style={{ 
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.6 }}>
                  Día de Descanso
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
