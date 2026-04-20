import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(_request)
  if ('error' in auth) return auth.error

  const { orgId } = auth
  const { id } = await params

  // ── UUID guard ───────────────────────────────────────────────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, first_name, last_name, phone, email, address, city, date_of_birth, notes, description, paint_code, preferred_languages, created_at, org_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  const { orgId } = auth

  const { id } = await params

  // ── UUID guard: отклоняем optimistic / мусорные ID до обращения к БД ────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json(
      { error: `Invalid client id: "${id}". Expected a valid UUID.` },
      { status: 400 }
    )
  }

  const body = await request.json()
  const { phone, email, address, city, date_of_birth, notes, description, paint_code, preferred_languages } = body

  const name = body.name || `${body.first_name || ''} ${body.last_name || ''}`.trim()
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Валидация preferred_languages: массив из 'he' | 'ru', минимум 1
  let langs: string[] | undefined = undefined
  if (preferred_languages !== undefined) {
    if (!Array.isArray(preferred_languages) || preferred_languages.length === 0) {
      return NextResponse.json(
        { error: 'preferred_languages must be a non-empty array' },
        { status: 400 }
      )
    }
    const filtered = preferred_languages.filter((l: unknown) => l === 'he' || l === 'ru')
    if (filtered.length === 0) {
      return NextResponse.json(
        { error: 'preferred_languages must contain at least one of: he, ru' },
        { status: 400 }
      )
    }
    // уникализируем (на случай ['he','he'])
    langs = Array.from(new Set(filtered))
  }

  const updatePayload: Record<string, any> = {
    first_name: body.first_name,
    last_name: body.last_name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city || null,
    date_of_birth: date_of_birth || null,
    notes: notes || null,
    description: description || null,
    paint_code: paint_code || null,
    updated_at: new Date().toISOString(),
  }
  if (langs !== undefined) updatePayload.preferred_languages = langs

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update(updatePayload)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(_request)
  if ('error' in auth) return auth.error

  const { orgId } = auth
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    console.error('Delete client error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
