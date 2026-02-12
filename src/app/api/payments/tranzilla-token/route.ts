// src/app/api/payments/tranzilla-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateTranzillaTokenLink } from '@/lib/tranzilla'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { rateLimit, PAYMENT_RATE_LIMIT } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Create Tranzilla tokenization link for recurring payments
 * Terminal: ambersoltok
 * Creates token for future charges without entering card details again
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Check auth and payments feature
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      return authResult.response
    }

    // ✅ Rate limiting
    const rateLimitResult = rateLimit(
      `payment-token:${authResult.data.email}`,
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
    const { client_id, amount, description } = body

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

    // Security: max amount check
    if (amount > 100000) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum allowed (100,000 ILS)' },
        { status: 400 }
      )
    }

    // Verify client belongs to user's organization
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

    // Create payment record with token_requested flag
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([
        {
          org_id,
          client_id,
          amount,
          currency: 'ILS',
          status: 'pending',
          provider: 'tranzilla',
          payment_method: 'credit_card',
          metadata: { token_requested: true }, // Flag for token creation
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('[Token] Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    console.log('[Token] Payment record created:', payment.id)

    // Generate Tranzilla tokenization link
    const origin = request.nextUrl.origin

    const tokenLink = generateTranzillaTokenLink({
      amount,
      currency: '1', // ILS
      orderId: payment.id,
      successUrl: `${origin}/payments?success=true&token=true`,
      failUrl: `${origin}/payments?failed=true`,
      notifyUrl: `${origin}/api/payments/webhook`,
      description: description || 'רישום כרטיס אשראי',
    })

    console.log('[Token] Token link generated')

    // Update payment record with token link
    const { error: updateError } = await supabase
      .from('payments')
      .update({ payment_link: tokenLink })
      .eq('id', payment.id)
      .eq('org_id', org_id)

    if (updateError) {
      console.error('[Token] Failed to update payment link:', updateError)
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      token_link: tokenLink,
      amount,
      currency: 'ILS',
      terminal: 'ambersoltok',
      note: 'This link creates a token for recurring payments',
    })
  } catch (error: any) {
    console.error('[Token] Create token link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
