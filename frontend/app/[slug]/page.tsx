import { notFound } from 'next/navigation'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import BookingWizard from './BookingWizard'

export const revalidate = 60 // Revalidate every minute

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const insforge = createInsForgeServerClient()
  
  const { data: tenant } = await insforge.database
    .from('tenants')
    .select('name, logo_url, description')
    .eq('slug', slug)
    .single()

  if (!tenant) return {}

  return {
    title: `${tenant.name} | Reservas`,
    description: tenant.description || `Reserva tu cita en ${tenant.name} rápidamente.`,
    icons: tenant.logo_url ? [{ url: tenant.logo_url }] : []
  }
}

export default async function PublicTenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const insforge = createInsForgeServerClient()
  
  const { data: tenant } = await insforge.database
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    notFound()
  }

  // Determine font variable based on selection
  let fontVar = 'var(--font-inter)'
  if (tenant.font_family === 'Playfair Display') fontVar = 'var(--font-playfair)'
  if (tenant.font_family === 'Space Grotesk') fontVar = 'var(--font-space)'

  // Use DB color or fallback
  const primaryColor = tenant.primary_color || '#D4AF37'

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--color-bg-base)',
       // Overriding root primary color for this local scope
      '--color-primary': primaryColor,
      fontFamily: fontVar,
    } as React.CSSProperties}>
      
      {/* ── HERO BANNER ── */}
      <div style={{ 
        height: '30vh', 
        minHeight: '250px',
        maxHeight: '400px',
        background: tenant.cover_image_url ? `url(${tenant.cover_image_url}) center/cover no-repeat` : 'var(--gradient-card)',
        borderBottom: `4px solid ${primaryColor}`,
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--color-bg-base))', opacity: 0.8 }} />
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 2rem', marginTop: '-80px', position: 'relative', zIndex: 10 }}>
        
        {/* Profile Card */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {tenant.logo_url ? (
             <img src={tenant.logo_url} alt={`Logo de ${tenant.name}`} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${primaryColor}`, backgroundColor: 'var(--color-bg-base)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', margin: '0 auto 1.5rem auto' }} />
          ) : (
             <div style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto 1.5rem auto', backgroundColor: 'var(--color-bg-base)', border: `4px solid ${primaryColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>💈</div>
          )}
          
          <h1 style={{ fontFamily: fontVar, fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.5rem'}}>
            {tenant.name}
          </h1>
          
          {tenant.description && (
             <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
               {tenant.description}
             </p>
          )}

          {/* Badges / Links */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {tenant.whatsapp && (
               <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#25D366', color: '#fff', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                 📱 WhatsApp
               </a>
            )}
            {tenant.instagram && (
               <a href={tenant.instagram.includes('http') ? tenant.instagram : `https://instagram.com/${tenant.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                 📸 Instagram
               </a>
            )}
            {tenant.map_url && (
               <a href={tenant.map_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-full)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                 📍 Cómo Llegar
               </a>
            )}
          </div>
        </div>

        {/* Interactive Booking Module */}
        <BookingWizard tenant={tenant} primaryColor={primaryColor} />

      </div>
      
      <footer style={{ textAlign: 'center', marginTop: '6rem', paddingBottom: '3rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
        Impulsado por <strong style={{ color: 'var(--color-primary)' }}>Bookeiro</strong>
      </footer>
    </div>
  )
}
