import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/tranzila
 * Webhook для обработки notify_url от Tranzila
 * Сохраняет токен карты и настраивает биллинг
 */
export async function POST(request: NextRequest) {
  let orgId: string | null = null
  let responseCode: string | null = null
  let cardToken: string | null = null
  let cardNum: string | null = null
  let expDate: string | null = null
  let transactionId: string | null = null

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      orgId = body.custom
      responseCode = body.Response
      cardToken = body.TranzilaTK || null
      cardNum = body.cardnum || null
      expDate = body.expdate || null
      transactionId = body.index || body.ConfirmationCode || null
    } else {
      // form-urlencoded (чаще используется Tranzila)
      const body = await request.text()
      const params = new URLSearchParams(body)
      orgId = params.get('custom')
      responseCode = params.get('Response')
      cardToken = params.get('TranzilaTK')
      cardNum = params.get('cardnum')
      expDate = params.get('expdate')
      transactionId = params.get('index') || params.get('ConfirmationCode')
    }
  } catch (e) {
    console.error('Failed to parse Tranzila webhook body:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  console.log('Tranzila webhook received:', {
    orgId,
    responseCode,
    hasToken: !!cardToken,
    transactionId,
  })

  // Проверяем успешность транзакции
  if (responseCode !== '000') {
    console.log('Tranzila transaction failed:', responseCode)
    return NextResponse.json({ 
      success: false, 
      message: 'Transaction failed',
      response_code: responseCode 
    })
  }

  if (!orgId) {
    console.error('No org_id (custom field) in webhook')
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }

  if (!cardToken) {
    console.error('No TranzilaTK in webhook response')
    return NextResponse.json({ error: 'Missing card token' }, { status: 400 })
  }

  // Извлекаем последние 4 цифры карты
  const cardLast4 = cardNum ? cardNum.slice(-4) : null

  // Следующая дата списания — через месяц
  const nextBillingDate = new Date()
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  // Дата окончания подписки — через месяц + 3 дня запаса
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  expiresAt.setDate(expiresAt.getDate() + 3)

  // Обновляем организацию
  const { error } = await supabase
    .from('organizations')
    .update({
      tranzila_card_token: cardToken,
      tranzila_card_last4: cardLast4,
      tranzila_card_expiry: expDate,
      billing_status: 'paid',
      billing_due_date: nextBillingDate.toISOString().split('T')[0],
      subscription_status: 'active',
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    console.error('Failed to update organization:', error)
    return NextResponse.json({ error: 'Failed to save card token' }, { status: 500 })
  }

  console.log('Card token saved for org:', orgId, {
    last4: cardLast4,
    expiry: expDate,
    nextBilling: nextBillingDate.toISOString().split('T')[0],
  })

  // Логируем в subscription_billing_log если таблица существует
  try {
    await supabase
      .from('subscription_billing_log')
      .insert({
        org_id: orgId,
        amount: null, // Сумма уже сохранена в billing_amount
        status: 'success',
        transaction_id: transactionId,
        card_last4: cardLast4,
        type: 'first_payment',
        notes: 'First subscription payment - card token saved',
      })
  } catch (logError) {
    // Таблица может не существовать, игнорируем
    console.log('Could not log to subscription_billing_log:', logError)
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Card token saved',
    org_id: orgId,
  })
}

/**
 * GET handler для тестирования/отладки
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Tranzila webhook endpoint',
    expected_params: ['custom (org_id)', 'Response', 'TranzilaTK', 'cardnum', 'expdate']
  })
}
