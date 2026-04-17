'use client'

import { useState, useMemo } from 'react'
import { Building2, ArrowRight, ArrowDownLeft, Clock, CheckCircle2, Wallet, RefreshCw } from 'lucide-react'

export default function FinanceClient({ appointments }: { appointments: any[] }) {
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  // The platform retains a 50% upfront fee.
  const retainedBalance = useMemo(() => {
    const totalGross = appointments.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0)
    return totalGross * 0.5 // 50% liquid balance.
  }, [appointments])

  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    // Simulate API Call to Stripe Connect Payouts
    await new Promise(resolve => setTimeout(resolve, 2500))
    setIsWithdrawing(false)
    setWithdrawSuccess(true)
  }

  return (
    <div style={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* BALANCE CARD */}
      <div style={{ 
        background: 'linear-gradient(145deg, var(--color-bg-card) 0%, #1a1a24 100%)', 
        border: '1px solid var(--color-glass-border)', 
        borderRadius: '24px', 
        padding: '3rem 2rem', 
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <Wallet size={16} /> Saldo Líquido Disponible
            </div>
            <h1 style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              ${retainedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', fontWeight: 500 }}> USD</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Monto recaudado de reservas online (50% de anticipo de clientes).
            </p>
          </div>

          <div style={{ minWidth: '240px' }}>
            {withdrawSuccess ? (
              <div style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '1.25rem', borderRadius: '16px', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                <CheckCircle2 size={24} /> Transferencia Iniciada
              </div>
            ) : (
              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || retainedBalance === 0}
                style={{ 
                  width: '100%',
                  background: 'var(--gradient-brand)', 
                  color: '#000', 
                  border: 'none', 
                  borderRadius: '16px', 
                  padding: '1.25rem', 
                  fontWeight: 700, 
                  fontSize: '1.05rem',
                  cursor: isWithdrawing || retainedBalance === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px -5px rgba(201,168,76,0.4)',
                  opacity: retainedBalance === 0 ? 0.5 : 1
                }}
              >
                {isWithdrawing ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" /> Procesando Payout...
                  </>
                ) : (
                  <>
                     Retirar a Banco <ArrowRight size={20} />
                  </>
                )}
              </button>
            )}
            {!withdrawSuccess && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.7rem', justifyContent: 'center' }}>
                  <Building2 size={12} /> Depositado en terminación **1424 (ACH)
               </div>
            )}
          </div>
        </div>
      </div>

      {/* TRANSACTIONS LIST */}
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.2rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={18} className="text-primary" /> Historial de Cobros Recientes
      </h3>
      
      <div style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
        {appointments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No hay desembolsos registrados aún.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {appointments.map((app, i) => {
              const upfrontPayment = Number(app.total_price || 0) * 0.5
              return (
                <div key={app.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem 1.5rem', 
                  borderBottom: i !== appointments.length - 1 ? '1px solid var(--color-glass-border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71' }}>
                      <ArrowDownLeft size={18} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '0.95rem' }}>
                        Cobro reserva - {app.customer_name}
                      </p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0, marginTop: '2px' }}>
                        {new Date(app.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })} • {app.services?.name}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontWeight: 700, color: '#2ecc71', fontSize: '1.05rem' }}>
                        +${upfrontPayment.toFixed(2)}
                     </div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '4px' }}>
                       Completado
                     </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
