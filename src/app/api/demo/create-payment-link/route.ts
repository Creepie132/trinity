import { NextRequest, NextResponse } from 'next/server'
import { createTranzilaPaymentLink } from '@/lib/tranzila'

// POST /api/demo/create-payment-link
// Creates a Tranzila payment link for demo setup fee
// Called from DemoOrderModal after form submission (no auth required — public endpoint)
export async function POST(request: NextRequest) {
  try {
    const { amount, description, email, plan } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'

    const { url } = await createTranzilaPaymentLink({
      amount: Number(amount),
      description: description || `Trinity CRM Setup — ${plan}`,
      paymentId: `demo-setup-${Date.now()}`,
      successUrl: `${baseUrl}/payment-success?type=demo-setup`,
      failUrl: `${baseUrl}/payment-failed?type=demo-setup`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[demo/create-payment-link]', err?.message)
    // Return null url gracefully — modal shows WhatsApp fallback
    return NextResponse.json({ url: null, error: err?.message })
  }
}
