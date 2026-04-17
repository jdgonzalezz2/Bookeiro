'use client'

import { useState, useEffect } from 'react'
import { getAvailableSlots, submitBooking } from './actions'

type Service = any
type Staff = any
type Slot = { startIso: string, endIso: string, label: string }

export default function BookingModal({ 
  tenant, 
  primaryColor, 
  isOpen, 
  onClose,
  initialServiceId,
  initialStaffId,
  services,
  staffList
}: { 
  tenant: any, 
  primaryColor: string, 
  isOpen: boolean, 
  onClose: () => void,
  initialServiceId?: string,
  initialStaffId?: string,
  services: Service[],
  staffList: Staff[]
}) {
  const [step, setStep] = useState<number>(1)
  
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

  // Initialize from defaults when opened
  useEffect(() => {
    if (isOpen) {
      if (initialServiceId) {
        setSelectedService(services.find(s => s.id === initialServiceId) || null)
        setStep(2) // Jump to Staff selection
      } else {
        setSelectedService(null)
        setStep(1)
      }
      
      if (initialStaffId) {
        setSelectedStaff(staffList.find(s => s.id === initialStaffId) || null)
        if (initialServiceId) setStep(3) // Jump to Time selection
      } else {
        setSelectedStaff(null)
      }
      
      setBookingSuccess(false)
      setDateStr('')
      setCustomerInfo({ name: '', phone: '' })
    }
  }, [isOpen, initialServiceId, initialStaffId, services, staffList])

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

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{ 
        width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', 
        padding: '2.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'left',
        position: 'relative'
      }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
          ✖
        </button>

        {bookingSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '2rem', color: 'var(--color-text-primary)' }}>¡Cita Confirmada!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Te esperamos pronto en {tenant.name}.</p>
            <button onClick={() => window.location.reload()} style={{ background: primaryColor, color: '#fff', border: 'none', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}>
              Finalizar
            </button>
          </div>
        ) : (
          <>
            {/* ProgressBar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600, color: step >= 1 ? primaryColor : 'var(--color-text-muted)' }}>1. Servicio</span>
              <span style={{ fontWeight: 600, color: step >= 2 ? primaryColor : 'var(--color-text-muted)' }}>2. Profesional</span>
              <span style={{ fontWeight: 600, color: step >= 3 ? primaryColor : 'var(--color-text-muted)' }}>3. Horario</span>
              <span style={{ fontWeight: 600, color: step >= 4 ? primaryColor : 'var(--color-text-muted)' }}>4. Datos</span>
            </div>

            {bookingError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{bookingError}</div>}

            {/* STEP 1: Servicio */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Selecciona tu servicio</h3>
                {services.length === 0 ? <p>No hay servicios disponibles.</p> : (
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {services.map(s => (
                      <div key={s.id} onClick={() => { setSelectedService(s); setStep(2) }}
                        style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', transition: 'all 0.2s', background: 'var(--color-glass)' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.duration_mins} min</div>
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
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>¿Con quién te atenderás?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                  {staffList.map(st => (
                    <div key={st.id} onClick={() => { setSelectedStaff(st); setStep(3) }}
                      style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer', background: 'var(--color-glass)' }}
                    >
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--color-border)', margin: '0 auto 0.8rem', overflow: 'hidden' }}>
                        {st.avatar_url ? <img src={st.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="pic"/> : <div style={{ fontSize: '1.5rem', marginTop: '0.3rem' }}>✂️</div>}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{st.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3 & 4 Omitted for brevity but basically the same as original wizard just adjusted colors */}
            {step === 3 && (
              <div>
                <button onClick={() => setStep(2)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>← Volver</button>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Elige Fecha y Hora</h3>
                <input type="date" className="form-input" value={dateStr} onChange={(e) => setDateStr(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ width: '100%', marginBottom: '1.5rem', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
                
                <div style={{ minHeight: '150px' }}>
                  {!dateStr ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Selecciona un día.</p> : loadingSlots ? <p style={{ textAlign: 'center' }}>Cargando agenda...</p> : slots.length === 0 ? <p style={{ color: '#e74c3c', textAlign: 'center' }}>Agotado este día.</p> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      {slots.map(slot => (
                        <button key={slot.startIso} onClick={() => { setSelectedSlot(slot); setStep(4) }}
                          style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: `1px solid ${primaryColor}`, background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}
                        >{slot.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && selectedService && selectedStaff && selectedSlot && (
              <div>
                <button onClick={() => { setBookingError(null); setStep(3) }} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}>← Volver</button>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Detalle de Reserva</h3>
                
                <div style={{ background: 'var(--color-glass)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid var(--color-border)' }}>
                  <p><strong>Servicio:</strong> {selectedService.name}</p>
                  <p><strong>Con:</strong> {selectedStaff.name}</p>
                  <p><strong>Hora:</strong> {new Date(selectedSlot.startIso).toLocaleDateString()} - {selectedSlot.label}</p>
                  <p><strong>Total:</strong> <span style={{ color: primaryColor, fontWeight: 700 }}>${selectedService.base_price}</span></p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div><label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Tu Nombre</label><input type="text" className="form-input" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="Juan Pérez" /></div>
                  <div><label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Teléfono</label><input type="tel" className="form-input" style={{ background: 'var(--color-bg-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="3001234567" /></div>
                </div>

                <button disabled={isSubmitting || !customerInfo.name || !customerInfo.phone}
                  onClick={async () => {
                    setIsSubmitting(true)
                    const res = await submitBooking(tenant.id, selectedStaff.id, selectedService.id, customerInfo.name, customerInfo.phone, selectedSlot.startIso, selectedSlot.endIso, selectedService.base_price)
                    if (res.error) setBookingError(res.error)
                    else setBookingSuccess(true)
                    setIsSubmitting(false)
                  }}
                  style={{ marginTop: '1.5rem', width: '100%', background: primaryColor, color: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >{isSubmitting ? 'Procesando...' : 'Confirmar Cita'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
