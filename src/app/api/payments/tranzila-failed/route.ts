import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const paymentId = params.get('cField1')

    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }
  } catch (e) {
    console.error('Tranzila failed callback error:', e)
  }

  return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
}

export async function GET() {
  return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
}
