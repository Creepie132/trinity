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
  const { name, phone, email, address, notes, avatar_url } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Получаем org_id пользователя
  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgUser.org_id)
    .select()
    .single()

  if (error) {
    console.error('Update client error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
