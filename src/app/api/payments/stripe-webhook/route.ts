import { NextRequest, NextResponse } from 'next/server'
import { createStripeServerClient } from '@/lib/stripe'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const stripe = createStripeServerClient()
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Stripe Webhook] Missing signature')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[Stripe Webhook] Event received:', event.type)

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const clientId = session.metadata?.client_id
      const orgId = session.metadata?.org_id
      const clientName = session.metadata?.client_name
      const amount = session.amount_total ? session.amount_total / 100 : 0 // Convert from cents
      const currency = session.currency?.toUpperCase() || 'ILS'

      if (!clientId || !orgId) {
        console.error('[Stripe Webhook] Missing metadata:', session.metadata)
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      console.log('[Stripe Webhook] Processing payment:', {
        clientId,
        orgId,
        amount,
        currency,
        sessionId: session.id,
      })

      // Save payment to database using service role
      const supabase = createSupabaseServiceClient()

      const { data, error } = await supabase
        .from('payments')
        .insert({
          client_id: clientId,
          org_id: orgId,
          amount: amount,
          currency: currency,
          status: 'completed',
          payment_method: 'stripe',
          transaction_id: session.id,
          payment_link: session.url || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('[Stripe Webhook] Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      console.log('[Stripe Webhook] Payment saved:', data)

      return NextResponse.json({ received: true, payment_id: data.id })
    }

    // Return success for other event types
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
