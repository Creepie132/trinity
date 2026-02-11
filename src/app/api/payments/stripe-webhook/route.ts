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

    const supabase = createSupabaseServiceClient()

    // Handle checkout.session.completed event (one-time payments + initial subscription)
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

    // Handle invoice.paid event (recurring subscription payments)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice

      // Get subscription details (can be string ID or Subscription object)
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : (invoice.subscription as any)?.id
      
      if (!subscriptionId) {
        console.log('[Stripe Webhook] Invoice not linked to subscription, skipping')
        return NextResponse.json({ received: true })
      }

      // Get subscription to extract metadata
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const session = await stripe.checkout.sessions.list({
        subscription: subscriptionId,
        limit: 1,
      })

      const clientId = session.data[0]?.metadata?.client_id
      const orgId = session.data[0]?.metadata?.org_id
      const clientName = session.data[0]?.metadata?.client_name

      if (!clientId || !orgId) {
        console.error('[Stripe Webhook] Missing metadata from subscription')
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      const amount = invoice.amount_paid / 100
      const currency = invoice.currency?.toUpperCase() || 'ILS'

      console.log('[Stripe Webhook] Processing recurring payment:', {
        clientId,
        orgId,
        amount,
        currency,
        invoiceId: invoice.id,
      })

      // Save recurring payment to database
      const { data, error } = await supabase
        .from('payments')
        .insert({
          client_id: clientId,
          org_id: orgId,
          amount: amount,
          currency: currency,
          status: 'completed',
          payment_method: 'stripe_subscription',
          transaction_id: invoice.id,
          payment_link: invoice.hosted_invoice_url || '',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('[Stripe Webhook] Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      console.log('[Stripe Webhook] Recurring payment saved:', data)

      return NextResponse.json({ received: true, payment_id: data.id })
    }

    // Handle customer.subscription.deleted event
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription

      console.log('[Stripe Webhook] Subscription cancelled:', subscription.id)

      // You can add logic here to update subscription status in your database
      // For now, just log it
      return NextResponse.json({ received: true, subscription_id: subscription.id })
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
