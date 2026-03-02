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
      .select('id, amount, created_at, client_id')
      .eq('transaction_id', lowProfileCode)
      .single()

    console.log('Payment found:', payment, findError)

    let clientEmail = null
    let clientName = null
    
    if (payment) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('first_name, last_name, email')
        .eq('id', payment.client_id)
        .single()
      
      console.log('Client query - id:', payment.client_id)
      console.log('Client found:', client, clientError)
      console.log('Client email:', client?.email)
      
      clientEmail = client?.email
      clientName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim()

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
      if (clientEmail) {
        try {
          const paymentDate = new Date(payment.created_at).toLocaleDateString('he-IL')
          
          await resend.emails.send({
            from: 'Trinity CRM <notifications@ambersol.co.il>',
            to: clientEmail,
            subject: `קבלה | Квитанция ₪${payment.amount}`,
            html: receiptEmail(
              clientName,
              payment.amount,
              paymentDate,
              'Услуга | שירות',
              internalDealNumber || lowProfileCode
            ),
          })
          
          console.log('Receipt email sent to:', clientEmail)
        } catch (emailError) {
          console.error('Failed to send receipt email:', emailError)
        }
      }
    }
  }

  // Редирект обратно на payments
  return NextResponse.redirect('https://www.ambersol.co.il/payments?success=true')
}
