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
    const { data: payment } = await supabase
      .from('payments')
      .select('id, amount, created_at, client_id')
      .eq('id', paymentId)
      .single()

    console.log('Payment found:', payment)

    if (payment) {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          transaction_id: transactionId || paymentId,
        })
        .eq('id', payment.id)

      console.log('Payment updated to completed')

      const { data: client } = await supabase
        .from('clients')
        .select('first_name, last_name, email')
        .eq('id', payment.client_id)
        .single()

      if (client?.email) {
        const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
        const paymentDate = new Date(payment.created_at).toLocaleDateString('he-IL')

        await resend.emails.send({
          from: 'Trinity CRM <notifications@ambersol.co.il>',
          to: client.email,
          subject: `קבלה | Квитанция ₪${payment.amount}`,
          html: receiptEmail(
            clientName,
            payment.amount,
            paymentDate,
            'שירות',
            transactionId || paymentId
          ),
        })

        console.log('Receipt email sent to:', client.email)
      }
    }
  }

  return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
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

  if (responseCode === '000' && paymentId) {
    await supabase
      .from('payments')
      .update({
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId)
  }

  return NextResponse.redirect('https://www.ambersol.co.il/payment-success', { status: 303 })
}
