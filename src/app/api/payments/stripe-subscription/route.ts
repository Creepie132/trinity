import { NextRequest, NextResponse } from 'next/server'
import { createStripeServerClient } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, interval, clientEmail, clientName, clientId, orgId } = body

    // Validate required fields
    if (!amount || !interval || !clientEmail || !clientName || !clientId || !orgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate interval
    if (!['month', 'week', 'year'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Must be: month, week, or year' },
        { status: 400 }
      )
    }

    // Create Stripe client
    const stripe = createStripeServerClient()

    // Get origin for redirect URLs
    const origin = request.nextUrl.origin

    // Create a Price on the fly (dynamic pricing)
    const price = await stripe.prices.create({
      currency: 'ils',
      unit_amount: Math.round(amount * 100), // Convert to agorot
      recurring: {
        interval: interval as 'month' | 'week' | 'year',
      },
      product_data: {
        name: `Subscription for ${clientName}`,
      },
    })

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      customer_email: clientEmail,
      metadata: {
        client_id: clientId,
        org_id: orgId,
        client_name: clientName,
        interval: interval,
      },
      success_url: `${origin}/payments?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payments?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription session' },
      { status: 500 }
    )
  }
}
