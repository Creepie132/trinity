import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chargeByToken } from '@/lib/tranzila'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/payments/charge-subscription
 * Списать ежемесячный платёж по сохранённому токену карты
 * Body: { org_id: string }
 *
 * Защита: CRON_SECRET или внутренний вызов
 */
export async function POST(request: NextRequest) {
  // Авторизация: принимаем INTERNAL_API_SECRET (Edge Function) ИЛИ CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const internalSecret = process.env.INTERNAL_API_SECRET
  const cronSecret = process.env.CRON_SECRET

  const isInternalCall = internalSecret && authHeader === `Bearer ${internalSecret}`
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`

  if (!isInternalCall && !isCronCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { org_id } = await request.json()
  if (!org_id) {
    return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Получаем данные организации
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select(`
      id, name,
      tranzila_card_token,
      tranzila_card_expiry,
      tranzila_token_terminal,
      tranzila_password,
      billing_amount,
      billing_due_date,
      subscription_status
    `)
    .eq('id', org_id)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (!org.tranzila_card_token) {
    return NextResponse.json({ error: 'No card token saved for this organization' }, { status: 400 })
  }

  if (!org.billing_amount || org.billing_amount <= 0) {
    return NextResponse.json({ error: 'No billing amount set' }, { status: 400 })
  }

  try {
    // Списываем через Tranzila (token terminal для рекуррентных платежей)
    const chargeResult = await chargeByToken({
      token: org.tranzila_card_token,
      amount: org.billing_amount,
      description: `Trinity CRM подписка — ${org.name}`,
      terminal: org.tranzila_token_terminal || process.env.TRANZILA_TOKEN_TERMINAL || 'ambersolttok',
      password: org.tranzila_password || process.env.TRANZILA_PRIVATE_KEY,
      expdate: org.tranzila_card_expiry,
    })

    // Следующая дата списания — +30 дней
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 30)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    // Обновляем организацию
    await supabaseAdmin
      .from('organizations')
      .update({
        billing_due_date: nextDateStr,
        billing_status: 'paid',
        subscription_status: 'active',
        last_billing_date: today,
        last_billing_amount: org.billing_amount,
        billing_error: null,
      })
      .eq('id', org_id)

    // Записываем лог успеха
    await supabaseAdmin.from('subscription_billing_log').insert({
      org_id,
      amount: org.billing_amount,
      status: 'success',
      transaction_id: chargeResult.transactionId,
      period_start: today,
      period_end: nextDateStr,
      card_last4: chargeResult.last4,
      created_at: new Date().toISOString(),
    })

    // Создаём запись платежа
    await supabaseAdmin.from('payments').insert({
      org_id,
      amount: org.billing_amount,
      status: 'completed',
      payment_method: 'card',
      provider: 'tranzila',
      type: 'subscription',
      transaction_id: chargeResult.transactionId,
      description: 'Trinity CRM ежемесячная подписка',
      paid_at: new Date().toISOString(),
      metadata: {
        subscription_period_start: today,
        subscription_period_end: nextDateStr,
        card_last4: chargeResult.last4,
        approval_number: chargeResult.approvalNumber,
      },
    })

    console.log(`[charge-subscription] ✅ ${org.name}: ${org.billing_amount}₪, next: ${nextDateStr}`)

    return NextResponse.json({
      success: true,
      org_id,
      org_name: org.name,
      amount: org.billing_amount,
      transaction_id: chargeResult.transactionId,
      next_billing_date: nextDateStr,
    })

  } catch (chargeError: any) {
    console.error(`[charge-subscription] ❌ ${org.name}:`, chargeError.message)

    // Логируем ошибку
    await supabaseAdmin.from('subscription_billing_log').insert({
      org_id,
      amount: org.billing_amount,
      status: 'failed',
      error_message: chargeError.message,
      period_start: today,
      created_at: new Date().toISOString(),
    })

    // Обновляем статус организации
    await supabaseAdmin
      .from('organizations')
      .update({
        billing_status: 'overdue',
        subscription_status: 'failed',
        billing_error: chargeError.message,
      })
      .eq('id', org_id)

    return NextResponse.json(
      {
        success: false,
        org_id,
        org_name: org.name,
        error: chargeError.message,
      },
      { status: 422 }
    )
  }
}
