import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createTranzilaPaymentLink } from '@/lib/tranzila'
import { v4 as uuidv4 } from 'uuid'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ambersol.co.il'

/**
 * POST /api/admin/subscription-payment
 * Создаёт ссылку на первый платёж подписки с токенизацией карты
 * 
 * Body: { org_id, amount, plan_name }
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  try {
    const { org_id, amount, plan_name } = await request.json()

    if (!org_id || !amount) {
      return NextResponse.json(
        { error: 'org_id and amount are required' },
        { status: 400 }
      )
    }

    // Получаем организацию
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, tranzila_terminal, tranzila_password')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Создаём запись платежа
    const paymentId = uuidv4()
    const description = `Trinity CRM - ${plan_name || 'Подписка'} - ${org.name}`

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        org_id: org_id,
        amount: amount,
        currency: 'ILS',
        status: 'pending',
        payment_method: 'card',
        description: description,
        // Помечаем как платёж подписки
        metadata: {
          type: 'subscription',
          plan_name: plan_name,
          first_payment: true,
        },
      })

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      )
    }

    // Создаём ссылку на оплату с токенизацией
    const { url } = await createTranzilaPaymentLink({
      amount,
      description,
      paymentId,
      successUrl: `${BASE_URL}/api/payments/tranzila-success`,
      failUrl: `${BASE_URL}/api/payments/tranzila-failed`,
      terminal: org.tranzila_terminal || undefined,
      password: org.tranzila_password || undefined,
      saveCard: true, // Запрашиваем токен карты
      customField2: 'subscription', // Помечаем как платёж подписки
    })

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      payment_url: url,
    })
  } catch (error) {
    console.error('Subscription payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
