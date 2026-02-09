// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseTranzillaWebhook } from '@/lib/tranzilla'

export const dynamic = 'force-dynamic'

// Service-role клиент (только сервер!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleWebhook(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    let webhookData: any

    if (contentType?.includes('application/json')) {
      webhookData = await request.json()
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      webhookData = Object.fromEntries(formData)
    } else {
      const searchParams = request.nextUrl.searchParams
      webhookData = Object.fromEntries(searchParams)
    }

    console.log('Tranzilla webhook received:', webhookData)

    const parsed = parseTranzillaWebhook(webhookData)

    // paymentId приходит из contact / order_id (как у тебя)
    const paymentId = webhookData.contact || webhookData.order_id
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID not found' }, { status: 400 })
    }

    // 1) СНАЧАЛА находим org_id этого платежа
    const { data: existingPayment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('id, org_id')
      .eq('id', paymentId)
      .single()

    if (findError || !existingPayment) {
      console.error('Payment not found:', findError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const orgId = existingPayment.org_id

    // 2) Готовим updateData
    const updateData: any = {
      status: parsed.success ? 'completed' : 'failed',
      transaction_id: parsed.transactionId ?? null,
    }

    if (parsed.success) {
      updateData.paid_at = new Date().toISOString()
    }

    // 3) Обновляем строго внутри org
    const { data: payment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update payment:', updateError)
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    console.log('Payment updated successfully:', payment)

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      status: updateData.status,
      transaction_id: updateData.transaction_id,
    })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return handleWebhook(request)
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return handleWebhook(request)
}
