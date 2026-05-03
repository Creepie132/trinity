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
 *
 * Race-condition safe: деактивация токена происходит атомарно через
 * UPDATE ... WHERE is_active = true ... RETURNING id
 *
 * Если два одновременных запроса придут одновременно:
 * - Первый: UPDATE найдёт строку с is_active=true → вернёт id → продолжит
 * - Второй: UPDATE не найдёт строк (уже false) → RETURNING вернёт пустой массив → 410
 *
 * PostgreSQL гарантирует сериализацию UPDATE на уровне строки — race condition исключён.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // ── Атомарная деактивация токена + валидация в одном UPDATE ──────────────
  // Условие: is_active = true AND expires_at > now()
  // Если строка уже деактивирована или истекла — RETURNING вернёт 0 строк → 410
  const { data: burned, error: burnErr } = await supabase
    .from('client_edit_tokens')
    .update({ is_active: false, used_at: new Date().toISOString() })
    .eq('token', token)
    .eq('is_active', true)          // atomically checks & sets
    .gt('expires_at', new Date().toISOString())
    .select('id, client_id, org_id')

  if (burnErr) {
    console.error('[self-edit PATCH] burn error:', burnErr)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Если RETURNING вернул 0 строк — токен уже использован или истёк
  if (!burned || burned.length === 0) {
    return NextResponse.json({ error: 'Token expired or already used' }, { status: 410 })
  }

  const { client_id, org_id } = burned[0]

  const body = await req.json()
  const { first_name, last_name, phone, email, birth_date, avatar_url } = body as {
    first_name?: string
    last_name?: string
    phone?: string
    email?: string
    birth_date?: string
    avatar_url?: string
  }

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
    .eq('id', client_id)

  if (updateErr) {
    console.error('[self-edit PATCH] update error:', updateErr)
    // Токен уже сожжён — клиент обновить не удалось. Логируем, возвращаем ошибку.
    // Не восстанавливаем токен: лучше попросить новую ссылку, чем допустить повтор.
    return NextResponse.json({ error: 'Failed to update client data' }, { status: 500 })
  }

  // Уведомление с client_id в URL для прямого перехода в карточку
  const clientName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'Клиент'
  void dispatchNotification({
    event_type: 'client_self_edit',
    org_id,
    template: {
      key: 'client_self_edit',
      vars: { name: clientName, client_id },
    },
    payload: { url: `/clients/${client_id}` },
  })

  return NextResponse.json({ success: true, client_id })
}
