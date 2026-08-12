'use client'

import { useState, useEffect } from 'react'
import { getAvailableSlots, submitBooking, createDepositIntent } from './actions'
import { X, Check, ArrowLeft, Clock } from 'lucide-react'
import { formatMoney, formatDate, readableOn } from './format'

type Service = any
type Staff = any
type Slot = { startIso: string, endIso: string, label: string }

// Tipos mínimos del widget de Wompi (script externo, sin tipos propios).
type WompiResult = { transaction?: { status?: string } }
interface WompiCheckout { open: (cb: (r: WompiResult) => void) => void }
type WompiCtor = new (opts: {
  currency: string
  amountInCents: number
  reference: string
  publicKey: string
  signature: { integrity: string }
}) => WompiCheckout

// Carga perezosa del widget de Wompi. Resuelve con el constructor global
// WidgetCheckout. Se carga una sola vez.
function loadWompiWidget(): Promise<WompiCtor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { WidgetCheckout?: WompiCtor }
    const fail = () => reject(new Error('No se pudo cargar el sistema de pago.'))
    if (w.WidgetCheckout) return resolve(w.WidgetCheckout)
    const existing = document.querySelector<HTMLScriptElement>('script[data-wompi]')
    if (existing) {
      existing.addEventListener('load', () => (w.WidgetCheckout ? resolve(w.WidgetCheckout) : fail()))
      existing.addEventListener('error', fail)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.wompi.co/widget.js'
    s.async = true
    s.setAttribute('data-wompi', '1')
    s.onload = () => (w.WidgetCheckout ? resolve(w.WidgetCheckout) : fail())
    s.onerror = fail
    document.body.appendChild(s)
  })
}

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

  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string|null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  // Flujo de abono: una vez creada la cita 'pending', el botón reintenta SOLO el
  // pago (no vuelve a reservar, para no duplicar la cita).
  const [bookedApptId, setBookedApptId] = useState<string|null>(null)
  const [payPhase, setPayPhase] = useState<'none'|'approved'|'pending'>('none')

  // deposit_active = el negocio activó abono Y configuró sus llaves de Wompi
  // (lo calcula el RPC deposit_status en el server). Evita pedir pago sin config.
  const depositEnabled = Boolean(tenant?.deposit_active)
  const depositPercent = Number(tenant?.deposit_percent ?? 50)

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
      setCustomerInfo({ name: '', phone: '', email: '' })
      setBookedApptId(null)
      setPayPhase('none')
      setBookingError(null)
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

  const startDepositPayment = async (appointmentId: string) => {
    const intent = await createDepositIntent(appointmentId)
    if ('error' in intent) {
      setBookingError('Tu cupo quedó reservado, pero no se pudo iniciar el pago: ' + intent.error)
      setIsSubmitting(false)
      return
    }
    let WidgetCheckout: WompiCtor
    try {
      WidgetCheckout = await loadWompiWidget()
    } catch (e) {
      setBookingError(e instanceof Error ? e.message : 'No se pudo cargar el sistema de pago.')
      setIsSubmitting(false)
      return
    }
    const checkout = new WidgetCheckout({
      currency: intent.currency,
      amountInCents: intent.amountInCents,
      reference: intent.reference,
      publicKey: intent.publicKey,
      signature: { integrity: intent.signature },
    })
    // El botón queda deshabilitado (isSubmitting) mientras el widget está abierto;
    // se reactiva SOLO cuando el pago resuelve, para no abrir dos widgets.
    checkout.open((result) => {
      const status = result?.transaction?.status
      if (status === 'APPROVED') {
        setPayPhase('approved'); setBookingSuccess(true)
      } else if (status === 'PENDING') {
        setPayPhase('pending'); setBookingSuccess(true)
      } else {
        setBookingError('El pago no se completó. Tu horario queda reservado por 15 minutos — puedes reintentar el pago.')
      }
      setIsSubmitting(false)
    })
  }

  const handleConfirm = async () => {
    if (!selectedStaff || !selectedService || !selectedSlot || isSubmitting) return
    setIsSubmitting(true)
    setBookingError(null)
    try {
      let apptId = bookedApptId
      if (!apptId) {
        const res = await submitBooking(tenant.id, selectedStaff.id, selectedService.id, customerInfo.name, customerInfo.phone, selectedSlot.startIso, selectedSlot.endIso, selectedService.base_price, customerInfo.email)
        if (res.error || !res.appointmentId) {
          setBookingError(res.error || 'No se pudo crear la reserva.')
          setIsSubmitting(false)
          return
        }
        apptId = res.appointmentId as string
        setBookedApptId(apptId)
      }
      if (depositEnabled) {
        // startDepositPayment gestiona isSubmitting (lo mantiene hasta que el widget resuelva).
        await startDepositPayment(apptId)
      } else {
        setBookingSuccess(true)
        setIsSubmitting(false)
      }
    } catch {
      setBookingError('Ocurrió un error inesperado. Intenta de nuevo.')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const onPrimary = readableOn(primaryColor)
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }
  const specLabel: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }
  const dateInputStyle: React.CSSProperties = { width: '100%', marginBottom: '1.5rem', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-line)' }
  const steps = ['Servicio', 'Profesional', 'Horario', 'Datos']

  const initials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="booking-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', padding: '1rem'
    }}>
      <div className="booking-modal" style={{
        // --on-primary drives readable text on primary-filled controls (e.g. slot hover) from CSS.
        ['--on-primary' as any]: onPrimary,
        width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--color-bg-base)', border: '1px solid var(--color-line)',
        padding: '2.5rem', borderRadius: '16px', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)', textAlign: 'left',
        position: 'relative'
      }}>

        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'var(--color-bg-deep)', border: '1px solid var(--color-line)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
          <X size={17} strokeWidth={2} />
        </button>

        {bookingSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--color-primary) 16%, transparent)', color: 'var(--color-primary)' }}>
              <Check size={30} strokeWidth={2.25} />
            </div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              {payPhase === 'pending' ? 'Confirmando tu pago…' : 'Cita confirmada'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              {payPhase === 'pending'
                ? 'Tu abono está en proceso. Confirmaremos tu cita apenas se apruebe el pago.'
                : payPhase === 'approved'
                  ? `Recibimos tu abono. Te esperamos pronto en ${tenant.name}.`
                  : `Te esperamos pronto en ${tenant.name}.`}
            </p>
            <button onClick={() => window.location.reload()} className="booking-primary-btn" style={{ background: 'var(--color-primary)', color: onPrimary, border: 'none', padding: '0.85rem 1.6rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
              Finalizar
            </button>
          </div>
        ) : (
          <>
            {/* ProgressBar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--color-line)', paddingBottom: '1rem', fontSize: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              {steps.map((labelText, i) => {
                const n = i + 1
                const active = step >= n
                return (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    <span style={{ ...mono, fontSize: '0.78rem', opacity: active ? 1 : 0.7 }}>{n}</span>{labelText}
                  </span>
                )
              })}
            </div>

            {bookingError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{bookingError}</div>}

            {/* STEP 1: Servicio */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Selecciona tu servicio</h3>
                {services.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No hay servicios disponibles.</p> : (
                  <div style={{ display: 'grid', gap: '0.8rem' }}>
                    {services.map(s => (
                      <div key={s.id} onClick={() => { setSelectedService(s); setStep(2) }}
                        className="booking-option"
                        style={{ padding: '1rem', border: '1px solid var(--color-line)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'var(--color-bg-deep)' }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ ...mono, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>{s.duration_mins} min</div>
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
                <button onClick={() => setStep(1)} className="booking-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}><ArrowLeft size={15} /> Volver</button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>¿Con quién te atenderás?</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                  {staffList.map(st => (
                    <div key={st.id} onClick={() => { setSelectedStaff(st); setStep(3) }}
                      className="booking-option"
                      style={{ padding: '1.25rem 1rem', border: '1px solid var(--color-line)', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: 'var(--color-bg-deep)' }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-bg-base)', margin: '0 auto 0.8rem', overflow: 'hidden', border: `1px solid var(--color-line)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                        {st.avatar_url ? <img src={st.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={st.name}/> : initials(st.name)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{st.name}</div>
                      <div style={{ ...specLabel, color: 'var(--color-primary)', marginTop: '0.35rem' }}>{st.specialty || 'Profesional'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Fecha y hora */}
            {step === 3 && (
              <div>
                <button onClick={() => setStep(2)} className="booking-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}><ArrowLeft size={15} /> Volver</button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Elige fecha y hora</h3>
                <input type="date" className="form-input" value={dateStr} onChange={(e) => setDateStr(e.target.value)} min={new Date().toISOString().split('T')[0]} style={dateInputStyle} />

                <div style={{ minHeight: '150px' }}>
                  {!dateStr ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Selecciona un día.</p> : loadingSlots ? <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando agenda…</p> : slots.length === 0 ? <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Sin espacios disponibles este día.</p> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      {slots.map(slot => (
                        <button key={slot.startIso} onClick={() => { setSelectedSlot(slot); setStep(4) }}
                          className="booking-slot"
                          style={{ ...mono, padding: '0.65rem 0.9rem', borderRadius: '8px', border: `1px solid var(--color-line)`, background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 600 }}
                        >{slot.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && selectedService && selectedStaff && selectedSlot && (
              <div>
                <button onClick={() => { setBookingError(null); setStep(3) }} className="booking-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '1rem' }}><ArrowLeft size={15} /> Volver</button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>Detalle de la reserva</h3>

                <div style={{ background: 'var(--color-bg-deep)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid var(--color-line)', display: 'grid', gap: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Servicio</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{selectedService.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Con</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{selectedStaff.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Cuándo</span><span style={{ ...mono, fontWeight: 600, textAlign: 'right', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={13} /> {formatDate(selectedSlot.startIso)} · {selectedSlot.label}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid var(--color-line)', paddingTop: '0.7rem' }}><span style={{ color: 'var(--color-text-muted)' }}>Total</span><span style={{ ...mono, color: depositEnabled ? 'var(--color-text-primary)' : 'var(--color-primary)', fontWeight: 700 }}>${formatMoney(selectedService.base_price)}</span></div>
                  {depositEnabled && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Abono hoy ({depositPercent}%)</span>
                      <span style={{ ...mono, color: 'var(--color-primary)', fontWeight: 700 }}>${formatMoney(Math.round(selectedService.base_price * depositPercent / 100))}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div><label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Tu nombre</label><input type="text" className="form-input" style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-line)' }} value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} placeholder="Juan Pérez" /></div>
                  <div><label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Teléfono</label><input type="tel" className="form-input" style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-line)' }} value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} placeholder="3001234567" /></div>
                  <div>
                    <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Email <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                    <input type="email" className="form-input" style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-line)' }} value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} placeholder="tucorreo@ejemplo.com" />
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>Te enviaremos un recordatorio de tu cita.</div>
                  </div>
                </div>

                <button disabled={isSubmitting || !customerInfo.name || !customerInfo.phone}
                  className="booking-primary-btn"
                  onClick={handleConfirm}
                  style={{ marginTop: '1.5rem', width: '100%', background: 'var(--color-primary)', color: onPrimary, padding: '1rem', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '1.05rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: (isSubmitting || !customerInfo.name || !customerInfo.phone) ? 0.55 : 1 }}
                >{isSubmitting ? 'Procesando…' : depositEnabled ? (bookedApptId ? 'Reintentar pago' : 'Reservar y pagar abono') : 'Confirmar cita'}</button>
                {depositEnabled && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
                    Pagas el abono de forma segura con Wompi. El resto se paga en el local.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
