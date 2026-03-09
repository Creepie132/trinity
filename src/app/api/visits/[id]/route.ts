import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error
  
  const { orgId, supabase } = auth

  const { id } = await params
  const body = await request.json()
  const { scheduled_at, service_id, duration_minutes, notes, price } = body

  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
  if (service_id !== undefined) {
    updateData.service_id = service_id
    updateData.service_type = service_id // Keep service_type in sync for backward compatibility
  }
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
  if (notes !== undefined) updateData.notes = notes
  if (price !== undefined) updateData.price = price

  const { data, error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Update visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
