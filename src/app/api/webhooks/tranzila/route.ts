import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyTranzilaSignature,
  validateTranzilaTerminal,
  extractWebhookData,
  type TranzilaWebhookParams,
} from '@/lib/tranzila-webhook'
import { sendSubscriptionWelcomeEmail } from '@/lib/resend'
import { sendTelegramMessage } from '@/lib/telegram'
import { queuePushToTrinityAdmin } from '@/lib/push-notify'
import { getPlanModules, getPlanPrice, normalizePlan } from '@/lib/billing-plans'

// Допустимая погрешность округления от Tranzila
const TOLERANCE_ILS = 1.0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/tranzila
 *
 * Server-to-server уведомление от Tranzila об успешной оплате (notify_url_address).
 *
 * ── Слои безопасности ────────────────────────────────────────────────────────
 *  1. Верификация подписи:     TranzilaToken = MD5(password + sum + currency)
 *  2. Валидация терминала:     terminal_name ∈ {наши терминалы}
 *  3. Идемпотентность:         transaction_id проверяется в subscription_billing_log
 *  4. Price tampering check:   сумма от Tranzila >= ожидаемая цена тарифа
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(request: NextRequest) {

  // ── 1. Парсим тело запроса ────────────────────────────────────────────────
  const contentType = request.headers.get('content-type') || ''
  let params: TranzilaWebhookParams = {}

  try {
    const rawBody = await request.text()
    if (contentType.includes('application/json')) {
      const json = JSON.parse(rawBody)
      params = Object.fromEntries(
        Object.entries(json).map(([k, v]) => [k, v != null ? String(v) : null])
      )
    } else {
      const urlParams = new URLSearchParams(rawBody)
      urlParams.forEach((value, key) => { params[key] = value })
    }
  } catch (e) {
    console.error('[Tranzila] Failed to parse webhook body:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data = extractWebhookData(params)

  console.log('[Tranzila] Webhook received:', {
    Response: data.responseCode, terminal: data.terminalName,
    transactionId: data.transactionId, sum: data.sum, hasToken: !!data.cardToken,
  })

  // ── 2. Валидация терминала ────────────────────────────────────────────────
  if (!validateTranzilaTerminal(params)) {
    console.error('[Tranzila Security] Rejected: unknown terminal', data.terminalName)
    return NextResponse.json({ error: 'Unknown terminal' }, { status: 401 })
  }

  // ── 3. Верификация подписи TranzilaToken ─────────────────────────────────
  if (data.responseCode === '000') {
    const { valid, reason } = verifyTranzilaSignature(params)
    if (!valid) {
      console.error('[Tranzila Security] Signature FAILED:', { reason, transactionId: data.transactionId })
      await logSecurityEvent({
        type: 'webhook_signature_failed', transactionId: data.transactionId,
        terminalName: data.terminalName, reason,
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    console.log('[Tranzila] ✅ Signature verified')
  }

  // ── 4. Неуспешные транзакции ──────────────────────────────────────────────
  if (data.responseCode !== '000') {
    console.log('[Tranzila] Transaction failed, code:', data.responseCode)
    return NextResponse.json({ success: false, response_code: data.responseCode })
  }

  // ── 5. Обязательные поля ─────────────────────────────────────────────────
  if (!data.orgId) {
    console.error('[Tranzila] Missing org_id (cField1)')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }
  if (!data.cardToken) {
    console.error('[Tranzila] Missing TranzilaTK')
    return NextResponse.json({ error: 'Missing card token' }, { status: 400 })
  }

  // ── 6. Идемпотентность — защита от replay ────────────────────────────────
  if (data.transactionId) {
    const { data: existing } = await supabase
      .from('subscription_billing_log')
      .select('id')
      .eq('transaction_id', data.transactionId)
      .maybeSingle()
    if (existing) {
      console.log('[Tranzila] ⏭️  Duplicate, skipping:', data.transactionId)
      return NextResponse.json({ success: true, duplicate: true })
    }
  }

  // ── 7. PRICE TAMPERING CHECK ──────────────────────────────────────────────
  const planField   = params['cField2'] ?? null
  const normalizedPlan = normalizePlan(planField)
  const planModules = getPlanModules(normalizedPlan)
  const expectedMin = getPlanPrice(normalizedPlan)  // 0 для custom = проверка пропускается
  const paidAmount  = data.sum ? parseFloat(data.sum) : 0

  if (expectedMin > 0 && paidAmount < expectedMin - TOLERANCE_ILS) {
    const fraudMsg = [
      `🚨 <b>PRICE TAMPERING DETECTED</b>`,
      `Org: <code>${data.orgId}</code>`,
      `Plan: <b>${planField ?? 'base'}</b> (expected ≥₪${expectedMin})`,
      `Paid: <b>₪${paidAmount}</b>`,
      `TxID: <code>${data.transactionId}</code>`,
      `Terminal: ${data.terminalName}`,
      `Card: ****${data.cardNum?.slice(-4) ?? '????'}`,
    ].join('\n')

    console.error('[Tranzila] 🚨 FRAUD: price tampering', { planField, expectedMin, paidAmount, orgId: data.orgId })

    // Алерт в Telegram (non-fatal — не блокируем ответ Tranzila)
    const alertChatId = process.env.TELEGRAM_ALERT_CHAT_ID
    if (alertChatId) {
      sendTelegramMessage(alertChatId, fraudMsg).catch(e =>
        console.error('[Tranzila] Telegram alert failed:', e)
      )
    }

    // Лог в audit_log для расследования
    await logSecurityEvent({
      type: 'price_tampering',
      transactionId: data.transactionId,
      terminalName: data.terminalName,
      reason: `paid ₪${paidAmount} for plan "${planField}" (min ₪${expectedMin})`,
    })

    // Записываем в billing_log со статусом fraud (для истории)
    try {
      await supabase.from('subscription_billing_log').insert({
        org_id: data.orgId, amount: paidAmount, status: 'fraud',
        transaction_id: data.transactionId, card_last4: data.cardNum?.slice(-4) ?? null,
        type: 'first_payment',
        notes: `FRAUD: plan=${planField}, expected>=${expectedMin}, paid=${paidAmount}`,
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ error: 'Payment amount insufficient' }, { status: 402 })
  }

  // ── 8. Читаем org — существующие features ────────────────────────────────
  const cardLast4 = data.cardNum ? data.cardNum.slice(-4) : null

  const nextBillingDate = new Date()
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  expiresAt.setDate(expiresAt.getDate() + 3)

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('features, name')
    .eq('id', data.orgId)
    .single()

  const existingFeatures = (orgRow?.features as Record<string, any>) ?? {}

  // ── 9. Атомарное обновление: demo → active + модули + карта ──────────────
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      tranzila_card_token:     data.cardToken,
      tranzila_card_last4:     cardLast4,
      tranzila_card_expiry:    data.expDate,
      billing_status:          'paid',
      billing_due_date:        nextBillingDate.toISOString().split('T')[0],
      subscription_status:     'active',
      subscription_expires_at: expiresAt.toISOString(),
      plan:                    normalizedPlan,
      features: {
        ...existingFeatures,
        modules:      planModules,
        is_demo:      false,
        client_limit: null,  // null = безлимит
      },
    })
    .eq('id', data.orgId)

  if (updateError) {
    console.error('[Tranzila] Failed to update organization:', updateError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  const activeModules = Object.keys(planModules).filter(k => planModules[k])
  console.log('[Tranzila] ✅ Org activated:', data.orgId, {
    plan: normalizedPlan, last4: cardLast4, paid: paidAmount,
    expected: expectedMin, modules: activeModules,
  })

  // ── 10. Billing log ───────────────────────────────────────────────────────
  try {
    await supabase.from('subscription_billing_log').insert({
      org_id:         data.orgId,
      amount:         paidAmount,
      status:         'success',
      transaction_id: data.transactionId,
      card_last4:     cardLast4,
      type:           'first_payment',
      notes:          `Plan: ${normalizedPlan} | Paid: ₪${paidAmount} | Modules: ${activeModules.join(',')}`
    })
  } catch (logErr) {
    console.warn('[Tranzila] billing_log write failed (non-fatal):', logErr)
  }

  // ── 11. Email-квитанция — после commit, не блокирует ответ ───────────────
  try {
    const { data: ownerRow } = await supabase
      .from('org_users')
      .select('email')
      .eq('org_id', data.orgId)
      .eq('role', 'owner')
      .maybeSingle()

    if (ownerRow?.email && orgRow?.name) {
      await sendSubscriptionWelcomeEmail({
        toEmail:         ownerRow.email,
        orgName:         orgRow.name as string,
        amount:          paidAmount,
        nextBillingDate: nextBillingDate.toISOString().split('T')[0],
        cardLast4,
      })
    }
  } catch (emailErr) {
    console.error('[Tranzila] Email receipt failed (non-fatal):', emailErr)
  }

  // ── 12. Telegram-уведомление владельцу Trinity об успешной оплате ───────────
  try {
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    if (adminChatId) {
      const tgMsg = [
        `💰 <b>Новая оплата подписки!</b>`,
        `Орг: <b>${orgRow?.name ?? data.orgId}</b>`,
        `Email: <code>${data.orgId}</code>`,
        `Тариф: <b>${normalizedPlan}</b>`,
        `Сумма: <b>₪${paidAmount}</b>`,
        `Карта: ****${cardLast4 ?? '????'}`,
        `Следующее списание: <b>${nextBillingDate.toISOString().split('T')[0]}</b>`,
        `TxID: <code>${data.transactionId}</code>`,
      ].join('\n')
      sendTelegramMessage(adminChatId, tgMsg).catch(e =>
        console.error('[Tranzila] Admin Telegram notification failed:', e)
      )
    }
  } catch (tgErr) {
    console.error('[Tranzila] Admin Telegram (non-fatal):', tgErr)
  }

  // ── 12а. Trinity in-app уведомление для суперадмина ──────────────────────
  queuePushToTrinityAdmin({
    type:   'payment_received',
    title:  `💰 Новая оплата: ${orgRow?.name ?? 'Организация'}`,
    body:   `₪${paidAmount} · Тариф ${normalizedPlan} · Карта ****${cardLast4 ?? '????'} · Следующее списание ${nextBillingDate.toISOString().split('T')[0]}`,
    link:   '/admin/organizations',
  }).catch(e => console.error('[Tranzila] Admin in-app notification failed:', e))

  // ── 13. Cookie для клиентского flash-message ──────────────────────────────
  const response = NextResponse.json({
    success: true, org_id: data.orgId, message: 'Organization activated',
  })
  response.cookies.set('trinity_active_branch', data.orgId, {
    httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  return response
}

export async function GET() {
  return NextResponse.json({
    status:  'ok',
    message: 'Tranzila webhook (sig verification + price tampering protection + demo activation)',
    expected_params: ['Response','TranzilaTK','TranzilaToken','cField1','cField2','cardnum','expdate','sum','currency_code','terminal_name'],
  })
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function logSecurityEvent(event: {
  type: string; transactionId: string | null; terminalName: string | null; reason: string
}) {
  try {
    await supabase.from('audit_log').insert({
      action:      `security.tranzila.${event.type}`,
      entity_type: 'webhook',
      entity_id:   event.transactionId ?? 'unknown',
      details: { terminal: event.terminalName, reason: event.reason, at: new Date().toISOString() },
    })
  } catch { /* не блокируем response */ }
}
