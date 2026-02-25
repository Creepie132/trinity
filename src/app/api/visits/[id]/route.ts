import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { scheduled_at, duration_minutes, notes, price } = body

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
  if (notes !== undefined) updateData.notes = notes
  if (price !== undefined) updateData.price = price

  const { data, error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', id)
    .eq('org_id', orgUser.org_id)
    .select()
    .single()

  if (error) {
    console.error('Update visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
