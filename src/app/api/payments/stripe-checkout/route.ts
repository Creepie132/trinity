import { NextRequest, NextResponse } from 'next/server'
import { createStripeServerClient } from '@/lib/stripe'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency = 'ILS', clientName, clientEmail, clientId, orgId } = body

    // Validate required fields
    if (!amount || !clientName || !clientEmail || !clientId || !orgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Stripe client
    const stripe = createStripeServerClient()

    // Get origin for redirect URLs
    const origin = request.nextUrl.origin

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Payment for ${clientName}`,
              description: `Trinity CRM Payment`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents/agorot
          },
          quantity: 1,
        },
      ],
      customer_email: clientEmail,
      metadata: {
        client_id: clientId,
        org_id: orgId,
        client_name: clientName,
      },
      success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payments?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
