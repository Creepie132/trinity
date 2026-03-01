import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      .select('id')
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
    }
  }

  // Редирект обратно на payments
  return NextResponse.redirect('https://www.ambersol.co.il/payments?success=true')
}
