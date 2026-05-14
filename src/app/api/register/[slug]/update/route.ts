import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public — no auth. PATCH /api/register/[slug]/update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { client_id, first_name, last_name, email, date_of_birth, address, preferred_languages } = body

    if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await supabase
      .from('organizations')
      .select('id, registration_enabled')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!org.registration_enabled) return NextResponse.json({ error: 'Disabled' }, { status: 403 })

    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (first_name?.trim()) updates.first_name = first_name.trim()
    if (last_name !== undefined) updates.last_name = last_name.trim()
    if (email?.trim()) updates.email = email.trim().toLowerCase()
    if (date_of_birth) updates.date_of_birth = date_of_birth
    if (address !== undefined) updates.address = address.trim() || null
    if (preferred_languages) updates.preferred_languages = preferred_languages

    await supabase.from('clients').update(updates).eq('id', client_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Update API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
