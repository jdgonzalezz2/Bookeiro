import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { createDemoDay } from '@/lib/rail-core/demo'
import { deriveLedger, formatCop } from '@/lib/rail-core'
import './landing/landing.css'
import { ThemeToggle } from '@/components/theme-toggle'
import TimeRailEmbed from './prototype/time-rail/TimeRailEmbed'

export const metadata: Metadata = {
  title: 'Bookeiro — La agenda de tu barbería, en una línea de tiempo',
  description:
    'Bookeiro maneja citas, equipo, disponibilidad y caja en una sola línea de tiempo. Arrastra una cita y todo se acomoda solo: sin dobles reservas, sin planillas.',
}

// Real ledger figures, derived by rail-core from the deterministic DemoDay — the
// same numbers the live rail shows. No fabricated metrics.
const DAY = createDemoDay()
const LEDGER = deriveLedger(DAY.lanes.flatMap((l) => l.appointments))

const PRINCIPLES = [
  { n: '01', h: 'Nunca dos citas a la vez.', p: 'Cada movimiento pasa por detección de colisiones. Si un horario está ocupado, la cita se reacomoda sola.' },
  { n: '02', h: 'Cada profesional, su agenda.', p: 'Horarios, servicios y precios propios por barbero. La disponibilidad se calcula para cada uno.' },
  { n: '03', h: 'Funciona sin apps.', p: 'Tus clientes reservan desde tu vitrina pública con nombre y teléfono. Nada que instalar, nada que recargar.' },
  { n: '04', h: 'Tu marca, tu enlace.', p: 'Una vitrina pública con tus colores, tu logo y tu tipografía. Compártela y recibe reservas.' },
]

