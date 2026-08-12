import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getCurrentUser } from '@/lib/auth'

/**
 * Nav compartido del sitio de marketing (landing + precios + futuras páginas).
 * Auth-aware: si hay sesión, el CTA principal lleva al dashboard.
 *
 *  variant="landing" → enlaces por ancla dentro de la home (#demo, #caja…).
 *  variant="page"    → enlaces absolutos a las secciones de la home (/#demo…),
 *                      para usarse desde otra ruta como /precios.
 *
 * El sticky + la sombra al hacer scroll (data-scrolled) los gestiona
 * LandingMotion observando `.lz-nav` en el DOM.
 */
export default async function LandingNav({ variant = 'landing' }: { variant?: 'landing' | 'page' }) {
  const user = await getCurrentUser()
  const primaryHref = user ? '/dashboard' : '/register'
  const primaryLabel = user ? 'Ir al dashboard' : 'Empezar gratis'
  const home = (hash: string) => (variant === 'landing' ? hash : `/${hash}`)

  return (
    <header className="lz-nav">
      <div className="lz-nav-inner">
        <Link href="/" className="lz-wordmark" aria-label="Bookeiro">
          <span className="lz-mark" aria-hidden />
          Bookeiro
        </Link>
        <nav aria-label="Secciones">
          <ul className="lz-nav-links">
            <li><Link href={home('#demo')}>La agenda</Link></li>
            <li><Link href={home('#caja')}>Caja</Link></li>
            <li><Link href={home('#producto')}>Producto</Link></li>
            <li><Link href="/precios">Precios</Link></li>
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
  )
}
