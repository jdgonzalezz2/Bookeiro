'use client'

import { useState, useMemo } from 'react'
import { Search, User, Phone, Calendar, ArrowUpRight, TrendingUp, Users as UsersIcon, Wallet } from 'lucide-react'

interface Appointment {
  customer_name: string
  customer_phone: string
  total_price: number
  start_time: string
  status: string
}

interface CustomerStats {
  name: string
  phone: string
  totalVisits: number
  totalSpent: number
  lastVisit: string
}

export default function CustomersClient({ appointments }: { appointments: Appointment[] }) {
  const [search, setSearch] = useState('')

  // Aggregate appointments into unique customers
  const customersMap = useMemo(() => {
    const map: Record<string, CustomerStats> = {}
    
    appointments.forEach(app => {
      const phone = app.customer_phone || 'Desconocido'
      if (!map[phone]) {
        map[phone] = {
          name: app.customer_name || 'Sin Nombre',
          phone: phone,
          totalVisits: 0,
          totalSpent: 0,
          lastVisit: app.start_time
        }
      }
      
      map[phone].totalVisits += 1
      map[phone].totalSpent += Number(app.total_price || 0)
      
      // Update last visit if this one is newer
      if (new Date(app.start_time) > new Date(map[phone].lastVisit)) {
        map[phone].lastVisit = app.start_time
      }
    })
    
    return Object.values(map)
  }, [appointments])

  // Filter based on search
  const filteredCustomers = useMemo(() => {
    return customersMap.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search)
    )
  }, [customersMap, search])

  // Global KPIs
  const totalLTV = customersMap.reduce((acc, curr) => acc + curr.totalSpent, 0)
  const avgLTV = customersMap.length > 0 ? totalLTV / customersMap.length : 0

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* ── Header & Stats ── */}
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
          Base de Clientes
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2.5rem' }}>
          Gestiona y conoce el valor de tu comunidad en tiempo real.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(198,152,47,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UsersIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Clientes</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{customersMap.length}</div>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(0,200,83,0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Promedio (LTV)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${Math.round(avgLTV).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor de Cartera</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${totalLTV.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ 
        background: 'var(--color-bg-card)', 
        border: '1px solid var(--color-border)', 
        borderRadius: '24px', 
        padding: '1.5rem', 
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="form-input" 
            style={{ paddingLeft: '3rem', width: '100%', borderRadius: '16px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Customers List ── */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--color-bg-surface)', borderRadius: '24px', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>No se encontraron clientes con esos criterios.</p>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.phone} className="luxury-card" style={{ 
              background: 'var(--color-bg-card)', 
              border: '1px solid var(--color-border)', 
              borderRadius: '24px', 
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              cursor: 'default'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: '18px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <User size={28} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{customer.name}</h3>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} style={{ opacity: 0.5 }} /> {customer.phone}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} style={{ opacity: 0.5 }} /> Última: {new Date(customer.lastVisit).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', textAlign: 'right' }}>
                <div style={{ minWidth: '80px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Citas</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{customer.totalVisits}</div>
                </div>
                <div style={{ minWidth: '110px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gasto Total</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)' }}>${customer.totalSpent.toLocaleString()}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '0.6rem', minWidth: 'auto', borderRadius: '12px' }}>
                  <ArrowUpRight size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .luxury-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-primary);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  )
}
