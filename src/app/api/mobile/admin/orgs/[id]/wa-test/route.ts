/**
 * POST /api/mobile/admin/orgs/[id]/wa-test
 * Отправляет тестовое WhatsApp-сообщение для проверки триггера.
 * Берёт шаблон из wa_trigger_settings, подставляет тестовые данные.
 * Auth: Bearer, только super_admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { sendWhatsAppMessage }         from '@/lib/wa/send'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

// Тестовые данные для подстановки в шаблон
const TEST_VARS: Record<string, string> = {
  client_name: 'Тестовый Клиент',
  date:        new Date().toLocaleDateString('he-IL'),
  time:        '14:30',
  service:     'Стрижка / תספורת',
  org_name:    'Trinity CRM Test',
  amount:      '150',
}

function applyTemplate(template: string, orgName: string): string {
  const vars = { ...TEST_VARS, org_name: orgName }
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val),
    template
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: orgId } = await params

  let body: { trigger_type: string; phone: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { trigger_type, phone } = body
  if (!trigger_type || !phone?.trim()) {
    return NextResponse.json({ error: 'trigger_type and phone required' }, { status: 400 })
  }

  const service = createSupabaseServiceClient()

  // Берём шаблон из wa_trigger_settings
  const { data: triggerRow } = await service
    .from('wa_trigger_settings')
    .select('message_template, is_enabled')
    .eq('org_id', orgId)
    .eq('trigger_type', trigger_type)
    .maybeSingle()

  if (!triggerRow?.message_template) {
    return NextResponse.json(
      { error: 'Шаблон не найден. Сначала сохраните настройки триггера.' },
      { status: 404 }
    )
  }

  // Берём имя организации для подстановки
  const { data: org } = await service
    .from('organizations')
    .select('name, features')
    .eq('id', orgId)
    .single()

  const orgName = (org?.features as any)?.business_info?.display_name || org?.name || 'Trinity'
  const message = applyTemplate(triggerRow.message_template, orgName)

  // Отправляем
  const result = await sendWhatsAppMessage({
    orgId,
    to: phone.trim(),
    message,
    softFail: true,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Ошибка отправки. Проверьте подключение WhatsApp.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    message_preview: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
  })
}
