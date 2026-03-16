import { NextRequest, NextResponse } from 'next/server'
import { createSubscriptionPaymentUrl } from '@/lib/tranzila'

// POST /api/demo/create-payment-link
// Creates a Tranzila RECURRING payment link:
//   - First charge  = setup fee (one-time)
//   - Monthly after = monthly subscription price
// Called from DemoOrderModal after form submission (no auth required — public endpoint)
export async function POST(request: NextRequest) {
  try {
    const { setupAmount, monthlyAmount, description, email, plan } = await request.json()

    if (!setupAmount || setupAmount <= 0) {
      return NextResponse.json({ error: 'Invalid setup amount' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'
    // orgId not available here — use a temp ID for DCdisable dedup
    const tempId = `demo-${Date.now()}`

    const url = createSubscriptionPaymentUrl({
      amount: Number(setupAmount),              // first charge = setup
      orgId: tempId,
      orgName: description || `Trinity CRM — ${plan}`,
      ownerEmail: email || undefined,
      notifyUrl: `${baseUrl}/api/payments/tranzila-notify`,
      successUrl: `${baseUrl}/payment-success?type=demo-setup`,
      failUrl:    `${baseUrl}/payment-failed?type=demo-setup`,
      // Override recur_sum to monthly price if provided, else same as setup
      ...(monthlyAmount ? { recurSum: Number(monthlyAmount) } : {}),
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[demo/create-payment-link]', err?.message)
    return NextResponse.json({ url: null, error: err?.message })
  }
}
