import { Globe, Users, User, Wallet, BarChart3 } from 'lucide-react'

/**
 * Hero "connected system" — the thesis that Bookeiro is ONE system, not six loose
 * apps: everything orbits your agenda. The real, working pillars sit around a
 * central agenda hub; a booking travels in from the public storefront (Vitrina)
 * and the register (Caja) reacts. Only LIVE capabilities are shown — no payments,
 * payouts or commissions, which aren't wired yet. Pure-CSS motion, reduced-motion
 * safe. The honest interactive proof is the DEMO rail below.
 */
const NODES = [
  { key: 'vitrina', label: 'Vitrina', sub: 'reservas', Icon: Globe },
  { key: 'reportes', label: 'Reportes', sub: 'analíticas', Icon: BarChart3 },
  { key: 'equipo', label: 'Equipo', sub: 'horarios', Icon: Users },
  { key: 'caja', label: 'Caja', sub: 'del día', Icon: Wallet },
  { key: 'clientes', label: 'Clientes', sub: 'historial', Icon: User },
] as const

export default function HeroSystem() {
  return (
    <div className="lz-sys" aria-hidden>
      <span className="lz-sys-glow" />

      {/* Connectors — energy flowing inward toward the agenda. */}
      <svg className="lz-sys-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line className="lz-sys-link" data-k="vitrina" x1="15" y1="15" x2="50" y2="50" />
        <line className="lz-sys-link" data-k="reportes" x1="83" y1="14" x2="50" y2="50" />
        <line className="lz-sys-link" data-k="equipo" x1="87" y1="53" x2="50" y2="50" />
        <line className="lz-sys-link" data-k="caja" x1="73" y1="88" x2="50" y2="50" />
        <line className="lz-sys-link" data-k="clientes" x1="16" y1="85" x2="50" y2="50" />
      </svg>

      {/* The booking that travels from Vitrina into the agenda. */}
      <span className="lz-sys-travel" />

      {NODES.map(({ key, label, sub, Icon }) => (
        <div className={`lz-sys-node lz-sys-${key}`} key={key}>
          <span className="lz-sys-node-ic"><Icon size={16} strokeWidth={1.75} /></span>
          <span className="lz-sys-node-tx">
            <span className="lz-sys-node-lb">{label}</span>
            <span className="lz-sys-node-sb">{sub}</span>
          </span>
        </div>
      ))}

      {/* Central agenda hub — a miniature echo of the real rail. */}
      <div className="lz-sys-hub">
        <span className="lz-sys-hub-tag">Agenda</span>
        <div className="lz-sys-hub-rail">
          <span className="lz-sys-hub-lane"><i style={{ left: '8%', width: '26%' }} data-t="done" /><i style={{ left: '48%', width: '30%' }} data-t="now" /></span>
          <span className="lz-sys-hub-lane"><i style={{ left: '20%', width: '28%' }} data-t="confirmed" /><i style={{ left: '64%', width: '24%' }} data-t="confirmed" /></span>
          <span className="lz-sys-hub-lane"><i style={{ left: '10%', width: '22%' }} data-t="confirmed" /><i style={{ left: '54%', width: '30%' }} data-t="done" /></span>
          <span className="lz-sys-hub-now" />
        </div>
      </div>
    </div>
  )
}
