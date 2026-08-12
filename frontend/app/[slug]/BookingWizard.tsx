'use client'

import { useState, useEffect } from 'react'
import { getTenantServices, getTenantStaff, getAvailableSlots, submitBooking } from './actions'
import { CreditCard, Lock, CheckCircle2, Check, ArrowLeft } from 'lucide-react'
import { formatMoney, formatDate, readableOn } from './format'

type Service = any
type Staff = any
type Slot = { startIso: string, endIso: string, label: string }

// NOTE: This wizard is currently not imported anywhere (the live booking flow is
// BookingModal). Kept in sync with the Compás skin so it's ready if wired up.
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

  const onPrimary = readableOn(primaryColor)
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }
  // Map the local color vars to the global COMPÁS tokens so the shared skin
  // classes (.booking-option/.booking-slot/.booking-primary-btn) resolve correctly.
  const themeVars = {
    ['--color-line' as any]: 'var(--compas-line)',
    ['--color-bg-deep' as any]: 'var(--compas-paper-deep)',
    ['--color-text-primary' as any]: 'var(--compas-ink)',
    ['--color-text-secondary' as any]: 'var(--compas-muted)',
    ['--color-text-muted' as any]: 'var(--compas-faint)',
    ['--color-primary' as any]: primaryColor,
    ['--on-primary' as any]: onPrimary,
  } as React.CSSProperties
  const shellStyle: React.CSSProperties = {
    ...themeVars,
    background: 'var(--compas-paper-deep)', border: '1px solid var(--compas-line)',
    padding: '2.5rem', borderRadius: '16px', textAlign: 'left', color: 'var(--compas-ink)',
    fontVariantNumeric: 'tabular-nums'
  }
  const backStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }
  const h3Style: React.CSSProperties = { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }
  const inputWarm: React.CSSProperties = { background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-line)' }
  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  if (bookingSuccess) {
    return (
      <div style={{ ...shellStyle, textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--color-primary) 16%, transparent)', color: 'var(--color-primary)' }}>
          <Check size={30} strokeWidth={2.25} />
        </div>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Cita confirmada</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', marginBottom: '2rem' }}>
          Hemos reservado tu espacio. Te esperamos pronto en <strong>{tenant.name}</strong>.
        </p>
        <button onClick={() => window.location.reload()} className="booking-primary-btn" style={{ background: 'var(--color-primary)', color: onPrimary, border: 'none', padding: '0.85rem 1.6rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={shellStyle}>

      {/* ProgressBar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--color-line)', paddingBottom: '1rem', fontSize: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {['Servicio', 'Profesional', 'Horario', 'Datos', 'Pago'].map((labelText, i) => {
          const n = i + 1
          const active = step >= n
          return (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              <span style={{ ...mono, fontSize: '0.78rem', opacity: active ? 1 : 0.7 }}>{n}</span>{labelText}
            </span>
          )
        })}
      </div>

      {bookingError && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{bookingError}</div>
      )}

      {/* STEP 1: Servicio */}
      {step === 1 && (
        <div>
          <h3 style={h3Style}>Selecciona tu servicio</h3>
          {services.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No hay servicios disponibles.</p> : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {services.map(s => (
                <div key={s.id}
                  onClick={() => { setSelectedService(s); setStep(2) }}
                  className="booking-option"
                  style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'var(--color-bg-deep)' }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>{s.description ? `${s.description} · ` : ''}<span style={mono}>{s.duration_mins} min</span></div>
                  </div>
                  <div style={{ ...mono, fontWeight: 700, color: 'var(--color-text-primary)' }}>${formatMoney(s.base_price)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Profesional */}
      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} className="booking-back" style={backStyle}><ArrowLeft size={15} /> Volver</button>
          <h3 style={h3Style}>¿Con quién te atenderás?</h3>
          {staffList.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No hay profesionales.</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {staffList.map(st => (
                <div key={st.id}
                  onClick={() => { setSelectedStaff(st); setStep(3) }}
                  className="booking-option"
                  style={{ padding: '1.5rem', border: '1px solid var(--color-line)', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: 'var(--color-bg-deep)' }}
                >
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--color-bg-deep)', border: '1px solid var(--color-line)', margin: '0 auto 1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {st.avatar_url ? <img src={st.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={st.name}/> : initials(st.name)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{st.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Horario */}
      {step === 3 && (
        <div>
          <button onClick={() => setStep(2)} className="booking-back" style={backStyle}><ArrowLeft size={15} /> Volver</button>
          <h3 style={h3Style}>Elige fecha y hora</h3>
          <input
            type="date"
            className="form-input"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            min={new Date().toISOString().split('T')[0]} // Not strictly safe around midnight depending on timezone, but standard.
            style={{ width: '100%', marginBottom: '1.5rem', ...inputWarm }}
          />

          <div style={{ minHeight: '150px' }}>
            {!dateStr ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '2rem' }}>Selecciona un día en el calendario.</p>
            ) : loadingSlots ? (
              <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-text-secondary)' }}>Consultando agenda en tiempo real…</p>
            ) : slots.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No hay espacios disponibles para este día.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {slots.map(slot => (
                  <button
                    key={slot.startIso}
                    onClick={() => { setSelectedSlot(slot); setStep(4) }}
                    className="booking-slot"
                    style={{ ...mono, padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--color-line)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}
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
          <button onClick={() => { setBookingError(null); setStep(3) }} className="booking-back" style={backStyle}><ArrowLeft size={15} /> Volver</button>
          <h3 style={h3Style}>Tus datos de reserva</h3>

          <div style={{ background: 'var(--color-bg-deep)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid var(--color-line)' }}>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Servicio</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{selectedService.name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Profesional</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{selectedStaff.name}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Día y hora</span><span style={{ ...mono, fontWeight: 600, textAlign: 'right' }}>{formatDate(selectedSlot.startIso)} · {selectedSlot.label}</span></div>
            </div>
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-line)', paddingTop: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>Abono hoy (50% reserva)</span>
                  <span style={{ ...mono, color: 'var(--color-primary)', fontWeight: 700 }}>${formatMoney(selectedService.base_price * 0.5)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>A pagar tras el servicio</span>
                  <span style={mono}>${formatMoney(selectedService.base_price * 0.5)}</span>
               </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Tu nombre</label>
              <input type="text" className="form-input" style={inputWarm} value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Teléfono (WhatsApp)</label>
              <input type="tel" className="form-input" style={inputWarm} value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="Ej. 3001234567" />
            </div>
          </div>

          <button
            disabled={!customerInfo.name || !customerInfo.phone}
            onClick={() => setStep(5)}
            className="booking-primary-btn"
            style={{ marginTop: '1.5rem', width: '100%', background: 'var(--color-primary)', color: onPrimary, padding: '1rem', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '1.05rem', cursor: (!customerInfo.name || !customerInfo.phone) ? 'not-allowed' : 'pointer', opacity: (!customerInfo.name || !customerInfo.phone) ? 0.55 : 1 }}
          >
            Continuar al pago seguro
          </button>
        </div>
      )}

      {/* STEP 5: Checkout (Fake Stripe) */}
      {step === 5 && selectedService && selectedStaff && selectedSlot && (
        <div style={{ animation: 'slideUp 0.4s ease-out' }}>
          <button onClick={() => { setBookingError(null); setStep(4) }} className="booking-back" style={backStyle}><ArrowLeft size={15} /> Volver</button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', margin: 0, color: 'var(--color-text-primary)' }}>Checkout seguro</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--compas-sage)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Lock size={14} /> Encriptado
            </div>
          </div>

          {/* Resumen Final Cobro */}
          <div style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Monto a cobrar ahora (50% reserva)</p>
            <h2 style={{ ...mono, fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-1px' }}>
              ${formatMoney(selectedService.base_price * 0.5)}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>El resto (<span style={mono}>${formatMoney(selectedService.base_price * 0.5)}</span>) se paga en el local.</p>
          </div>

          <div style={{ display: 'grid', gap: '1.2rem', marginBottom: '2rem' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-primary)' }}>
                <CreditCard size={16} /> Número de tarjeta
              </label>
              <input type="text" className="form-input" placeholder="0000 0000 0000 0000" maxLength={19} style={{ ...inputWarm, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', letterSpacing: '2px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Expiración</label>
                <input type="text" className="form-input" placeholder="MM/YY" maxLength={5} style={{ ...inputWarm, fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
              </div>
              <div>
                <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>CVC</label>
                <input type="password" className="form-input" placeholder="•••" maxLength={4} style={{ ...inputWarm, fontFamily: 'var(--font-mono)', textAlign: 'center' }} />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Titular de la tarjeta</label>
              <input type="text" className="form-input" defaultValue={customerInfo.name} placeholder="Nombre en la tarjeta" style={inputWarm} />
            </div>
          </div>

          <button
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true)
              setBookingError(null)

              // Fake Gateway Delay (2 seconds)
              await new Promise(resolve => setTimeout(resolve, 2000))

              const res = await submitBooking(
                tenant.id, selectedStaff.id, selectedService.id,
                customerInfo.name, customerInfo.phone,
                selectedSlot.startIso, selectedSlot.endIso, selectedService.base_price // Record full price in DB
              )
              if (res.error) {
                setBookingError(res.error)
              } else {
                setStep(6) // Wait, we use bookingSuccess for success
                setBookingSuccess(true)
              }
              setIsSubmitting(false)
            }}
            className="booking-primary-btn"
            style={{
              width: '100%', background: 'var(--color-primary)', color: onPrimary, padding: '1.2rem',
              borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '1.05rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="spinner" style={{ borderColor: 'color-mix(in srgb, ' + onPrimary + ' 30%, transparent)', borderTopColor: onPrimary, width: 20, height: 20 }}></span>
                Procesando el pago…
              </span>
            ) : (
              <><Lock size={18} /> Pagar ${formatMoney(selectedService.base_price * 0.5)} y confirmar</>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={12} /> Pagos encriptados con seguridad 256-bit AES
          </div>
        </div>
      )}
    </div>
  )
}
