import { NextRequest, NextResponse } from 'next/server'
import { generateTranzillaPaymentLink } from '@/lib/tranzilla'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ✅ Проверка авторизации и доступа к фиче "payments"
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      return authResult.response
    }

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const body = await request.json()
    const { client_id, amount, description, visit_id } = body

    // Validation
    if (!client_id || !amount) {
      return NextResponse.json(
        { error: 'client_id and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Создаём payment с org_id
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([
        {
          org_id,
          client_id,
          visit_id: visit_id || null,
          amount,
          currency: 'ILS',
          status: 'pending',
          provider: 'tranzilla',
          payment_method: 'credit_card',
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Generate Tranzilla payment link
    const baseUrl = request.nextUrl.origin
    const callbackUrl = `${baseUrl}/api/payments/callback`

    const paymentLink = generateTranzillaPaymentLink({
      amount,
      currency: '1', // ILS
      orderId: payment.id,
      callbackUrl,
      description: description || 'תשלום',
    })

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({ payment_link: paymentLink })
      .eq('id', payment.id)
      .eq('org_id', org_id)

    if (updateError) {
      console.error('Failed to update payment link:', updateError)
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      payment_link: paymentLink,
      amount,
      currency: 'ILS',
    })
  } catch (error: any) {
    console.error('Create payment link error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
