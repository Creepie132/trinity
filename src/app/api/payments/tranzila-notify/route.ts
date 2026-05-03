import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReceipt } from '@/lib/tranzila-invoices'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Официальные IP-адреса серверов Tranzila.
 * Обновить если Tranzila пришлёт новый пул — запросить у support@tranzila.com.
 * В режиме DEV (TRANZILA_SKIP_IP_CHECK=true) проверка отключается для локального тестирования.
 */
const TRANZILA_ALLOWED_IPS = [
  '194.90.149.182',
  '194.90.149.183',
  '194.90.149.184',
  '194.90.149.185',
  '212.179.193.166',
  '212.179.193.167',
]

/**
 * POST /api/payments/tranzila-notify
 *
 * Tranzila My Billing шлёт этот callback при каждом автоматическом
 * рекуррентном списании. Обновляем статус подписки и создаём квитанцию.
 *
 * Параметры от Tranzila:
 *   Response         — '000' = успех
 *   cField1          — org_id (передаётся при первом платеже)
 *   sum              — сумма списания
 *   ConfirmationCode — код подтверждения
 *   index            — ID транзакции
 */
export async function POST(request: NextRequest) {
  // ── IP Allowlist: принимаем только запросы с серверов Tranzila ───────────
  // Vercel проксирует запросы — реальный IP в x-forwarded-for (первый в списке)
  const skipIpCheck = process.env.TRANZILA_SKIP_IP_CHECK === 'true'
  if (!skipIpCheck) {
    const forwardedFor = request.headers.get('x-forwarded-for') ?? ''
    const clientIp = forwardedFor.split(',')[0].trim()
    if (!TRANZILA_ALLOWED_IPS.includes(clientIp)) {
      console.warn('[tranzila-notify] Blocked request from unauthorized IP:', clientIp)
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  }

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
  const cField2       = body['cField2'] ?? ''   // e.g. "plan_change:pro:249"
  const transactionId = body['ConfirmationCode'] || body['index']
  const amount        = parseFloat(body['sum'] ?? '0')

  // Detect proration plan-change payment (one-time charge for upgrade)
  const planChangeMatch = cField2.match(/^plan_change:(\w+):(\d+(\.\d+)?)$/)
  const isPlanChange    = !!planChangeMatch

  console.log('[tranzila-notify] Received:', { responseCode, orgId, transactionId, amount })

  if (!orgId) {
    console.error('[tranzila-notify] No org_id in cField1')
    return NextResponse.json({ ok: false, reason: 'no_org_id' })
  }

  if (responseCode !== '000') {
    console.error('[tranzila-notify] Recurring charge failed for org:', orgId, '| Response:', responseCode)
    // Обновляем billing_status и сбрасываем subscription_status чтобы система знала что оплата не прошла
    await supabase
      .from('organizations')
      .update({
        billing_status: 'failed',
        subscription_status: 'expired',
      })
      .eq('id', orgId)
    return NextResponse.json({ ok: false, reason: 'charge_failed' })
  }

  // ── 1. Обновляем статус подписки ─────────────────────────────────────────
  const nextBilling = new Date()
  nextBilling.setDate(nextBilling.getDate() + 30)
  const nextBillingStr = nextBilling.toISOString().split('T')[0]

  // Если это prorated charge за смену плана — применяем новый план
  const planChangeUpdates: Record<string, any> = {}
  if (isPlanChange && planChangeMatch) {
    const newPlan  = planChangeMatch[1]
    const newPrice = parseFloat(planChangeMatch[2])
    planChangeUpdates.plan               = newPlan
    planChangeUpdates.billing_amount     = newPrice
    planChangeUpdates.pending_plan       = null
    planChangeUpdates.pending_plan_price = null
    planChangeUpdates.pending_plan_date  = null
    console.log('[tranzila-notify] Plan change applied:', newPlan, newPrice)
  }

  // Применяем доступные org_credits к текущему биллингу
  let appliedCredit = 0
  try {
    const { data: credits } = await supabase
      .from('org_credits')
      .select('id, amount')
      .eq('org_id', orgId)
      .is('applied_at', null)
      .gt('amount', 0)
      .lte('expires_at', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()) // не истёкшие

    if (credits && credits.length > 0) {
      appliedCredit = credits.reduce((s: number, c: any) => s + parseFloat(c.amount), 0)
      const ids = credits.map((c: any) => c.id)
      await supabase.from('org_credits').update({ applied_at: new Date().toISOString() }).in('id', ids)
      console.log(`[tranzila-notify] Applied ₪${appliedCredit} credits for org:`, orgId)
    }
  } catch (creditErr) {
    console.error('[tranzila-notify] Credit apply failed (non-fatal):', creditErr)
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status:     'active',
      billing_status:          'paid',
      billing_due_date:        nextBillingStr,
      subscription_expires_at: new Date(nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      ...planChangeUpdates,
    })
    .eq('id', orgId)

  if (error) {
    console.error('[tranzila-notify] Failed to update org:', orgId, error)
    return NextResponse.json({ ok: false, reason: 'db_error' })
  }

  // ── 2. Снимаем демо-лимиты (read-modify-write на features JSONB) ──────────
  // Демо → активная подписка: is_demo=false, лимиты убираем (null = без ограничений)
  try {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    if (orgRow?.features) {
      const updatedFeatures = {
        ...(orgRow.features as object),
        is_demo:           false,
        is_trial:          false,
        client_limit:      null,
        visit_limit:       null,
        visit_active_limit: null,
        product_limit:     null,
        task_limit:        null,
      }
      await supabase
        .from('organizations')
        .update({ features: updatedFeatures })
        .eq('id', orgId)
      console.log('[tranzila-notify] Demo limits removed for org:', orgId)
    }
  } catch (featErr) {
    // Некритично — подписка уже активирована
    console.error('[tranzila-notify] Features update failed (non-fatal):', featErr)
  }

  // ── 3. Создаём квитанцию Tranzila ────────────────────────────────────────
  if (amount > 0) {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, owner_email, owner_name')
        .eq('id', orgId)
        .single()

      const receipt = await createReceipt({
        clientName:    org?.owner_name  ?? org?.name ?? 'לקוח',
        clientEmail:   org?.owner_email ?? undefined,
        items: [{ name: 'Trinity CRM — מנוי חודשי', quantity: 1, unit_price: amount }],
        totalAmount:   amount,
        paymentMethod: 'credit_card',
      })

      await supabase
        .from('payments')
        .update({ tranzila_document_id: receipt.documentId })
        .eq('org_id', orgId)
        .eq('transaction_id', transactionId)

      console.log('[tranzila-notify] ✅ Receipt created:', receipt.documentId, '| doc#', receipt.documentNum)
    } catch (receiptErr) {
      console.error('[tranzila-notify] Receipt creation failed (non-fatal):', receiptErr)
    }
  }

  console.log('[tranzila-notify] ✅ Recurring OK for org:', orgId, '| next:', nextBillingStr)
  return NextResponse.json({ ok: true })
}
