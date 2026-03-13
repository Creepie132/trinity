import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/payments/tranzila-notify
 *
 * Tranzila My Billing шлёт этот callback при каждом автоматическом
 * рекуррентном списании. Мы обновляем статус подписки в БД.
 *
 * Параметры от Tranzila:
 *   Response         — '000' = успех
 *   cField1          — org_id (мы передавали его в первом платеже)
 *   sum              — сумма списания
 *   ConfirmationCode — код подтверждения
 *   index            — ID транзакции
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string> = {}

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      const params = new URLSearchParams(text)
      params.forEach((value, key) => { body[key] = value })
    }
  } catch (e) {
    console.error('[tranzila-notify] Failed to parse body:', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const responseCode  = body['Response']
  const orgId         = body['cField1']
  const transactionId = body['ConfirmationCode'] || body['index']

  console.log('[tranzila-notify] Received:', { responseCode, orgId, transactionId })

  if (!orgId) {
    console.error('[tranzila-notify] No org_id in cField1')
    return NextResponse.json({ ok: false, reason: 'no_org_id' })
  }

  if (responseCode !== '000') {
    console.error('[tranzila-notify] Recurring charge failed for org:', orgId, '| Response:', responseCode)
    await supabase
      .from('organizations')
      .update({ billing_status: 'failed' })
      .eq('id', orgId)
    return NextResponse.json({ ok: false, reason: 'charge_failed' })
  }

  // Успешное списание — продлеваем подписку на 30 дней
  const nextBilling = new Date()
  nextBilling.setDate(nextBilling.getDate() + 30)
  const nextBillingStr = nextBilling.toISOString().split('T')[0]

  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'active',
      billing_status: 'paid',
      billing_due_date: nextBillingStr,
      last_billing_date: new Date().toISOString().split('T')[0],
      subscription_expires_at: new Date(
        nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    console.error('[tranzila-notify] Failed to update org:', orgId, error)
    return NextResponse.json({ ok: false, reason: 'db_error' })
  }

  console.log('[tranzila-notify] ✅ Recurring OK for org:', orgId, '| next:', nextBillingStr)
  return NextResponse.json({ ok: true })
}
