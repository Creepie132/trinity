import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'
import { receiptEmail } from '@/lib/email-templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('cField1')
  const responseCode = searchParams.get('Response')
  const transactionId = searchParams.get('index')

  console.log('Tranzila success callback:', {
    paymentId,
    responseCode,
    transactionId,
  })

  if (responseCode === '000' && paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        payment_url: null // инвалидируем ссылку
      })
      .eq('id', paymentId)

    return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
  } else {
    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
  }
}

export async function POST(request: NextRequest) {
  let paymentId: string | null = null
  let responseCode: string | null = null
  let transactionId: string | null = null

  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      paymentId = body.cField1
      responseCode = body.Response
      transactionId = body.index
    } else {
      // form-urlencoded
      const body = await request.text()
      const params = new URLSearchParams(body)
      paymentId = params.get('cField1')
      responseCode = params.get('Response')
      transactionId = params.get('index')
    }
  } catch (e) {
    console.error('Failed to parse Tranzila POST body:', e)
  }

  console.log('Tranzila POST callback:', { paymentId, responseCode, transactionId })
  console.log('responseCode raw:', JSON.stringify(responseCode))
  console.log('paymentId raw:', JSON.stringify(paymentId))

  if (responseCode === '000' && paymentId) {
    console.log('Updating payment:', paymentId)
    
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
        payment_url: null
      })
      .eq('id', paymentId)
      .select()
    
    console.log('Update result:', JSON.stringify({ data, error }))

    return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
  } else {
    if (paymentId) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }

    return NextResponse.redirect('https://www.ambersol.co.il/payment-failed', { status: 303 })
  }
}
