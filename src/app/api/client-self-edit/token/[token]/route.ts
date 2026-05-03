import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { dispatchNotification } from '@/lib/dispatch-notification'

const supabase = createSupabaseServiceClient()

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/client-self-edit/token/[token]
 * Публичный — валидирует токен, возвращает данные клиента.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('client_edit_tokens')
    .select('id, client_id, expires_at, is_active')
    .eq('token', token)
    .single()

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (!tokenRow.is_active || new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired or already used' }, { status: 410 })
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, first_name, last_name, phone, email, birth_date, avatar_url')
    .eq('id', tokenRow.client_id)
    .single()

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({
    client: {
      id: client.id,
      first_name: client.first_name ?? '',
      last_name: client.last_name ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      birth_date: client.birth_date ?? '',
      avatar_url: client.avatar_url ?? null,
    },
    expires_at: tokenRow.expires_at,
  })
}
/**
 * PATCH /api/client-self-edit/token/[token]
 * Публичный — сохраняет изменения профиля, деактивирует токен.
 * Body: { first_name, last_name, phone, email, birth_date, avatar_url? }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('client_edit_tokens')
    .select('id, client_id, org_id, expires_at, is_active')
    .eq('token', token)
    .single()

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (!tokenRow.is_active || new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired or already used' }, { status: 410 })
  }

  const body = await req.json()
  const { first_name, last_name, phone, email, birth_date, avatar_url } = body as {
    first_name?: string
    last_name?: string
    phone?: string
    email?: string
    birth_date?: string
    avatar_url?: string
  }

  // Обновляем клиента
  const updatePayload: Record<string, string | null> = {}
  if (first_name !== undefined) updatePayload.first_name = first_name.trim()
  if (last_name !== undefined) updatePayload.last_name = last_name.trim() || null
  if (phone !== undefined) updatePayload.phone = phone.trim() || null
  if (email !== undefined) updatePayload.email = email.trim() || null
  if (birth_date !== undefined) updatePayload.birth_date = birth_date || null
  if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url

  const { error: updateErr } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', tokenRow.client_id)

  if (updateErr) {
    console.error('[self-edit PATCH] update error:', updateErr)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }

  // Деактивируем токен — одноразовый
  await supabase
    .from('client_edit_tokens')
    .update({ is_active: false, used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  // Уведомление владельцу через push
  const clientName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'Клиент'
  void dispatchNotification({
    event_type: 'client_self_edit',
    org_id: tokenRow.org_id,
    template: {
      key: 'client_self_edit',
      vars: { name: clientName },
    },
    payload: { url: `/clients/${tokenRow.client_id}` },
  })

  return NextResponse.json({ success: true })
}
