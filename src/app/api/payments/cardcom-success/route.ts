/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/resend'
import { receiptEmail } from '@/lib/email-templates'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const responseCode = searchParams.get('ResponseCode')
  const lowProfileCode = searchParams.get('lowprofilecode')
  const internalDealNumber = searchParams.get('internalDealNumber')

  console.log('CardCom success callback:', {
    responseCode,
    lowProfileCode,
    internalDealNumber,
  })

  if (responseCode === '0' && lowProfileCode) {
    // Найти платёж по transaction_id = lowProfileCode
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        created_at,
        client:clients!inner(
          name,
          email
        ),
        visit:visits(
          service:services(
            name
          )
        )
      `)
      .eq('transaction_id', lowProfileCode)
      .single()

    console.log('Payment found:', payment, findError)

    if (payment) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          transaction_id: internalDealNumber || lowProfileCode,
        })
        .eq('id', payment.id)

      console.log('Payment update:', updateError || 'success')

      // Send receipt email if client has email
      if (payment.client?.[0]?.email) {
        try {
          const serviceName = (payment.visit?.[0]?.service as any)?.name || 'Услуга | שירות'
          const paymentDate = new Date(payment.created_at).toLocaleDateString('he-IL')
          
          await resend.emails.send({
            from: 'Trinity CRM <notifications@ambersol.co.il>',
            to: payment.client?.[0]?.email,
            subject: `קבלה | Квитанция ₪${payment.amount}`,
            html: receiptEmail(
              payment.client?.[0]?.name,
              payment.amount,
              paymentDate,
              serviceName,
              internalDealNumber || lowProfileCode
            ),
          })
          
          console.log('Receipt email sent to:', payment.client?.[0]?.email)
        } catch (emailError) {
          console.error('Failed to send receipt email:', emailError)
        }
      }
    }
  }

  // Редирект обратно на payments
  return NextResponse.redirect('https://www.ambersol.co.il/payments?success=true')
}
