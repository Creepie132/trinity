import { NextRequest, NextResponse } from 'next/server'
import { createSubscriptionPaymentUrl } from '@/lib/tranzila'

// POST /api/demo/create-payment-link
// Variant C: First charge = setup fee, subscription starts 30 days later
export async function POST(request: NextRequest) {
  try {
    const { setupAmount, monthlyAmount, description, email, plan } = await request.json()

    if (!setupAmount || setupAmount <= 0) {
      return NextResponse.json({ error: 'Invalid setup amount' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'
    const tempId  = `demo-${Date.now()}`

    // +30 days: setup today, subscription starts next month
    const d = new Date(); d.setDate(d.getDate() + 30)
    const recurStartDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`

    const url = createSubscriptionPaymentUrl({
      amount:          Number(setupAmount),
      recurSum:        monthlyAmount ? Number(monthlyAmount) : undefined,
      recurStartDate,
      orgId:           tempId,
      orgName:         description || `Trinity CRM — ${plan}`,
      ownerEmail:      email || undefined,
      notifyUrl:       `${baseUrl}/api/payments/tranzila-notify`,
      successUrl:      `${baseUrl}/payment-success?type=demo-setup`,
      failUrl:         `${baseUrl}/payment-failed?type=demo-setup`,
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[demo/create-payment-link]', err?.message)
    return NextResponse.json({ url: null, error: err?.message })
  }
}
