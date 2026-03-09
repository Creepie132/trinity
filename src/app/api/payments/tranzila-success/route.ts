import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('cField1')
  const responseCode = searchParams.get('Response')
  const transactionId = searchParams.get('index')
  const paymentType = searchParams.get('cField2') // 'subscription' для платежей подписки
  const cardToken = searchParams.get('TranzilaTK')
  const cardLast4 = searchParams.get('last4digits')
  const cardExpiry = searchParams.get('expdate')

  console.log('Tranzila GET callback:', {
    paymentId,
    responseCode,
    transactionId,
    paymentType,
    hasToken: !!cardToken,
  })

  if (responseCode === '000' && paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        payment_url: null // инвалидируем ссылку
      })
      .eq('id', paymentId)

    // Обработка токена карты для подписки
    if (cardToken) {
      await handleCardTokenSave(paymentId, cardToken, cardLast4, cardExpiry, paymentType)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
  } else {
    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
  }
}

export async function POST(request: NextRequest) {
  let paymentId: string | null = null
  let responseCode: string | null = null
  let transactionId: string | null = null
  let cardToken: string | null = null
  let cardLast4: string | null = null
  let cardExpiry: string | null = null
  let paymentType: string | null = null

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      paymentId = body.cField1
      responseCode = body.Response
      transactionId = body.index
      cardToken = body.TranzilaTK || null
      cardLast4 = body.last4digits || null
      cardExpiry = body.expdate || null
      paymentType = body.cField2 || null
    } else {
      // form-urlencoded
      const body = await request.text()
      const params = new URLSearchParams(body)
      paymentId = params.get('cField1')
      responseCode = params.get('Response')
      transactionId = params.get('index')
      cardToken = params.get('TranzilaTK')
      cardLast4 = params.get('last4digits')
      cardExpiry = params.get('expdate')
      paymentType = params.get('cField2')
    }
  } catch (e) {
    console.error('Failed to parse Tranzila POST body:', e)
  }

  console.log('Tranzila POST callback:', { paymentId, responseCode, transactionId, paymentType, hasToken: !!cardToken })

  if (responseCode === '000' && paymentId) {
    console.log('Updating payment:', paymentId)
    
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
    
    console.log('Update result:', JSON.stringify({ data, error }))

    // Обработка токена карты
    if (cardToken) {
      await handleCardTokenSave(paymentId, cardToken, cardLast4, cardExpiry, paymentType)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
  } else {
    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
  }
}

/**
 * Сохраняет токен карты и настраивает биллинг для организации
 */
async function handleCardTokenSave(
  paymentId: string,
  cardToken: string,
  cardLast4: string | null,
  cardExpiry: string | null,
  paymentType: string | null
) {
  // Получаем org_id и amount из платежа
  const { data: payment } = await supabase
    .from('payments')
    .select('org_id, amount, metadata')
    .eq('id', paymentId)
    .single()

  if (!payment?.org_id) {
    console.error('No org_id found for payment:', paymentId)
    return
  }

  // Базовое обновление — сохраняем токен карты
  const updateData: Record<string, any> = {
    tranzila_card_token: cardToken,
    tranzila_card_last4: cardLast4,
    tranzila_card_expiry: cardExpiry,
  }

  // Если это платёж подписки — настраиваем биллинг
  const isSubscription = paymentType === 'subscription' || payment.metadata?.type === 'subscription'
  
  if (isSubscription) {
    // Следующий платёж через месяц
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    
    updateData.billing_amount = payment.amount
    updateData.billing_due_date = nextBillingDate.toISOString().split('T')[0]
    updateData.billing_status = 'active'
    
    // Активируем подписку
    updateData.subscription_status = 'active'
    
    // Продлеваем на месяц + 3 дня запас
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)
    expiresAt.setDate(expiresAt.getDate() + 3)
    updateData.subscription_expires_at = expiresAt.toISOString()

    console.log('Setting up subscription billing:', {
      org_id: payment.org_id,
      billing_amount: payment.amount,
      billing_due_date: updateData.billing_due_date,
    })
  }

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', payment.org_id)

  if (error) {
    console.error('Failed to save card token:', error)
  } else {
    console.log('Card token saved for org:', payment.org_id, isSubscription ? '(subscription activated)' : '')
  }
}
