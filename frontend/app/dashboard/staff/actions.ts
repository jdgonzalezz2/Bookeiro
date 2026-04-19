'use server'

import { createInsForgeServerClient } from '@/lib/insforge-server'
import { getAccessToken } from '@/lib/cookies'
import { revalidatePath } from 'next/cache'

import { getCurrentProfile } from '@/lib/auth'

async function getClientAndTenant() {
  const accessToken = await getAccessToken()
  if (!accessToken) throw new Error('Not logged in')
  const insforge = createInsForgeServerClient(accessToken)
  
  const profile = await getCurrentProfile()
  if (!profile || !profile.tenant_id) throw new Error('No tenant context')
  
  return { insforge, tenantId: profile.tenant_id }
}

export async function createStaffAction(params: {
  name: string, 
  invite_email: string,
  avatar_url?: string,
  instagram?: string,
  specialty?: string,
  bio?: string
}) {
  const { name, invite_email, avatar_url, instagram, specialty, bio } = params
  try {
    const { insforge, tenantId } = await getClientAndTenant()
    
    // Fetch tenant name for the invitation
    const { data: tenant } = await insforge.database.from('tenants').select('name').eq('id', tenantId).single()
    const tenantName = tenant?.name || 'Bookeiro'

    const payload: any = { 
      tenant_id: tenantId, 
      name,
      avatar_url: avatar_url || null,
      instagram: instagram?.trim() || null,
      specialty: specialty?.trim() || null,
      bio: bio?.trim() || null
    }
    
    if (invite_email.trim()) payload.invite_email = invite_email.trim()

    const { error: dbError } = await insforge.database
      .from('staff')
      .insert(payload)
      
    if (dbError) return { error: dbError.message }

    // 🔥 Native Invitation via InsMessage
    if (invite_email.trim()) {
      try {
        await insforge.functions.invoke('insmessage', {
          body: {
            type: 'staff_invite',
            payload: {
              email: invite_email.trim(),
              staffName: name,
              tenantName: tenantName
            }
          }
        })
      } catch (msgErr) {
        console.error('Failed to trigger insmessage:', msgErr)
      }
    }
    
    revalidatePath('/dashboard/staff')
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function updateStaffAction(staffId: string, params: {
  name?: string,
  avatar_url?: string,
  instagram?: string,
  specialty?: string,
  bio?: string,
  is_active?: boolean
}) {
  try {
    const { insforge, tenantId } = await getClientAndTenant()
    
    // Validate authorization: Either owner of tenant OR the staff member themselves
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Not authenticated')

    const { data: tenantRow } = await insforge.database.from('tenants').select('owner_id').eq('id', tenantId).single()
    const isOwner = tenantRow?.owner_id === profile.id

    const { data: staff } = await insforge.database
      .from('staff')
      .select('id, user_id')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .single()
      
    if (!staff) return { error: 'No encontrado' }

    const isSelf = staff.user_id === profile.id
    if (!isOwner && !isSelf) return { error: 'No autorizado para editar este perfil' }

    const { error: dbError } = await insforge.database
      .from('staff')
      .update(params)
      .eq('id', staffId)
      
    if (dbError) return { error: dbError.message }

    revalidatePath('/dashboard/staff')
    revalidatePath(`/dashboard/staff/${staffId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function saveWorkingHoursAction(staffId: string, hours: any[]) {
  try {
    const { insforge, tenantId } = await getClientAndTenant()
    
    // Validate owner over staff
    const { data: staff } = await insforge.database.from('staff').select('id').eq('id', staffId).eq('tenant_id', tenantId).single()
    if (!staff) return { error: 'No autorizado' }

    // Clear old hours
    await insforge.database.from('working_hours').delete().eq('staff_id', staffId)

    // Insert new hours
    const toInsert = hours.map(h => ({
      tenant_id: tenantId,
      staff_id: staffId,
      day_of_week: h.day_of_week,
      start_time: h.start_time,
      end_time: h.end_time,
      is_active: h.is_active
    }))

    if (toInsert.length > 0) {
      const { error } = await insforge.database.from('working_hours').insert(toInsert)
      if (error) return { error: error.message }
    }
    
    revalidatePath(`/dashboard/staff/${staffId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
