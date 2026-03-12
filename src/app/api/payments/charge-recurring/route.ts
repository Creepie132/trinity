import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/charge-recurring
 * Manual recurring charge for a client subscription using stored card token
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAuthAndFeature('recurring')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const { subscription_id, client_id, amount, card_token } = await request.json()

    if (!subscription_id || !client_id || !amount || !card_token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify subscription belongs to org
    const { data: subscription, error: subError } = await supabase
      .from('client_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('org_id', org_id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get org terminal credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('tranzila_token_terminal, tranzila_token_password')
      .eq('id', org_id)
      .single()

    const terminal = org?.tranzila_token_terminal
    const password = org?.tranzila_token_password

    if (!terminal || !password) {
      return NextResponse.json(
        { error: 'Платёжный токен-терминал не настроен для вашей организации. Обратитесь к администратору.' },
        { status: 400 }
      )
    }

    // Charge via Tranzila token
    const params = new URLSearchParams({
      supplier: terminal,
      TranzilaPW: password,
      TranzilaTK: card_token,
      sum: amount.toString(),
      currency: '1', // ILS
      tranmode: 'A', // token charge
    })

    const tranzilaRes = await fetch(
      `https://direct.tranzila.com/${terminal}/iframe.php`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    )

    const text = await tranzilaRes.text()
    let result: any = {}
    try {
      result = JSON.parse(text)
    } catch {
      result = Object.fromEntries(new URLSearchParams(text))
    }

    const success = result.Response === '000'
    const today = new Date().toISOString().split('T')[0]

    // Record in subscription_charges
    await supabase.from('subscription_charges').insert({
      org_id,
      subscription_id,
      client_id,
      amount,
      currency: '₪',
      status: success ? 'success' : 'failed',
      tranzila_transaction_id: result.ConfirmationCode || result.index || null,
      error_message: success ? null : (result.error || result.error_msg || 'Payment failed'),
      period_start: today,
      period_end: null,
    })

    if (success) {
      // Calculate next billing date
      let nextDate = new Date()
      if (subscription.billing_cycle === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1)
      } else if (subscription.billing_cycle === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
      } else if (subscription.billing_cycle === 'custom') {
        nextDate.setDate(nextDate.getDate() + (subscription.custom_days || 30))
      }

      await supabase
        .from('client_subscriptions')
        .update({
          last_billed_at: new Date().toISOString(),
          next_billing_date: nextDate.toISOString().split('T')[0],
        })
        .eq('id', subscription_id)

      return NextResponse.json({
        success: true,
        transaction_id: result.ConfirmationCode || result.index,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || result.error_msg || 'Payment failed' },
        { status: 422 }
      )
    }
  } catch (error: any) {
    console.error('[charge-recurring]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
