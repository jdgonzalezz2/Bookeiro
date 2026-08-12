import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────────────
   Testimonios reales de negocios beta.

   POBLAR con casos REALES únicamente (foto opcional + frase + nombre + negocio).
   Nunca inventar testimonios. Mientras el array esté vacío, la sección muestra
   un estado de invitación elegante en vez de prueba social falsa.

   Ejemplo de entrada:
     { quote: 'Dejé de perder citas por WhatsApp.', name: 'Carlos M.',
       business: 'Barbería Norte', city: 'Medellín', avatar: '/…/carlos.jpg' }
   ────────────────────────────────────────────────────────────────────────── */
type Testimonial = {
  quote: string
  name: string
  business: string
  city?: string
  avatar?: string
}

const TESTIMONIALS: Testimonial[] = []

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Testimonials() {
  // Estado vacío: aún no hay casos reales. Se muestra una invitación honesta.
  if (TESTIMONIALS.length === 0) {
    return (
      <section className="lz-section lz-testi" id="testimonios">
        <div className="lz-testi-empty" data-reveal>
          <span className="lz-testi-eyebrow">Historias reales</span>
          <h2>Los primeros negocios ya están entrando.</h2>
          <p>
            Estamos incorporando las barberías, salones y spas fundadores. Cuando compartan su
            experiencia, la vas a ver aquí — real y verificable, nunca inventada.
          </p>
          <Link href="/register" className="lz-btn lz-btn-primary lz-btn-lg">
            Ser de los primeros
            <ArrowUpRight size={18} className="lz-arrow" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="lz-section lz-testi" id="testimonios">
      <div className="lz-section-head is-center" data-reveal>
        <span className="lz-testi-eyebrow">Historias reales</span>
        <h2>Lo que dicen los negocios que ya usan Bookeiro.</h2>
      </div>
      <div className="lz-testi-grid">
        {TESTIMONIALS.map((t, i) => (
          <figure className="lz-testi-card" key={`${t.name}-${t.business}`} data-reveal style={{ '--rv': i } as React.CSSProperties}>
            <blockquote>“{t.quote}”</blockquote>
            <figcaption>
              <span className="lz-testi-avatar" aria-hidden>
                {t.avatar ? <img src={t.avatar} alt="" /> : initials(t.name)}
              </span>
              <span className="lz-testi-who">
                <b>{t.name}</b>
                <span>{t.city ? `${t.business} · ${t.city}` : t.business}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
