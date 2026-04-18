'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scissors, FileText, Users, Calendar, Clock, ShoppingBag, History, BarChart3, Settings, LogOut, ArrowUpRight, LayoutDashboard, ListFilter, CreditCard, Palette } from 'lucide-react'
import { signOutAction } from './actions'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Sidebar({ profile, tenant }: { profile: any, tenant: any }) {
  const pathname = usePathname()
  const isBarber = profile?.role === 'barber'

  const rawGroups = [
    {
      title: 'Gestionar',
      items: [
        { label: 'Inicio', icon: <LayoutDashboard size={18} strokeWidth={1.5} />, href: '/dashboard', exact: true },
        { label: 'Agenda de citas', icon: <Calendar size={18} strokeWidth={1.5} />, href: '/dashboard/booking' },
        { label: 'Profesionales', icon: <Users size={18} strokeWidth={1.5} />, href: '/dashboard/staff', roles: ['owner'] },
        { label: 'Servicios', icon: <ListFilter size={18} strokeWidth={1.5} />, href: '/dashboard/services', roles: ['owner'] },
        { label: 'Base de Clientes', icon: <Users size={18} strokeWidth={1.5} />, href: '/dashboard/clients' },
      ]
    },
    {
      title: 'Administración',
      roles: ['owner'],
      items: [
        { label: 'Finanzas y Caja', icon: <CreditCard size={18} strokeWidth={1.5} />, href: '/dashboard/finance' },
        { label: 'Reportes y Analíticas', icon: <BarChart3 size={18} strokeWidth={1.5} />, href: '/dashboard/analytics' },
        { label: 'Diseño del Portal', icon: <Palette size={18} strokeWidth={1.5} />, href: '/dashboard/settings' },
      ]
    }
  ]

  // Filter groups and items based on role
  const navGroups = rawGroups
    .filter(group => !group.roles || group.roles.includes(profile?.role || 'owner'))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !(item as any).roles || (item as any).roles.includes(profile?.role || 'owner'))
    }))

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '1.25rem' }}>
          <Link href="/dashboard" className="dashboard-sidebar-logo">
            <div className="dashboard-sidebar-logo-icon">
              <Scissors strokeWidth={2.5} size={18} />
            </div>
            <span className="dashboard-sidebar-logo-name">Bookeiro</span>
          </Link>
          <ThemeToggle />
        </div>

        {tenant && (
          <a 
            href={`/${tenant.slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-vitrina"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.6rem', 
              background: 'var(--gradient-brand)', 
              color: '#111', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              textDecoration: 'none', 
              fontWeight: 700, 
              fontSize: '0.8rem',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 12px rgba(201,168,76,0.15)',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(201,168,76,0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(201,168,76,0.15)';
            }}
          >
            VER MI VITRINA <ArrowUpRight size={16} />
          </a>
        )}
      </div>

      <div className="dashboard-sidebar-nav" style={{ flex: 1 }}>
        {navGroups.map((group, idx) => (
          <div className="dashboard-sidebar-group" key={idx}>
            <div className="dashboard-sidebar-title" style={{ marginBottom: '0.25rem' }}>{group.title}</div>
            {group.items.map((item: any) => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link key={item.label} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`} style={{ padding: '0.5rem 0.75rem' }}>
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="dashboard-sidebar-footer" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 32, height: 32, background: 'var(--color-glass)', border: '1px solid var(--color-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '0.9rem', position: 'relative' }}>
            👤
            {isBarber && (
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: '#3b82f6', borderRadius: '50%', border: '2px solid var(--color-bg-base)' }} />
            )}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {profile?.name || (isBarber ? 'Barbero' : 'Propietario')}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isBarber ? 'Empleado' : 'Administrador'} • {profile?.email?.split('@')[0]}
            </div>
          </div>
        </div>
        
        <form action={signOutAction}>
          <button type="submit" className="sidebar-link" style={{ color: 'var(--color-text-secondary)', padding: '0.4rem 0', fontSize: '0.8rem' }}>
            <LogOut size={16} strokeWidth={1.5} /> Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
