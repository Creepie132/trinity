/**
 * GET    /api/mobile/admin/orgs/[id]/whatsapp — получить статус Whapi для орга
 * POST   /api/mobile/admin/orgs/[id]/whatsapp — подключить / обновить канал
 * DELETE /api/mobile/admin/orgs/[id]/whatsapp — отключить канал
 *
 * Auth: Bearer токен. Только super_admin.
 * Токен канала хранится в Supabase Vault — никогда не возвращается клиенту.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return null
  const jwt = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await anonClient.auth.getUser(jwt)
  if (error || !data.user) return null
  const role    = data.user.app_metadata?.org_role as string | null
  const isAdmin = data.user.app_metadata?.is_admin === true
  if (role !== 'super_admin' && !isAdmin) return null
  return data.user
}

// ─── Whapi health check ───────────────────────────────────────────────────────

async function fetchWhapiPhone(channelId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://gate.whapi.cloud/${channelId}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Whapi возвращает номер в разных полях в зависимости от версии
    return data?.device?.phone ?? data?.phone ?? data?.me?.phone ?? null
  } catch {
    return null
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId } = await params
  const service = createSupabaseServiceClient()

  const { data, error } = await service
    .from('wa_integrations')
    .select('instance_id, is_active, updated_at')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  if (!data) return NextResponse.json({ connected: false, channel_id: null, phone: null })

  // Пытаемся получить телефон из Whapi (не блокируем если недоступен)
  let phone: string | null = null
  if (data.is_active && data.instance_id) {
    const { data: apiKey } = await service.rpc('get_wa_api_key', { p_org_id: orgId })
    if (apiKey) phone = await fetchWhapiPhone(data.instance_id, apiKey)
  }

  return NextResponse.json({
    connected:  data.is_active,
    channel_id: data.instance_id ?? null,
    phone,
    updated_at: data.updated_at,
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId } = await params

  let body: { channel_id: string; token: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { channel_id, token } = body
  if (!channel_id?.trim() || !token?.trim()) {
    return NextResponse.json({ error: 'channel_id and token are required' }, { status: 400 })
  }

  // Валидируем токен через Whapi перед сохранением
  const phone = await fetchWhapiPhone(channel_id.trim(), token.trim())
  if (phone === null) {
    return NextResponse.json(
      { error: 'Не удалось подключиться к Whapi. Проверьте Channel ID и токен.' },
      { status: 422 },
    )
  }

  const service = createSupabaseServiceClient()

  // Сохраняем токен в Vault
  const { data: secretId, error: vaultError } = await service.rpc('vault_create_secret', {
    secret:      token.trim(),
    name:        `wa_key_${orgId}`,
    description: `WhatsApp API key for org ${orgId}`,
  })

  if (vaultError || !secretId) {
    console.error('[admin/whatsapp] Vault error:', vaultError)
    return NextResponse.json({ error: 'Vault error' }, { status: 500 })
  }

  const { error: upsertError } = await service
    .from('wa_integrations')
    .upsert(
      {
        org_id:          orgId,
        provider_type:   'whapi',
        instance_id:     channel_id.trim(),
        vault_secret_id: secretId,
        is_active:       true,
      },
      { onConflict: 'org_id' },
    )

  if (upsertError) {
    console.error('[admin/whatsapp] Upsert error:', upsertError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, phone })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId } = await params
  const service = createSupabaseServiceClient()

  const { error } = await service
    .from('wa_integrations')
    .update({ is_active: false })
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
