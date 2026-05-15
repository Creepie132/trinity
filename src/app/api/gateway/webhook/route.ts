import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import {
  verifyTranzilaSignature,
  validateTranzilaTerminal,
  extractWebhookData,
  type TranzilaWebhookParams,
} from '@/lib/tranzila-webhook'

// ─── POST /api/gateway/webhook ────────────────────────────────────────────────
// Входящие события от Tranzila для payment_links модуля (payments_only орг).
//
// КРИТИЧНО: читаем raw body через request.text(), а НЕ request.json().
// Tranzila шлёт application/x-www-form-urlencoded.
// Если читать через json() — signature verification упадёт (хеши не совпадут).
//
// Идемпотентность:
//   ON CONFLICT (gateway, gateway_ref) DO UPDATE SET status = EXCLUDED.status
//   pending → success/failed: апдейт проходит (стейт-машина работает корректно)
//   success → success (дубль от ретрая): апдейт идемпотентен (ничего не ломается)
//   success → pending (нелегитимный откат): ИГНОРИРУЕМ через WHERE в хуке бизнес-логики
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Читаем raw body (обязательно для signature verification) ────────────
  const rawBody = await request.text()

  // ── 2. Парсим URL-encoded параметры ──────────────────────────────────────
  const params: TranzilaWebhookParams = {}
  new URLSearchParams(rawBody).forEach((v, k) => { params[k] = v })

  // ── 3. Signature verification ─────────────────────────────────────────────
  const sigResult = verifyTranzilaSignature(params)
  if (!sigResult.valid) {
    console.error('[PAYMENTS_MODULE_ERROR] Webhook signature invalid:', sigResult.reason, {
      gateway_ref: params['index'] ?? params['ConfirmationCode'],
      terminal:    params['terminal_name'],
    })
    // Возвращаем 200 чтобы Tranzila не ретраила зацикленно
    return NextResponse.json({ ok: false, reason: sigResult.reason }, { status: 200 })
  }

  // ── 4. Проверка терминала ─────────────────────────────────────────────────
  if (!validateTranzilaTerminal(params)) {
    console.error('[PAYMENTS_MODULE_ERROR] Webhook from unknown terminal:', params['terminal_name'])
    return NextResponse.json({ ok: false, reason: 'unknown_terminal' }, { status: 200 })
  }

  // ── 5. Извлекаем данные транзакции ────────────────────────────────────────
  const data = extractWebhookData(params)

  const gatewayRef = data.transactionId
  const orgId      = data.orgId
  // cField2 = idempotency_key, переданный при создании ссылки
  const idempotencyKey = params['cField2'] ?? null
  // Response: '000' = успех, всё остальное = ошибка (Tranzila docs)
  const isSuccess  = data.responseCode === '000'
  const status     = isSuccess ? 'success' : 'failed'

  if (!gatewayRef || !orgId) {
    console.error('[PAYMENTS_MODULE_ERROR] Webhook missing required fields:', { gatewayRef, orgId })
    return NextResponse.json({ ok: false, reason: 'missing_fields' }, { status: 200 })
  }

  const service = createSupabaseServiceClient()

  // ── 6. Upsert в gateway_transactions ─────────────────────────────────────
  // ON CONFLICT DO UPDATE — стейт-машина работает корректно:
  //   pending → success: апдейт проходит ✓
  //   pending → failed:  апдейт проходит ✓
  //   success → success (retry): идемпотентен ✓
  // Намеренно НЕ откатываем success → pending (невозможный легитимный кейс)
  const { data: txRow, error: txErr } = await service
    .from('gateway_transactions')
    .upsert(
      {
        org_id:          orgId,
        gateway:         'tranzila',
        gateway_ref:     gatewayRef,
        amount:          Number(data.sum ?? 0),
        currency:        'ILS',
        status,
        raw_payload:     params as Record<string, string>,
        signature_valid: true,
        processed_at:    new Date().toISOString(),
      },
      {
        onConflict:        'gateway,gateway_ref',
        ignoreDuplicates:  false,   // DO UPDATE, не DO NOTHING
      }
    )
    .select('id')
    .single()

  if (txErr) {
    console.error('[PAYMENTS_MODULE_ERROR] Failed to upsert gateway_transaction:', txErr.message)
    return NextResponse.json({ ok: false, reason: 'db_error' }, { status: 200 })
  }

  // ── 7. Апдейт payment_links по idempotency_key ────────────────────────────
  // Ищем по idempotency_key (cField2) — надёжнее чем gateway_ref, который
  // Tranzila может менять при ретраях.
  if (idempotencyKey) {
    const linkStatus = isSuccess ? 'paid' : 'failed'
    const { error: linkErr } = await service
      .from('payment_links')
      .update({
        status:      linkStatus,
        gateway_ref: gatewayRef,
        paid_at:     isSuccess ? new Date().toISOString() : null,
        updated_at:  new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey)
      .eq('org_id', orgId)
      // Защита от отката: не апдейтим уже оплаченные ссылки статусом failed
      .neq('status', 'paid')

    if (linkErr) {
      console.error('[PAYMENTS_MODULE_ERROR] Failed to update payment_link:', linkErr.message, { idempotencyKey })
      // Не возвращаем ошибку — транзакция уже записана, линк апдейтнется при следующем retry
    }
  }

  console.log('[PAYMENTS_MODULE] Webhook processed:', { gatewayRef, status, orgId, txId: txRow?.id })
  return NextResponse.json({ ok: true })
}
