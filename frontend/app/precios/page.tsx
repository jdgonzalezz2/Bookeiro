import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Check } from 'lucide-react'
import '../landing/landing.css'
import LandingNav from '../landing/LandingNav'
import LandingFooter from '../landing/LandingFooter'
import LandingMotion from '../landing/LandingMotion'

export const metadata: Metadata = {
  title: 'Precios — Bookeiro',
  description:
    'Precios simples y transparentes. Empieza gratis, sin tarjeta, y pásate a Pro cuando tu negocio crezca. Sin permanencia, sin letra pequeña.',
}

const FREE_FEATURES = [
  '1 sede',
  'Hasta 3 profesionales',
  'Vitrina pública con tu marca',
  'Agenda con detección de colisiones',
  'Reservas sin cuenta para tus clientes',
]

const PRO_FEATURES = [
  'Múltiples sedes',
  'Profesionales ilimitados',
  'Comisiones automáticas por profesional',
  'Recordatorios automáticos de citas',
  'Reportes avanzados del negocio',
]

const FAQ = [
  {
    q: '¿Necesito tarjeta de crédito para empezar?',
    a: 'No. El plan Gratis es gratis para siempre y no te pide ningún dato de pago para registrarte y recibir reservas.',
  },
  {
    q: '¿Mis clientes tienen que descargar una app o crear una cuenta?',
    a: 'No. Reservan directo desde tu vitrina pública con solo su nombre y teléfono. Sin apps, sin registros, sin fricción.',
  },
  {
    q: '¿Puedo cambiar de plan cuando quiera?',
    a: 'Sí. Empiezas en Gratis y pasas a Pro (o vuelves) cuando lo necesites. Sin permanencia ni penalizaciones.',
  },
  {
    q: '¿Qué pasa con los datos de mi negocio y mis clientes?',
    a: 'Cada negocio está aislado con seguridad a nivel de fila. La información de tus clientes solo la ven tú y tu equipo, nadie más.',
  },
]

export default function PreciosPage() {
  return (
    <div className="landing-shell">
      <LandingNav variant="page" />

      <section className="lz-pricing">
        <div className="lz-pricing-head" data-reveal>
          <h1>Precios simples y transparentes.</h1>
          <p>
            Empieza gratis, sin tarjeta. Pásate a Pro cuando tu negocio crezca. Sin sorpresas y sin
            letra pequeña.
          </p>
          <div className="lz-pricing-meta">
            <span>Sin tarjeta</span>
            <span>Sin permanencia</span>
            <span>En pesos colombianos</span>
          </div>
        </div>
      </section>

      <div className="lz-plans">
        {/* PLAN GRATIS */}
        <article className="lz-plan" data-reveal style={{ '--rv': 0 } as React.CSSProperties}>
          <div className="lz-plan-name">Gratis</div>
          <div className="lz-plan-tagline">Para empezar y recibir tus primeras reservas.</div>
          <div className="lz-plan-price">
            <span className="lz-plan-amount">$0</span>
            <span className="lz-plan-period">para siempre</span>
          </div>
          <div className="lz-plan-note">Sin tarjeta, sin vencimiento.</div>
          <Link href="/register" className="lz-btn lz-btn-ghost lz-btn-lg">
            Empezar gratis
            <ArrowUpRight size={18} className="lz-arrow" />
          </Link>
          <ul className="lz-plan-features">
            {FREE_FEATURES.map((f) => (
              <li key={f}><Check size={17} strokeWidth={2.25} />{f}</li>
            ))}
          </ul>
        </article>

        {/* PLAN PRO */}
        <article className="lz-plan lz-plan-featured" data-reveal style={{ '--rv': 1 } as React.CSSProperties}>
          <span className="lz-plan-badge">Recomendado</span>
          <div className="lz-plan-name">Pro</div>
          <div className="lz-plan-tagline">Para crecer y manejar todo tu negocio en un solo lugar.</div>
          <div className="lz-plan-price">
            <span className="lz-plan-amount">$69.900</span>
            <span className="lz-plan-period">COP / mes</span>
          </div>
          <div className="lz-plan-note">Empieza gratis y actívalo cuando quieras.</div>
          <Link href="/register" className="lz-btn lz-btn-primary lz-btn-lg">
            Crear cuenta
            <ArrowUpRight size={18} className="lz-arrow" />
          </Link>
          <ul className="lz-plan-features">
            <li className="lz-feat-lead"><Check size={17} strokeWidth={2.25} />Todo lo del plan Gratis, y además:</li>
            {PRO_FEATURES.map((f) => (
              <li key={f}><Check size={17} strokeWidth={2.25} />{f}</li>
            ))}
          </ul>
        </article>
      </div>

      <section className="lz-faq">
        <h2 data-reveal>Preguntas frecuentes</h2>
        {FAQ.map((item, i) => (
          <div className="lz-faq-item" key={item.q} data-reveal style={{ '--rv': i } as React.CSSProperties}>
            <div className="lz-faq-q">{item.q}</div>
            <p className="lz-faq-a">{item.a}</p>
          </div>
        ))}
      </section>

      <LandingFooter />
      <LandingMotion />
    </div>
  )
}
