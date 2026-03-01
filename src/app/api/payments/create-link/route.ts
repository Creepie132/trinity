import { NextRequest, NextResponse } from 'next/server'
import { createCardComPaymentLink } from '@/lib/cardcom'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { rateLimit, PAYMENT_RATE_LIMIT } from '@/lib/rate-limit'
import { validateBody, createPaymentSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ✅ Проверка авторизации и доступа к фиче "payments"
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      return authResult.response
    }

    // ✅ Rate limiting
    const rateLimitResult = rateLimit(
      `payment:${authResult.data.email}`,
      PAYMENT_RATE_LIMIT
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          }
        }
      )
    }

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()

    const body = await request.json()
    
    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createPaymentSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { client_id, amount, description, visit_id } = data

    // SECURITY FIX: Verify client belongs to user's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, org_id')
      .eq('id', client_id)
      .eq('org_id', org_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 403 }
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
          provider: 'cardcom',
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

    // Generate CardCom payment link
    const origin = request.nextUrl.origin

    const cardComResult = await createCardComPaymentLink({
      amount,
      description: description || 'תשלום',
      paymentId: payment.id,
      successUrl: `${origin}/payments?success=true`,
      failUrl: `${origin}/payments?failed=true`,
      webhookUrl: `${origin}/api/payments/webhook`,
    })

    const paymentLink = cardComResult.url

    // Update payment record with link and lowProfileId
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        payment_link: paymentLink,
        transaction_id: cardComResult.lowProfileId,
      })
      .eq('id', payment.id)
      .eq('org_id', org_id)

    if (updateError) {
      console.error('Failed to update payment link:', updateError)
    }

    // ✅ Audit log
    await logAudit({
      org_id,
      user_id: authResult.data.user.id,
      user_email: authResult.data.email,
      action: "create",
      entity_type: "payment",
      entity_id: payment.id,
      new_data: { amount, currency: 'ILS', client_id: data.client_id },
      ip_address: getClientIp(request),
    })

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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
