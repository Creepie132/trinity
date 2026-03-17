import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifyTranzilaSignature,
  validateTranzilaTerminal,
  extractWebhookData,
  type TranzilaWebhookParams,
} from '@/lib/tranzila-webhook'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/tranzila
 *
 * Вызывается Tranzila после успешной подписки (notify_url_address).
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
        reason,
        transactionId: data.transactionId,
        terminalName:  data.terminalName,
      })
      // Логируем попытку в audit для последующего анализа
      await logSecurityEvent({
        type:          'webhook_signature_failed',
        transactionId: data.transactionId,
        terminalName:  data.terminalName,
        reason,
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

  // ── 7. Обновляем организацию ─────────────────────────────────────────────
  const cardLast4 = data.cardNum ? data.cardNum.slice(-4) : null

  const nextBillingDate = new Date()
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  expiresAt.setDate(expiresAt.getDate() + 3)

  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      tranzila_card_token:      data.cardToken,
      tranzila_card_last4:      cardLast4,
      tranzila_card_expiry:     data.expDate,
      billing_status:           'paid',
      billing_due_date:         nextBillingDate.toISOString().split('T')[0],
      subscription_status:      'active',
      subscription_expires_at:  expiresAt.toISOString(),
    })
    .eq('id', data.orgId)

  if (updateError) {
    console.error('[Tranzila] Failed to update organization:', updateError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  console.log('[Tranzila] ✅ Card token saved for org:', data.orgId, { last4: cardLast4 })

  // ── 8. Логируем успешную оплату ───────────────────────────────────────────
  try {
    await supabase.from('subscription_billing_log').insert({
      org_id:         data.orgId,
      amount:         data.sum ? parseFloat(data.sum) : null,
      status:         'success',
      transaction_id: data.transactionId,
      card_last4:     cardLast4,
      type:           'first_payment',
      notes:          'Subscription payment via webhook (signature verified)',
    })
  } catch (logError) {
    // Ошибка логирования не отменяет обработку
    console.warn('[Tranzila] Could not write to subscription_billing_log:', logError)
  }

  // ── 9. Cookie для клиентского flash-message ───────────────────────────────
  const response = NextResponse.json({
    success: true,
    org_id:  data.orgId,
    message: 'Card token saved',
  })
  response.cookies.set('trinity_active_branch', data.orgId, {
    httpOnly: false,   // клиент читает для flash-отображения
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })
  return response
}

/**
 * GET — health check для проверки доступности endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status:  'ok',
    message: 'Tranzila webhook endpoint (signature verification enabled)',
    expected_params: [
      'Response', 'TranzilaTK', 'TranzilaToken',
      'cField1', 'cardnum', 'expdate',
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
    // Не блокируем response из-за ошибки логирования
  }
}
