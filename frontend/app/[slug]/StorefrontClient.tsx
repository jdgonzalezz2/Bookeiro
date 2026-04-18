'use client'

import { useState } from 'react'
import BookingModal from './BookingModal'

export default function StorefrontClient({ tenant, primaryColor, fontVar, services, staffList, reviews }: {
  tenant: any, primaryColor: string, fontVar: string, services: any[], staffList: any[], reviews: any[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialServiceId, setInitialServiceId] = useState<string|undefined>()
  const [initialStaffId, setInitialStaffId] = useState<string|undefined>()

  const isLight = tenant.theme === 'light' || !tenant.theme

  // Definición de Tema Local Dinámico para esta ruta
  const themeStyles = {
    '--color-bg-base': isLight ? '#f9fafb' : '#0a0a0a',
    '--color-text-primary': isLight ? '#111827' : '#ffffff',
    '--color-text-secondary': isLight ? '#4b5563' : '#a1a1aa',
    '--color-text-muted': isLight ? '#6b7280' : '#71717a',
    '--color-border': isLight ? '#e5e7eb' : '#27272a',
    '--color-glass': isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
    '--color-glass-border': isLight ? '#f3f4f6' : 'rgba(255, 255, 255, 0.05)',
    '--color-primary': primaryColor,
    fontFamily: fontVar,
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-primary)',
    minHeight: '100vh',
    paddingBottom: '4rem'
  } as React.CSSProperties

  const openBooking = (serviceId?: string, staffId?: string) => {
    setInitialServiceId(serviceId)
    setInitialStaffId(staffId)
    setModalOpen(true)
  }

  // Helper Card Style Booksy-like
  const cardStyle = {
    background: 'var(--color-glass)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: isLight ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
  }

  // Reviews Math
  const totalReviews = reviews?.length || 0;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1) : '0.0';
  const ratingBars = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    return { s: stars, p: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0 };
  });

  const layoutStyle = tenant.layout_style || 'classic';
  const coverBg = tenant.cover_image_url ? `url(${tenant.cover_image_url}) center/cover no-repeat` : `var(--color-primary)`;

  // ─── SHARED COMPONENTS ───

  const LogoElement = ({ small = false }: { small?: boolean }) => {
    const size = small ? 60 : 120;
    return tenant.logo_url ? (
      <img src={tenant.logo_url} alt="Logo" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid var(--color-bg-base)`, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginBottom: small ? 0 : '1.5rem' }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--color-glass)', border: `3px solid var(--color-border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: small ? '1.5rem' : '3rem', marginBottom: small ? 0 : '1.5rem' }}>💈</div>
    )
  }

  const MainInfo = () => (
    <div>
      {layoutStyle !== 'minimal' && <LogoElement />}
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{tenant.name}</h1>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(tenant.tags || []).map((tag: string) => (
          <span key={tag} style={{ border: '1px solid var(--color-border)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem' }}>{tag}</span>
        ))}
        {(!tenant.tags || tenant.tags.length === 0) && (
          <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Servicios premium.</span>
        )}
      </div>

      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.8rem' }}>Sobre nosotros</h2>
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {tenant.description || `Bienvenido a ${tenant.name}. Atrévete a lucir diferente, contamos con servicios especializados de la mejor calidad.`}
      </p>
    </div>
  )

  const QuickInfo = () => (
    <div style={{ ...cardStyle, alignSelf: 'start', marginTop: layoutStyle === 'minimal' ? 0 : '20px' }}>
      {tenant.address && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>📍</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Dirección</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>{tenant.address}</div>
            {tenant.map_url && <a href={tenant.map_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>Ver dirección</a>}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>🖼️</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>Portafolio</div>
          {tenant.logo_url && <img src={tenant.logo_url} style={{ width: 80, height: 80, borderRadius: '8px', objectFit: 'cover' }} alt="Portafolio" />}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>⏰</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Horario hoy</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>09:00 - 20:00 (Varía por profesional)</div>
        </div>
      </div>
    </div>
  )

  const ServicesList = () => (
    <div style={{ marginBottom: '4rem' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>Servicios</h2>
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {services.map(s => (
          <div key={s.id} style={{ ...cardStyle, minWidth: '280px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: 50, height: 50, borderRadius: '8px', background: 'var(--color-glass)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👤</div>
                <span style={{ background: 'var(--color-glass)', color: 'var(--color-primary)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid var(--color-primary)' }}>🔥 Popular</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>{s.name}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.8rem', minHeight: '35px' }}>{s.description?.substring(0,60) || '(precio varía según barbero)'}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: 'auto' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.duration_mins} min</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>${s.base_price}</div>
              </div>
              <button onClick={() => openBooking(s.id)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Reservar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const StaffListGroup = () => (
    <div style={{ marginBottom: '4rem' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>Colaboradores</h2>
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {staffList.map(st => (
          <div key={st.id} onClick={() => openBooking(undefined, st.id)} style={{ ...cardStyle, minWidth: '160px', flex: '0 0 auto', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-border)', margin: '0 auto 1rem', overflow: 'hidden', padding: '3px', border: `2px solid var(--color-primary)` }}>
              {st.avatar_url ? <img src={st.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="Staff" /> : <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'var(--color-bg-base)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem'}}>🧑</div>}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>{st.name}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Barbero</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>⭐ 5.0</div>
          </div>
        ))}
      </div>
    </div>
  )

  const ReviewsList = () => (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.5rem' }}>Reseñas</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 200px) 1fr', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b' }}>{avgRating}</div>
          <div style={{ color: '#f59e0b', fontSize: '1.5rem', margin: '0.5rem 0' }}>{'⭐'.repeat(Math.round(parseFloat(avgRating)) || 0)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{totalReviews} reseñas</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ratingBars.map(bar => (
            <div key={bar.s} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <span style={{ width: 15 }}>{bar.s}★</span>
              <div style={{ flex: 1, height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${bar.p}%`, height: '100%', background: '#f59e0b', transition: 'width 0.5s' }}></div>
              </div>
              <span style={{ width: 30, textAlign: 'right', color: 'var(--color-text-muted)' }}>{bar.p}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {totalReviews === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>Esta barbería aún no cuenta con reseñas.</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} style={{ ...cardStyle, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: 40, height: 40, background: '#e0e7ff', color: '#3730a3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {r.customer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '0.8rem' }}>{'⭐'.repeat(r.rating)}</div>
              {r.comment && (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  "{r.comment}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )

  const ContentBelowInfo = () => (
    <>
      <ServicesList />
      <StaffListGroup />
      <ReviewsList />
      <BookingModal 
        isOpen={modalOpen} onClose={() => setModalOpen(false)} 
        tenant={tenant} primaryColor={primaryColor}
        initialServiceId={initialServiceId} initialStaffId={initialStaffId}
        services={services} staffList={staffList}
      />
    </>
  )

  // ─── RENDERING LAYOUTS ───

  if (layoutStyle === 'minimal') {
    return (
      <div style={themeStyles}>
        <div style={{ padding: '1rem 2rem', borderBottom: `1px solid var(--color-border)`, display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--color-glass)' }}>
          <LogoElement small />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{tenant.name}</h1>
        </div>
        <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <MainInfo />
            <QuickInfo />
          </div>
          <ContentBelowInfo />
        </div>
      </div>
    )
  }

  if (layoutStyle === 'split') {
    return (
      <div style={{ ...themeStyles, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 0 }}>
        {/* Left Side (Cover) */}
        <div style={{ flex: '1 1 40%', minWidth: '300px', minHeight: '350px', background: coverBg, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent, var(--color-bg-base))', opacity: 0.6 }} />
        </div>
        {/* Right Side (Content) */}
        <div style={{ flex: '1 1 60%', padding: '3rem 2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <MainInfo />
              <QuickInfo />
            </div>
            <ContentBelowInfo />
          </div>
        </div>
      </div>
    )
  }

  // Classic Layout (Default)
  return (
    <div style={themeStyles}>
      <div style={{ 
        height: '280px', 
        background: coverBg,
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--color-bg-base))', opacity: 0.9 }} />
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 1.5rem', marginTop: '-140px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <MainInfo />
          <QuickInfo />
        </div>
        <ContentBelowInfo />
      </div>
    </div>
  )
}