export default async function LandingPage() {
  const user = await getCurrentUser()
  const primaryHref = user ? '/dashboard' : '/register'
  const primaryLabel = user ? 'Ir al dashboard' : 'Empezar gratis'

  return (
    <div className="landing-shell">
      {/* NAV */}
      <header className="lz-nav">
        <div className="lz-nav-inner">
          <Link href="/" className="lz-wordmark" aria-label="Bookeiro">
            <span className="lz-mark" aria-hidden />
            Bookeiro
          </Link>
          <nav aria-label="Secciones">
            <ul className="lz-nav-links">
              <li><a href="#demo">La agenda</a></li>
              <li><a href="#caja">Caja</a></li>
              <li><a href="#producto">Producto</a></li>
            </ul>
          </nav>
          <div className="lz-nav-actions">
            <ThemeToggle />
            {!user && (
              <Link href="/login" className="lz-btn lz-btn-ghost">Entrar</Link>
            )}
            <Link href={primaryHref} className="lz-btn lz-btn-primary">
              {primaryLabel}
              <ArrowUpRight size={16} className="lz-arrow" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="lz-hero">
        <h1>
          El día de tu barbería, en una sola <em>línea de tiempo</em>.
        </h1>
        <p className="lz-hero-lede">
          Citas, equipo, disponibilidad y caja se mueven juntos. Arrastra una cita y todo se acomoda
          solo — sin dobles reservas, sin planillas, sin recargar. Hecho para barberías, salones y spas.
        </p>
        <div className="lz-hero-ctas">
          <Link href={primaryHref} className="lz-btn lz-btn-primary lz-btn-lg">
            {primaryLabel}
            <ArrowUpRight size={18} className="lz-arrow" />
          </Link>
          <a href="#demo" className="lz-btn lz-btn-ghost lz-btn-lg">Ver la agenda en vivo</a>
        </div>
        <div className="lz-meta">
          <span>Sin tarjeta</span>
          <span>Listo en 5 minutos</span>
          <span>En español</span>
        </div>
      </section>

      {/* LIVE TIME-RAIL — the product centerpiece */}
      <section className="lz-demo" id="demo">
        <div className="lz-demo-head">
          <div className="lz-demo-intro">
            <h2>Así se ve un día real de una barbería.</h2>
            <p className="lz-demo-hint">
              Y es interactivo de verdad: arrastra una cita a otra hora, toca un espacio libre para
              reservar, o suéltala sobre un horario ocupado para ver la corrección serena. También
              funciona con teclado — M · flechas · Enter.
            </p>
          </div>
          <div className="lz-demo-legend" aria-hidden>
            <span><span className="lz-swatch" style={{ background: 'var(--amber)' }} />Confirmada</span>
            <span><span className="lz-swatch" style={{ background: 'var(--sage)' }} />Completada</span>
            <span><span className="lz-swatch" style={{ background: 'var(--terracotta)' }} />Colisión</span>
          </div>
        </div>
        <TimeRailEmbed />
      </section>

      <div className="lz-rule" />

      {/* TIME THINKS */}
      <section className="lz-thinks">
        <div className="lz-thinks-inner">
          <div className="lz-section-head">
            <h2>No solo guarda citas. Entiende el tiempo.</h2>
            <p>
              Suelta una cita sobre un horario ocupado y Bookeiro la reacomoda al espacio válido
              más cercano, sin doblar a nadie. Lo llamamos <em>corrección serena</em>.
            </p>
          </div>
          <ol className="lz-states">
            <li className="lz-state" data-tone="available">
              <span className="lz-step">01</span>
              <span className="lz-state-name"><span className="lz-tick" />Disponible</span>
              <p>El espacio libre en cada carril es disponibilidad real, calculada por profesional.</p>
            </li>
            <li className="lz-state" data-tone="move">
              <span className="lz-step">02</span>
              <span className="lz-state-name"><span className="lz-tick" />Mover</span>
              <p>Arrastras una cita a otra hora o a otro profesional. Se ajusta a la rejilla de 30 min.</p>
            </li>
            <li className="lz-state" data-tone="collision">
              <span className="lz-step">03</span>
              <span className="lz-state-name"><span className="lz-tick" />Colisión</span>
              <p>Cae sobre un horario ocupado. En vez de doblar, Bookeiro lo detecta.</p>
            </li>
            <li className="lz-state" data-tone="correction">
              <span className="lz-step">04</span>
              <span className="lz-state-name"><span className="lz-tick" />Corrección</span>
              <p>Busca el hueco válido más cercano en la misma agenda, respetando el horario.</p>
            </li>
            <li className="lz-state" data-tone="valid">
              <span className="lz-step">05</span>
              <span className="lz-state-name"><span className="lz-tick" />Válido</span>
              <p>La cita queda en un lugar posible. Nunca se guarda algo que no cabe.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* BUSINESS / LEDGER */}
      <section className="lz-section" id="caja">
        <div className="lz-ledger-grid">
          <div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', lineHeight: 1.04, marginBottom: '1rem' }}>
              Lo que pasa en la agenda, se refleja en la caja.
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', lineHeight: 1.55, maxWidth: '46ch', marginBottom: '1.5rem' }}>
              Cada cita confirmada, completada o cancelada actualiza el total al instante. Sin
              exportar, sin cuadrar planillas. El dinero es una consecuencia del tiempo — no una
              pantalla aparte.
            </p>
            <a href="#demo" className="lz-btn-link">Míralo moverse en la agenda</a>
          </div>
          <div className="lz-ledger-figures" role="group" aria-label="Resumen del día">
            <div className="lz-fig lz-fig-total">
              <span className="lz-fig-label">Total del día</span>
              <span className="lz-fig-value">{formatCop(LEDGER.total)}</span>
            </div>
            <div className="lz-fig lz-fig-sub">
              <span className="lz-fig-label">Completado</span>
              <span className="lz-fig-value">{formatCop(LEDGER.completedTotal)}</span>
            </div>
            <div className="lz-fig lz-fig-sub">
              <span className="lz-fig-label">Anticipo 50%</span>
              <span className="lz-fig-value">{formatCop(LEDGER.deposit)}</span>
            </div>
            <div className="lz-ledger-illus">
              <span className="lz-ledger-illus-tag">Ilustrativo</span>
              División barbero/casa 50/50 — el backend aún no modela comisión.
            </div>
          </div>
        </div>
      </section>

      <div className="lz-rule" />

      {/* MOBILE */}
      <section className="lz-section">
        <div className="lz-section-head">
          <h2>El mismo modelo, de lado.</h2>
          <p>
            En el teléfono la línea de tiempo gira: el tiempo corre hacia abajo y ves un profesional
            a la vez. Es el mismo motor de agenda — sólo cambia la orientación.
          </p>
        </div>
        <div className="lz-mobile-orient">
          <div className="lz-orient">
            <span className="lz-orient-axis">Escritorio · tiempo → X</span>
            <h3>Horizontal, todos los carriles</h3>
            <p>El día completo de un vistazo, con cada profesional en su fila y las horas a lo ancho.</p>
          </div>
          <div className="lz-orient">
            <span className="lz-orient-axis">Móvil · tiempo → Y</span>
            <h3>Vertical, un profesional</h3>
            <p>Las horas bajan por la pantalla; cambias de barbero con un toque. Misma agenda, mismas reglas.</p>
          </div>
        </div>
      </section>

      <div className="lz-rule" />

      {/* PRODUCT PRINCIPLES */}
      <section className="lz-section" id="producto">
        <div className="lz-section-head">
          <h2>Software de agenda, hecho como un instrumento.</h2>
          <p>Pocas reglas, muy firmes. Lo suficiente para correr un negocio de verdad.</p>
        </div>
        <div className="lz-principles">
          {PRINCIPLES.map((it) => (
            <article className="lz-principle" key={it.n}>
              <span className="lz-num">{it.n}</span>
              <h3>{it.h}</h3>
              <p>{it.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lz-final">
        <h2>Empieza a manejar tu tiempo.</h2>
        <p>Configura tu barbería, tu equipo y tu vitrina en minutos. Sin tarjeta.</p>
        <div className="lz-final-ctas">
          <Link href={primaryHref} className="lz-btn lz-btn-primary lz-btn-lg">
            {primaryLabel}
            <ArrowUpRight size={18} className="lz-arrow" />
          </Link>
          <Link href="/login" className="lz-btn lz-btn-ghost lz-btn-lg">Ya tengo cuenta</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lz-footer">
        <div className="lz-footer-inner">
          <div className="lz-wordmark"><span className="lz-mark" aria-hidden />Bookeiro</div>
          <ul className="lz-footer-links">
            <li><a href="#demo">La agenda</a></li>
            <li><a href="#producto">Producto</a></li>
            <li><Link href="/login">Entrar</Link></li>
          </ul>
          <span>© {new Date().getFullYear()} Bookeiro · Hecho para el cuidado personal.</span>
        </div>
      </footer>
    </div>
  )
}
