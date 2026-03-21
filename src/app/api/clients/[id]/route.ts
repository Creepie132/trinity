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
  const { phone, email, address, city, date_of_birth, notes, description, avatar_url } = body

  const name = body.name || `${body.first_name || ''} ${body.last_name || ''}`.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      city: city || null,
      date_of_birth: date_of_birth || null,
      notes: notes || null,
      description: description || null,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) {
    console.error('Update client error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
