import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyTranzilaSignature,
  validateTranzilaTerminal,
  extractWebhookData,
  type TranzilaWebhookParams,
} from '@/lib/tranzila-webhook'
import { sendSubscriptionWelcomeEmail } from '@/lib/resend'

// ─── Маппинг план → модули ────────────────────────────────────────────────────
// Читается из cField2 (передаётся при генерации ссылки в tranzila.ts)
function getPlanModules(plan: string | null): Record<string, boolean> {
  const base = {
    clients: true, visits: true, diary: true, inventory: true, payments: true,
    analytics: false, sms: false, booking: false, loyalty: false,
    branches: false, subscriptions: false,
  }
  const pro  = { ...base, analytics: true, sms: true, booking: true }
  const ent  = { ...pro, loyalty: true, branches: true, subscriptions: true }
  if (plan === 'pro')        return pro
  if (plan === 'enterprise') return ent
  return base  // 'base', null, 'custom' — базовый набор
}

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
 *  1. Верификация подписи:  TranzilaToken = MD5(password + sum + currency)
 *  2. Валидация терминала:  terminal_name ∈ {наши терминалы}
 *  3. Идемпотентность:      transaction_id проверяется в subscription_billing_log
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
      // form-urlencoded — стандартный формат Tranzila CGI
      const urlParams = new URLSearchParams(rawBody)
      urlParams.forEach((value, key) => { params[key] = value })
    }
  } catch (e) {
    console.error('[Tranzila] Failed to parse webhook body:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data = extractWebhookData(params)

  console.log('[Tranzila] Webhook received:', {
    Response:      data.responseCode,
    terminal:      data.terminalName,
    transactionId: data.transactionId,
    sum:           data.sum,
    hasToken:      !!data.cardToken,
  })

  // ── 2. Валидация терминала ────────────────────────────────────────────────
  if (!validateTranzilaTerminal(params)) {
    console.error('[Tranzila Security] Rejected: unknown terminal', data.terminalName)
    return NextResponse.json({ error: 'Unknown terminal' }, { status: 401 })
  }

  // ── 3. Верификация подписи TranzilaToken ─────────────────────────────────
  // Верифицируем только успешные транзакции (Response === '000'),
  // поскольку failed-транзакции могут не включать TranzilaToken.
  if (data.responseCode === '000') {
    const { valid, reason } = verifyTranzilaSignature(params)
    if (!valid) {
      console.error('[Tranzila Security] Signature verification FAILED:', {
        reason, transactionId: data.transactionId, terminalName: data.terminalName,
      })
      await logSecurityEvent({
        type: 'webhook_signature_failed', transactionId: data.transactionId,
        terminalName: data.terminalName, reason,
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    console.log('[Tranzila] ✅ Signature verified (TranzilaToken MD5)')
  }

  // ── 4. Обрабатываем неуспешные транзакции ────────────────────────────────
  if (data.responseCode !== '000') {
    console.log('[Tranzila] Transaction failed, response code:', data.responseCode)
    return NextResponse.json({ success: false, response_code: data.responseCode })
  }

  // ── 5. Проверяем обязательные поля ───────────────────────────────────────
  if (!data.orgId) {
    console.error('[Tranzila] Missing org_id (cField1) in webhook')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }
  if (!data.cardToken) {
    console.error('[Tranzila] Missing TranzilaTK in webhook')
    return NextResponse.json({ error: 'Missing card token' }, { status: 400 })
  }

  // ── 6. Идемпотентность — защита от replay attack ─────────────────────────
  if (data.transactionId) {
    const { data: existing } = await supabase
      .from('subscription_billing_log')
      .select('id')
      .eq('transaction_id', data.transactionId)
      .maybeSingle()
    if (existing) {
      console.log('[Tranzila] ⏭️  Duplicate transaction, skipping:', data.transactionId)
      return NextResponse.json({ success: true, duplicate: true })
    }
  }

  // ── 7. Читаем org для получения текущих features и email ─────────────────
  const cardLast4  = data.cardNum ? data.cardNum.slice(-4) : null
  const planField  = params['cField2'] ?? null  // 'base' | 'pro' | 'enterprise' | null

  const nextBillingDate = new Date()
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  expiresAt.setDate(expiresAt.getDate() + 3)

  // Читаем существующие features — не перезаписываем бизнес-данные
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('features, name')
    .eq('id', data.orgId)
    .single()

  const existingFeatures = (orgRow?.features as Record<string, any>) ?? {}
  const newModules = getPlanModules(planField)

  // ── 8. Атомарное обновление: demo → active + модули + карта ──────────────
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      // Карта и биллинг
      tranzila_card_token:     data.cardToken,
      tranzila_card_last4:     cardLast4,
      tranzila_card_expiry:    data.expDate,
      billing_status:          'paid',
      billing_due_date:        nextBillingDate.toISOString().split('T')[0],
      // Активация подписки: demo → active
      subscription_status:     'active',
      subscription_expires_at: expiresAt.toISOString(),
      plan:                    planField ?? 'base',
      // Разблокировка модулей + снятие demo-флага и лимитов
      features: {
        ...existingFeatures,
        modules:      newModules,
        is_demo:      false,
        client_limit: 9999,
      },
    })
    .eq('id', data.orgId)

  if (updateError) {
    console.error('[Tranzila] Failed to update organization:', updateError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  const activeModules = Object.keys(newModules).filter(k => newModules[k])
  console.log('[Tranzila] ✅ Org activated:', data.orgId, {
    plan: planField, last4: cardLast4, modules: activeModules,
  })

  // ── 9. Лог успешной оплаты ────────────────────────────────────────────────
  try {
    await supabase.from('subscription_billing_log').insert({
      org_id:         data.orgId,
      amount:         data.sum ? parseFloat(data.sum) : null,
      status:         'success',
      transaction_id: data.transactionId,
      card_last4:     cardLast4,
      type:           'first_payment',
      notes:          `Plan: ${planField ?? 'base'} | Modules: ${activeModules.join(',')} | Signature verified`,
    })
  } catch (logError) {
    console.warn('[Tranzila] Could not write to subscription_billing_log:', logError)
  }

  // ── 10. Email-квитанция (Задача 3) — после commit в БД, не блокирует ответ
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
        amount:          data.sum ? parseFloat(data.sum) : 0,
        nextBillingDate: nextBillingDate.toISOString().split('T')[0],
        cardLast4,
      })
    }
  } catch (emailErr) {
    // Email вторичен — не отменяем успешную активацию
    console.error('[Tranzila] Email receipt failed (non-fatal):', emailErr)
  }

  // ── 11. Cookie для клиентского flash-message ──────────────────────────────
  const response = NextResponse.json({
    success: true,
    org_id:  data.orgId,
    message: 'Organization activated',
  })
  response.cookies.set('trinity_active_branch', data.orgId, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })
  return response
}

/**
 * GET — health check
 */
export async function GET() {
  return NextResponse.json({
    status:  'ok',
    message: 'Tranzila webhook endpoint (signature verification + demo activation enabled)',
    expected_params: [
      'Response', 'TranzilaTK', 'TranzilaToken',
      'cField1', 'cField2', 'cardnum', 'expdate',
      'sum', 'currency_code', 'terminal_name',
    ],
  })
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

async function logSecurityEvent(event: {
  type: string
  transactionId: string | null
  terminalName:  string | null
  reason:        string
}) {
  try {
    await supabase.from('audit_log').insert({
      action:      `security.tranzila.${event.type}`,
      entity_type: 'webhook',
      entity_id:   event.transactionId ?? 'unknown',
      details: {
        terminal: event.terminalName,
        reason:   event.reason,
        at:       new Date().toISOString(),
      },
    })
  } catch {
    // Не блокируем response
  }
}
