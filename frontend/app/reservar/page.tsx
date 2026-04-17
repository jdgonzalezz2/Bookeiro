'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addDays, startOfDay, getDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Barbero  = { id: number; nombre: string; apellido: string; especialidad: string; };
type Servicio = { id: number; nombre: string; precio: number; duracion_minutos: number; descripcion: string; categoria: string; };
type Slot     = { hora: string; disponible: boolean; };

const STEP_LABELS = ['Elige tu barbero', 'Elige el servicio', 'Selecciona fecha y hora', 'Tus datos'];

function ReservarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [selBarbero, setSelBarbero] = useState<number | null>(null);
  const [selServicio, setSelServicio] = useState<number | null>(null);
  const [selFecha, setSelFecha] = useState<Date>(startOfDay(addDays(new Date(), 1)));
  const [selHora, setSelHora] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/barberos`).then(r => r.json()).then(setBarberos).catch(() => {});
    fetch(`${API}/api/servicios`).then(r => r.json()).then(setServicios).catch(() => {});
    const bid = searchParams.get('barbero');
    const sid = searchParams.get('servicio');
    if (bid) setSelBarbero(Number(bid));
    if (sid) setSelServicio(Number(sid));
    if (bid && sid) setStep(3);
    else if (bid) setStep(2);
  }, [searchParams]);

  const fetchSlots = useCallback(async () => {
    if (!selBarbero || !selFecha) return;
    setSlotsLoading(true);
    try {
      const fechaStr = format(selFecha, 'yyyy-MM-dd');
      const res = await fetch(`${API}/api/agenda/disponibilidad/${selBarbero}/${fechaStr}`);
      const data = await res.json();
      setSlots(data.slots || []);
      setSelHora(null);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, [selBarbero, selFecha]);

  useEffect(() => { if (step === 3) fetchSlots(); }, [step, selFecha, fetchSlots]);

  const servicioSel = servicios.find((s: Servicio) => s.id === selServicio);
  const barberoSel  = barberos.find((b: Barbero) => b.id === selBarbero);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p);

  // Genera los días disponibles (los próximos 30 días)
  const dias = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i + 1))
    .filter(d => getDay(d) !== 0); // Excluir domingos

  async function handleSubmit() {
    if (!form.nombre.trim()) { setError('Tu nombre es requerido'); return; }
    setLoading(true);
    setError('');
    try {
      const fechaHoraInicio = new Date(`${format(selFecha, 'yyyy-MM-dd')}T${selHora}:00-05:00`).toISOString();
      const res = await fetch(`${API}/api/agenda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberoId: selBarbero, servicioId: selServicio,
          clienteNombre: form.nombre.trim(), clienteTelefono: form.telefono.trim(),
          clienteEmail: form.email.trim(), fechaHoraInicio, notas: form.notas.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al reservar'); setLoading(false); return; }

      // Guardar en sessionStorage para la página de confirmación
      sessionStorage.setItem('cita_confirmada', JSON.stringify({
        ...data.cita,
        servicio: servicioSel?.nombre,
        barbero: `${barberoSel?.nombre} ${barberoSel?.apellido}`,
        fecha: format(selFecha, "EEEE d 'de' MMMM", { locale: es }),
        hora: selHora,
        precio: servicioSel?.precio,
        clienteNombre: form.nombre,
      }));
      router.push('/confirmacion');
    } catch { setError('Error de conexión. Intenta de nuevo.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '20px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '3px' }}>
          LA CIMA
        </Link>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Reserva de cita</span>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Steps */}
        <div className="steps" style={{ marginBottom: '48px' }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : ''}`}
              onClick={() => step > i + 1 && setStep(i + 1)}
              style={{ cursor: step > i + 1 ? 'pointer' : 'default' }}>
              <div className="step-circle">
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: BARBERO ═════════════════════════════════ */}
        {step === 1 && (
          <div className="animate-fadeInUp">
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '32px', marginBottom: '24px' }}>
              ¿Con quién quieres tu cita?
            </h2>
            <div className="barberos-grid">
              {barberos.length === 0
                ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: '18px' }} />)
                : barberos.map(b => (
                  <div key={b.id} className={`barbero-card ${selBarbero === b.id ? 'selected' : ''}`}
                    onClick={() => setSelBarbero(b.id)}>
                    <div className="barbero-avatar">{b.nombre[0]}{b.apellido[0]}</div>
                    <div className="barbero-name">{b.nombre} {b.apellido}</div>
                    <div className="barbero-especialidad">{b.especialidad}</div>
                    {selBarbero === b.id && (
                      <div style={{ marginTop: '12px' }}><span className="badge badge-gold">✓ Seleccionado</span></div>
                    )}
                  </div>
                ))
              }
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button className="btn btn-gold btn-lg" disabled={!selBarbero} onClick={() => setStep(2)}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: SERVICIO ════════════════════════════════ */}
        {step === 2 && (
          <div className="animate-fadeInUp">
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '32px', marginBottom: '24px' }}>
              ¿Qué servicio deseas?
            </h2>
            <div className="services-grid">
              {servicios.map(s => (
                <div key={s.id} className={`service-card ${selServicio === s.id ? 'selected' : ''}`}
                  onClick={() => setSelServicio(s.id)}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="service-card-name">{s.nombre}</div>
                    <div className="service-card-desc">{s.descripcion}</div>
                    <div className="service-card-meta">
                      <span className="service-card-price">{formatPrice(s.precio)}</span>
                      <span className="service-card-duration">⏱ {s.duracion_minutos} min</span>
                    </div>
                    {selServicio === s.id && (
                      <div style={{ marginTop: '12px' }}><span className="badge badge-gold">✓ Seleccionado</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn btn-gold btn-lg" disabled={!selServicio} onClick={() => setStep(3)}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: FECHA Y HORA ════════════════════════════ */}
        {step === 3 && (
          <div className="animate-fadeInUp">
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '32px', marginBottom: '24px' }}>
              Elige fecha y hora
            </h2>

            {/* Selector de fecha */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 500, marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Fecha
              </div>
              <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
                  {dias.map(d => {
                    const isSelected = format(d, 'yyyy-MM-dd') === format(selFecha, 'yyyy-MM-dd');
                    return (
                      <button key={d.toISOString()}
                        onClick={() => setSelFecha(d)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          minWidth: '64px', height: '72px', borderRadius: '12px', border: 'none',
                          background: isSelected ? 'var(--gold)' : 'var(--bg-input)',
                          color: isSelected ? '#0A0A0F' : 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          fontSize: '12px', fontWeight: isSelected ? 700 : 400,
                          borderWidth: '1px', borderStyle: 'solid',
                          borderColor: isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                        }}>
                        <span style={{ textTransform: 'uppercase', fontSize: '10px', opacity: 0.8 }}>
                          {format(d, 'EEE', { locale: es })}
                        </span>
                        <span style={{ fontSize: '22px', fontFamily: 'var(--font-cormorant)', fontWeight: 600 }}>
                          {format(d, 'd')}
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{format(d, 'MMM', { locale: es })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Slots */}
            <div className="card">
              <div style={{ fontWeight: 500, marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Horarios disponibles — {format(selFecha, "EEEE d 'de' MMMM", { locale: es })}
              </div>
              {slotsLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}><div className="spinner spinner-lg" /></div>
              ) : slots.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', fontSize: '14px' }}>
                  El barbero no tiene horario disponible para este día.
                </div>
              ) : (
                <div className="time-slots">
                  {slots.map(slot => (
                    <button key={slot.hora}
                      className={`slot ${slot.disponible ? (selHora === slot.hora ? 'selected' : 'available') : 'unavailable'}`}
                      disabled={!slot.disponible}
                      onClick={() => slot.disponible && setSelHora(slot.hora)}>
                      {slot.hora}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Atrás</button>
              <button className="btn btn-gold btn-lg" disabled={!selHora} onClick={() => setStep(4)}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: DATOS ═══════════════════════════════════ */}
        {step === 4 && (
          <div className="animate-fadeInUp">
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '32px', marginBottom: '24px' }}>
              Casi listo — tus datos
            </h2>

            {/* Resumen */}
            <div className="card card-glass" style={{ marginBottom: '32px', borderColor: 'var(--gold-border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
                Resumen de tu cita
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { label: 'Barbero',  val: `${barberoSel?.nombre} ${barberoSel?.apellido}` },
                  { label: 'Servicio', val: servicioSel?.nombre },
                  { label: 'Fecha',    val: format(selFecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }) },
                  { label: 'Hora',     val: selHora },
                  { label: 'Total',    val: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(servicioSel?.precio || 0) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.label}</span>
                    <span style={{ fontWeight: 500, color: r.label === 'Total' ? 'var(--gold)' : 'var(--text-primary)', fontSize: r.label === 'Total' ? '18px' : '14px' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-input" placeholder="Tu nombre"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp (para confirmación)</label>
                <input className="form-input" placeholder="300 000 0000" type="tel"
                  value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (opcional)</label>
                <input className="form-input" placeholder="tu@email.com" type="email"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notas adicionales (opcional)</label>
                <textarea className="form-textarea" placeholder="Alguna preferencia especial..."
                  value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} style={{ minHeight: '80px' }} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--error-muted)', border: '1px solid rgba(239,83,80,0.2)', borderRadius: '12px', color: 'var(--error)', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Atrás</button>
              <button className="btn btn-gold btn-lg" onClick={handleSubmit} disabled={loading || !form.nombre.trim()}>
                {loading ? <><div className="spinner" /> Confirmando...</> : '✦ Confirmar Cita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <ReservarForm />
    </Suspense>
  );
}

