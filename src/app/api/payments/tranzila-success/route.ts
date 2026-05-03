import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSubscriptionWelcomeEmail } from '@/lib/resend'
import { createTranzilaInvoice, getInvoiceDisplayUrl } from '@/lib/tranzila-invoices'
import { getPlanModules, normalizePlan } from '@/lib/billing-plans'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'
const PUBLIC_SUCCESS_URL = 'https://www.ambersol.co.il/payment-success'

/**
 * Создаёт инвойс Tranzila и отправляет приветственное письмо.
 * Вызывается после успешной активации подписки.
 * Не блокирует основной ответ — ошибки логируются, не пробрасываются.
 */
async function sendSubscriptionEmail(orgId: string, cardLast4: string | null, amount: number, nextBillingStr: string) {
  try {
    // Получаем email и название организации
    const { data: org } = await supabase
      .from('organizations')
      .select('name, email')
      .eq('id', orgId)
      .single()

    if (!org?.email) {
      console.warn('[tranzila-success] No email for org:', orgId)
      return
    }

    // Пробуем создать инвойс через Tranzila Billing API
    let invoiceUrl: string | undefined
    try {
      const invoice = await createTranzilaInvoice({
        terminalName: process.env.TRANZILA_TERMINAL_ID || 'ambersolt',
        clientName: org.name,
        clientEmail: org.email,
        amount,
        items: [{ name: 'Trinity CRM — מנוי חודשי', unitPrice: amount }],
        paymentMethod: 'credit_card',
        ccLast4: cardLast4 ?? undefined,
      })
      if (invoice.document?.retrieval_key) {
        invoiceUrl = getInvoiceDisplayUrl(invoice.document.retrieval_key)
      }
    } catch (invoiceErr) {
      console.error('[tranzila-success] Invoice creation failed (non-blocking):', invoiceErr)
    }

    await sendSubscriptionWelcomeEmail({
      toEmail: org.email,
      orgName: org.name,
      amount,
      nextBillingDate: nextBillingStr,
      invoiceUrl,
      cardLast4,
    })
  } catch (err) {
    console.error('[tranzila-success] sendSubscriptionEmail failed (non-blocking):', err)
  }
}

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
  const sumParam = searchParams.get('sum') || searchParams.get('amount')

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

    // Защита от повторной оплаты по той же ссылке
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('subscription_status, billing_due_date, plan, features')
      .eq('id', orgId)
      .single()

    if (existingOrg?.subscription_status === 'active' && existingOrg?.billing_due_date) {
      console.log('[tranzila-success] Already active, skipping:', orgId)
      return NextResponse.redirect(`${ADMIN_URL}/subscription-success?already=1`, { status: 303 })
    }

    const nextBilling = new Date()
    nextBilling.setDate(nextBilling.getDate() + 30)
    const nextBillingStr = nextBilling.toISOString().split('T')[0]

    const resolvedPlan = normalizePlan(existingOrg?.plan)
    const planModules = getPlanModules(resolvedPlan)
    const existingFeatures = (existingOrg?.features as Record<string, any>) ?? {}

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
          nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        features: {
          ...existingFeatures,
          modules: planModules,
        },
      })
      .eq('id', orgId)

    if (error) {
      console.error('[tranzila-success] Failed to save token for org:', orgId, error)
      return NextResponse.redirect(`${ADMIN_URL}/subscription-failed`, { status: 303 })
    }

    console.log('[tranzila-success] ✅ Subscription activated for org:', orgId, '| next billing:', nextBillingStr)

    // Отправляем приветственное письмо с квитанцией (non-blocking)
    const paidAmount = sumParam ? parseFloat(sumParam) : 99
    void sendSubscriptionEmail(orgId, cardMask, paidAmount, nextBillingStr)

    return NextResponse.redirect(`${ADMIN_URL}/subscription-success`, { status: 303 })
  }

  // ─── Обычный платёж ─────────────────────────────────────────────────────────
  const paymentId = searchParams.get('cField1')
  const transactionId = searchParams.get('index')
  const paymentType = searchParams.get('cField2')

  if (responseCode === '000' && paymentId) {
    // SECURITY: верифицируем запись в БД перед обновлением статуса
    const tranzilaSum = sumParam ? parseFloat(sumParam) : null
    const { data: dbPayment } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('id', paymentId)
      .single()

    if (!dbPayment) {
      console.error('[tranzila-success] GET: Payment not found:', paymentId)
      return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
    }

    // Проверяем сумму — защита от подделки callback с чужим payment_id
    if (tranzilaSum !== null && Math.abs(tranzilaSum - dbPayment.amount) > 0.01) {
      console.error('[tranzila-success] GET: Amount mismatch! DB:', dbPayment.amount, 'Callback:', tranzilaSum, 'paymentId:', paymentId)
      return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
    }

    // Идемпотентность — не трогаем уже завершённые платежи
    if (dbPayment.status === 'completed') {
      console.log('[tranzila-success] GET: Already completed, skipping:', paymentId)
      return NextResponse.redirect(PUBLIC_SUCCESS_URL, { status: 303 })
    }

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
  let sumParam: string | null = null

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
      sumParam = body.sum || body.amount || null
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
      sumParam = params.get('sum') || params.get('amount')
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

    // Защита от повторной оплаты по той же ссылке
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('subscription_status, billing_due_date, plan, features')
      .eq('id', orgId)
      .single()

    if (existingOrg?.subscription_status === 'active' && existingOrg?.billing_due_date) {
      console.log('[tranzila-success] POST: Already active, skipping:', orgId)
      return NextResponse.redirect(`${ADMIN_URL}/subscription-success?already=1`, { status: 303 })
    }

    const nextBilling = new Date()
    nextBilling.setDate(nextBilling.getDate() + 30)
    const nextBillingStr = nextBilling.toISOString().split('T')[0]

    const resolvedPlanPost = normalizePlan(existingOrg?.plan)
    const planModulesPost = getPlanModules(resolvedPlanPost)
    const existingFeaturesPost = (existingOrg?.features as Record<string, any>) ?? {}

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
        features: {
          ...existingFeaturesPost,
          modules: planModulesPost,
        },
      })
      .eq('id', orgId)

    // Отправляем приветственное письмо с квитанцией (non-blocking)
    const paidAmountPost = sumParam ? parseFloat(sumParam) : 99
    void sendSubscriptionEmail(orgId, cardMask, paidAmountPost, nextBillingStr)

    return NextResponse.redirect(`${ADMIN_URL}/subscription-success`, { status: 303 })
  }

  // ─── Обычный платёж ─────────────────────────────────────────────────────────
  if (responseCode === '000' && paymentId) {
    // SECURITY: верифицируем запись в БД перед обновлением статуса
    const tranzilaSum = sumParam ? parseFloat(sumParam) : null
    const { data: dbPayment } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('id', paymentId)
      .single()

    if (!dbPayment) {
      console.error('[tranzila-success] POST: Payment not found:', paymentId)
      return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
    }

    if (tranzilaSum !== null && Math.abs(tranzilaSum - dbPayment.amount) > 0.01) {
      console.error('[tranzila-success] POST: Amount mismatch! DB:', dbPayment.amount, 'Callback:', tranzilaSum, 'paymentId:', paymentId)
      return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
    }

    if (dbPayment.status === 'completed') {
      console.log('[tranzila-success] POST: Already completed, skipping:', paymentId)
      return NextResponse.redirect(PUBLIC_SUCCESS_URL, { status: 303 })
    }

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
