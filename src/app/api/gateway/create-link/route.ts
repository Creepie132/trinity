import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireTrinityAccess } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { randomUUID } from 'crypto'

// POST /api/gateway/create-link
// Создаёт платёжную ссылку через Tranzila и сохраняет в payment_links
// Доступно payments_only и trinity пользователям

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  // payments_only имеют доступ — НЕ блокируем через requireTrinityAccess
  // Этот route специально для обоих типов пользователей

  const body = await request.json()
  const { amount, description, client_name, client_phone } = body

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const service = createSupabaseServiceClient()

  // Читаем billing_profile для этой org
  const { data: profile } = await service
    .from('billing_profiles')
    .select('terminal_name, gateway')
    .eq('org_id', auth.orgId)
    .eq('is_active', true)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: 'Payment gateway not configured. Please set up your Tranzila terminal in Settings.' },
      { status: 422 }
    )
  }

  // Генерируем idempotency_key
  const idempotencyKey = randomUUID()

  // Строим ссылку Tranzila
  // Параметры: https://docs.tranzila.com/docs/getting-started-1
  const tranzilaParams = new URLSearchParams({
    supplier:    profile.terminal_name,
    sum:         String(Number(amount).toFixed(2)),
    currency:    '1',              // 1 = ILS
    cField1:     auth.orgId,       // org_id для webhook
    cField2:     idempotencyKey,   // idempotency_key для webhook
    nologo:      '1',
    lang:        'il',
    trTextColor: '000000',
    trBgColor:   'f5f5f5',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/dashboard?paid=1`,
    fail_url:    `${process.env.NEXT_PUBLIC_APP_URL}/payments/dashboard?failed=1`,
  })

  if (description)  tranzilaParams.set('pdesc',    description)
  if (client_name)  tranzilaParams.set('contact',  client_name)
  if (client_phone) tranzilaParams.set('phone',    client_phone)

  const linkUrl = `https://direct.tranzila.com/${profile.terminal_name}/iframenew.php?${tranzilaParams}`

  // Сохраняем в БД
  const { data: saved, error: dbErr } = await service
    .from('payment_links')
    .insert({
      org_id:          auth.orgId,
      idempotency_key: idempotencyKey,
      amount:          Number(amount),
      currency:        'ILS',
      description:     description ?? null,
      client_name:     client_name ?? null,
      client_phone:    client_phone ?? null,
      link_url:        linkUrl,
      status:          'pending',
    })
    .select('id, link_url')
    .single()

  if (dbErr || !saved) {
    console.error('[PAYMENTS_MODULE_ERROR] Failed to save payment_link:', dbErr?.message)
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
  }

  return NextResponse.json({ id: saved.id, link_url: saved.link_url })
}
