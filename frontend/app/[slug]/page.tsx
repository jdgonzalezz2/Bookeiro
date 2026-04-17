import { notFound } from 'next/navigation'
import { createInsForgeServerClient } from '@/lib/insforge-server'
import StorefrontClient from './StorefrontClient'

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

  // Pre-fetch services and staff serverside to inject into the storefront
  const [{ data: services }, { data: staffList }, { data: reviews }] = await Promise.all([
    insforge.database.from('services').select('*').eq('tenant_id', tenant.id).eq('is_active', true),
    insforge.database.from('staff').select('*').eq('tenant_id', tenant.id).eq('is_active', true),
    insforge.database.from('reviews').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false })
  ])

  // Determine font variable based on selection
  let fontVar = 'var(--font-inter)'
  if (tenant.font_family === 'Playfair Display') fontVar = 'var(--font-playfair)'
  if (tenant.font_family === 'Space Grotesk') fontVar = 'var(--font-space)'

  const primaryColor = tenant.primary_color || '#D4AF37'

  return (
    <StorefrontClient 
      tenant={tenant} 
      primaryColor={primaryColor} 
      fontVar={fontVar} 
      services={services || []} 
      staffList={staffList || []} 
      reviews={reviews || []}
    />
  )
}
