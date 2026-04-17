'use client'

import { useState, useEffect } from 'react'
import { getTenantServices, getTenantStaff, getAvailableSlots, submitBooking } from './actions'

type Service = any
type Staff = any
type Slot = { startIso: string, endIso: string, label: string }

export default function BookingWizard({ tenant, primaryColor }: { tenant: any, primaryColor: string }) {
  const [step, setStep] = useState<number>(1)
  
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  
  const [dateStr, setDateStr] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string|null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Initialization
  useEffect(() => {
    getTenantServices(tenant.id).then(setServices)
    getTenantStaff(tenant.id).then(setStaffList)
  }, [tenant.id])

  // Slot fetching
  useEffect(() => {
    if (selectedService && selectedStaff && dateStr) {
      setLoadingSlots(true)
      setSelectedSlot(null)
      getAvailableSlots(tenant.id, selectedStaff.id, dateStr, selectedService.duration_mins).then(res => {
        setSlots(res)
        setLoadingSlots(false)
      })
    }
  }, [dateStr, selectedStaff, selectedService, tenant.id])

  if (bookingSuccess) {
    return (
      <div style={{ background: 'var(--color-glass)', border: `1px solid var(--color-glass-border)`, padding: '3rem 2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: 'rgba(0,0,0,0.5) 0px 10px 30px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '2rem', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>¡Cita Confirmada!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Hemos reservado tu espacio con éxito. Te esperamos pronto en <strong>{tenant.name}</strong>.
        </p>
        <button onClick={() => window.location.reload()} style={{ background: primaryColor, color: '#000', border: 'none', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}>
          Volver al Inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'rgba(0,0,0,0.5) 0px 10px 30px', textAlign: 'left' }}>
      
      {/* ProgressBar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '1rem' }}>
        <span style={{ fontWeight: 600, color: step >= 1 ? primaryColor : 'var(--color-text-muted)' }}>1. Servicio</span>
        <span style={{ fontWeight: 600, color: step >= 2 ? primaryColor : 'var(--color-text-muted)' }}>2. Profesional</span>
        <span style={{ fontWeight: 600, color: step >= 3 ? primaryColor : 'var(--color-text-muted)' }}>3. Horario</span>
        <span style={{ fontWeight: 600, color: step >= 4 ? primaryColor : 'var(--color-text-muted)' }}>4. Datos</span>
      </div>

      {bookingError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{bookingError}</div>
      )}

      {/* STEP 1: Servicio */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Selecciona tu servicio</h3>
          {services.length === 0 ? <p>No hay servicios disponibles.</p> : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {services.map(s => (
                <div key={s.id} 
                  onClick={() => { setSelectedService(s); setStep(2) }}
                  style={{ 
                    padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)' 
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = primaryColor}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.description} ({s.duration_mins} min)</div>
                  </div>
                  <div style={{ fontWeight: 700, color: primaryColor }}>${s.base_price}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Profesional */}
      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>← Volver</button>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>¿Con quién te atenderás?</h3>
          {staffList.length === 0 ? <p>No hay barberos.</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {staffList.map(st => (
                <div key={st.id} 
                  onClick={() => { setSelectedStaff(st); setStep(3) }}
                  style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = primaryColor}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-glass)', border: '1px solid var(--color-border)', margin: '0 auto 1rem', overflow: 'hidden' }}>
                    {st.avatar_url ? <img src={st.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="pic"/> : <div style={{ fontSize: '2rem', marginTop: '0.5rem' }}>✂️</div>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{st.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Horario */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>← Volver</button>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Elige Fecha y Hora</h3>
          <input 
            type="date" 
            className="form-input" 
            value={dateStr} 
            onChange={(e) => setDateStr(e.target.value)} 
            min={new Date().toISOString().split('T')[0]} // Not strictly safe around midnight depending on timezone, but standard.
            style={{ width: '100%', marginBottom: '1.5rem' }} 
          />
          
          <div style={{ minHeight: '150px' }}>
            {!dateStr ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Selecciona un día en el calendario arriba.</p>
            ) : loadingSlots ? (
              <p style={{ textAlign: 'center', marginTop: '2rem' }}>Consultando agenda en tiempo real...</p>
            ) : slots.length === 0 ? (
              <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '2rem' }}>No hay espacios disponibles para este día.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                {slots.map(slot => (
                  <button 
                    key={slot.startIso}
                    onClick={() => { setSelectedSlot(slot); setStep(4) }}
                    style={{ 
                      padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--color-border)', background: 'transparent', 
                      color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = primaryColor; e.currentTarget.style.color = '#000' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Confirmación Datos */}
      {step === 4 && selectedService && selectedStaff && selectedSlot && (
        <div>
          <button onClick={() => { setBookingError(null); setStep(3) }} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>← Volver</button>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Tus Datos de Reserva</h3>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <p><strong>Servicio:</strong> {selectedService.name}</p>
            <p><strong>Profesional:</strong> {selectedStaff.name}</p>
            <p><strong>Día y Hora:</strong> {new Date(selectedSlot.startIso).toLocaleDateString()} a las {selectedSlot.label}</p>
            <p><strong>Total a Pagar:</strong> <span style={{ color: primaryColor, fontWeight: 700 }}>${selectedService.base_price}</span></p>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label">Tu Nombre</label>
              <input type="text" className="form-input" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="form-label">Teléfono (WhatsApp)</label>
              <input type="tel" className="form-input" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="Ej. 3001234567" />
            </div>
          </div>

          <button 
            disabled={isSubmitting || !customerInfo.name || !customerInfo.phone}
            onClick={async () => {
              setIsSubmitting(true)
              setBookingError(null)
              const res = await submitBooking(
                tenant.id, selectedStaff.id, selectedService.id, 
                customerInfo.name, customerInfo.phone, 
                selectedSlot.startIso, selectedSlot.endIso, selectedService.base_price
              )
              if (res.error) setBookingError(res.error)
              else setBookingSuccess(true)
              setIsSubmitting(false)
            }}
            style={{ 
              marginTop: '1.5rem', width: '100%', background: primaryColor, color: '#000', padding: '1rem', 
              borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' 
            }}
          >
            {isSubmitting ? 'Procesando en Servidor...' : 'Confirmar Reserva de Cita'}
          </button>
        </div>
      )}
    </div>
  )
}
