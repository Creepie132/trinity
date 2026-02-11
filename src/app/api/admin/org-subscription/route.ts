import { NextRequest, NextResponse } from 'next/server'
import { createStripeServerClient } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgId, orgName, orgEmail, plan, amount } = body

    // Validate required fields
    if (!orgId || !orgName || !orgEmail || !plan || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Stripe client
    const stripe = createStripeServerClient()

    // Get origin for redirect URLs
    const origin = request.nextUrl.origin

    // Create a Price for monthly subscription
    const price = await stripe.prices.create({
      currency: 'ils',
      unit_amount: Math.round(amount * 100), // Convert to agorot
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: `Trinity CRM - ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      },
    })

    // Create Checkout Session for organization subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      customer_email: orgEmail,
      metadata: {
        org_id: orgId,
        org_name: orgName,
        plan: plan,
        type: 'org_subscription',
      },
      success_url: `${origin}/admin/billing?subscription=success&org_id=${orgId}`,
      cancel_url: `${origin}/admin/billing?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Org subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization subscription' },
      { status: 500 }
    )
  }
}
