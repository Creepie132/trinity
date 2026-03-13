import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'
const PUBLIC_SUCCESS_URL = 'https://www.ambersol.co.il/payment-success'

/**
 * GET /api/payments/tranzila-success
 *
 * Обрабатывает два типа callback-ов от Tranzila:
 *
 * 1. ПОДПИСКА — когда URL содержит ?org_id=XXX
 *    Tranzila добавляет: TranzilaTK, cardmask, expdate, Response
 *    Действие: сохранить токен, активировать подписку, редирект в /admin/subscriptions
 *
 * 2. ОБЫЧНЫЙ ПЛАТЁЖ — когда URL содержит cField1 (payment UUID)
 *    Действие: обновить payments, редирект на публичную страницу успеха
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const orgId = searchParams.get('org_id')
  const responseCode = searchParams.get('Response')
  const cardToken = searchParams.get('TranzilaTK')
  const cardMask = searchParams.get('cardmask') || searchParams.get('last4digits')
  const expdate = searchParams.get('expdate')

  console.log('[tranzila-success] GET params:', {
    orgId,
    responseCode,
    hasToken: !!cardToken,
    cardMask,
    expdate,
  })

  // ─── ШАГ 2: Подписка ────────────────────────────────────────────────────────
  if (orgId) {
    if (responseCode !== '000' || !cardToken) {
      console.error('[tranzila-success] Subscription failed:', { orgId, responseCode })
      return NextResponse.redirect(`${ADMIN_URL}/subscription-failed`, { status: 303 })
    }

    // Следующая дата списания — сегодня + 30 дней
    const nextBilling = new Date()
    nextBilling.setDate(nextBilling.getDate() + 30)
    const nextBillingStr = nextBilling.toISOString().split('T')[0]

    const { error } = await supabase
      .from('organizations')
      .update({
        tranzila_card_token: cardToken,
        tranzila_card_last4: cardMask,
        tranzila_card_expiry: expdate,
        subscription_status: 'active',
        billing_status: 'paid',
        billing_due_date: nextBillingStr,
        subscription_expires_at: new Date(
          nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000 // +3 дня запас
        ).toISOString(),
      })
      .eq('id', orgId)

    if (error) {
      console.error('[tranzila-success] Failed to save token for org:', orgId, error)
      return NextResponse.redirect(`${ADMIN_URL}/subscription-failed`, { status: 303 })
    }

    console.log('[tranzila-success] ✅ Subscription activated for org:', orgId, '| next billing:', nextBillingStr)
    return NextResponse.redirect(`${ADMIN_URL}/subscription-success`, { status: 303 })
  }

  // ─── Обычный платёж ─────────────────────────────────────────────────────────
  const paymentId = searchParams.get('cField1')
  const transactionId = searchParams.get('index')
  const paymentType = searchParams.get('cField2')

  if (responseCode === '000' && paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        payment_url: null,
      })
      .eq('id', paymentId)

    if (cardToken) {
      await handleCardTokenSave(paymentId, cardToken, cardMask, expdate, paymentType)
    }

    return NextResponse.redirect(PUBLIC_SUCCESS_URL, { status: 303 })
  }

  if (paymentId) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId)
  }

  return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
}

/**
 * POST /api/payments/tranzila-success
 * Некоторые Tranzila-интеграции шлют POST (server-to-server).
 * Логика аналогична GET.
 */
export async function POST(request: NextRequest) {
  // org_id может быть в query string (т.к. он был частью success_url)
  const { searchParams } = new URL(request.url)
  const orgIdFromQuery = searchParams.get('org_id')

  let responseCode: string | null = null
  let cardToken: string | null = null
  let cardMask: string | null = null
  let expdate: string | null = null
  let paymentId: string | null = null
  let transactionId: string | null = null
  let paymentType: string | null = null

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      responseCode = body.Response
      cardToken = body.TranzilaTK || null
      cardMask = body.cardmask || body.last4digits || null
      expdate = body.expdate || null
      paymentId = body.cField1 || null
      transactionId = body.index || null
      paymentType = body.cField2 || null
    } else {
      const body = await request.text()
      const params = new URLSearchParams(body)
      responseCode = params.get('Response')
      cardToken = params.get('TranzilaTK')
      cardMask = params.get('cardmask') || params.get('last4digits')
      expdate = params.get('expdate')
      paymentId = params.get('cField1')
      transactionId = params.get('index')
      paymentType = params.get('cField2')
    }
  } catch (e) {
    console.error('[tranzila-success] Failed to parse POST body:', e)
  }

  const orgId = orgIdFromQuery

  console.log('[tranzila-success] POST:', { orgId, responseCode, hasToken: !!cardToken })

  // ─── Подписка ───────────────────────────────────────────────────────────────
  if (orgId) {
    if (responseCode !== '000' || !cardToken) {
      return NextResponse.redirect(`${ADMIN_URL}/subscription-failed`, { status: 303 })
    }

    const nextBilling = new Date()
    nextBilling.setDate(nextBilling.getDate() + 30)
    const nextBillingStr = nextBilling.toISOString().split('T')[0]

    await supabase
      .from('organizations')
      .update({
        tranzila_card_token: cardToken,
        tranzila_card_last4: cardMask,
        tranzila_card_expiry: expdate,
        subscription_status: 'active',
        billing_status: 'paid',
        billing_due_date: nextBillingStr,
        subscription_expires_at: new Date(
          nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', orgId)

    return NextResponse.redirect(`${ADMIN_URL}/subscription-success`, { status: 303 })
  }

  // ─── Обычный платёж ─────────────────────────────────────────────────────────
  if (responseCode === '000' && paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (cardToken) {
      await handleCardTokenSave(paymentId, cardToken, cardMask, expdate, paymentType)
    }

    return NextResponse.redirect(PUBLIC_SUCCESS_URL, { status: 303 })
  }

  if (paymentId) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId)
  }

  return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
}

/**
 * Сохраняет токен карты и настраивает биллинг для обычных (не-subscription) платежей
 */
async function handleCardTokenSave(
  paymentId: string,
  cardToken: string,
  cardLast4: string | null,
  cardExpiry: string | null,
  paymentType: string | null
) {
  const { data: payment } = await supabase
    .from('payments')
    .select('org_id, amount, metadata')
    .eq('id', paymentId)
    .single()

  if (!payment?.org_id) {
    console.error('[tranzila-success] No org_id for payment:', paymentId)
    return
  }

  const updateData: Record<string, any> = {
    tranzila_card_token: cardToken,
    tranzila_card_last4: cardLast4,
    tranzila_card_expiry: cardExpiry,
  }

  const isSubscription = paymentType === 'subscription' || (payment.metadata as any)?.type === 'subscription'
  if (isSubscription) {
    const nextBilling = new Date()
    nextBilling.setDate(nextBilling.getDate() + 30)
    updateData.billing_amount = payment.amount
    updateData.billing_due_date = nextBilling.toISOString().split('T')[0]
    updateData.billing_status = 'active'
    updateData.subscription_status = 'active'
    updateData.subscription_expires_at = new Date(
      nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000
    ).toISOString()
  }

  const { error } = await supabase.from('organizations').update(updateData).eq('id', payment.org_id)
  if (error) console.error('[tranzila-success] Failed to save card token:', error)
}
