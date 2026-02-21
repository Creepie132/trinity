// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseTranzillaWebhook } from '@/lib/tranzilla'
import { sendTelegramMessage } from '@/lib/telegram'

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

    console.log('[Tranzilla Webhook] Raw data:', webhookData)

    const parsed = parseTranzillaWebhook(webhookData)
    console.log('[Tranzilla Webhook] Parsed:', parsed)

    // Tranzilla sends payment ID in 'contact' field
    const paymentId = webhookData.contact || webhookData.order_id
    if (!paymentId) {
      console.error('[Tranzilla Webhook] Missing payment ID in webhook data')
      return NextResponse.json({ error: 'Payment ID not found' }, { status: 400 })
    }

    console.log('[Tranzilla Webhook] Processing payment:', paymentId)

    // 1) Find payment and its org_id
    const { data: existingPayment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('id, org_id, amount, client_id, method')
      .eq('id', paymentId)
      .single()

    if (findError || !existingPayment) {
      console.error('[Tranzilla Webhook] Payment not found:', findError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const orgId = existingPayment.org_id

    // 2) Prepare update data
    // Response: '000' = success, anything else = failed
    const updateData: any = {
      status: parsed.success ? 'completed' : 'failed',
      transaction_id: parsed.transactionId ?? null,
    }

    if (parsed.success) {
      updateData.paid_at = new Date().toISOString()
      console.log(`[Tranzilla Webhook] ✅ Payment ${paymentId} completed (Response: 000)`)
      console.log(`[Tranzilla Webhook] Transaction ID: ${parsed.transactionId}`)
      console.log(`[Tranzilla Webhook] Amount: ${parsed.amount} ${parsed.currency}`)
      console.log(`[Tranzilla Webhook] Card: ***${parsed.cardNumber}`)
    } else {
      console.log(`[Tranzilla Webhook] ❌ Payment ${paymentId} failed (Response: ${parsed.responseCode})`)
    }

    // 3) Update payment within org
    const { data: payment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Tranzilla Webhook] Failed to update payment:', updateError)
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    console.log('[Tranzilla Webhook] Payment updated successfully')

    // Send Telegram notification for successful payment
    if (parsed.success && updateData.status === 'completed') {
      try {
        // Get organization with telegram settings
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('telegram_chat_id, telegram_notifications')
          .eq('id', orgId)
          .single()

        if (org?.telegram_notifications && org.telegram_chat_id) {
          // Get client name
          let clientName = 'Клиент'
          if (existingPayment.client_id) {
            const { data: client } = await supabaseAdmin
              .from('clients')
              .select('first_name, last_name')
              .eq('id', existingPayment.client_id)
              .single()

            if (client) {
              clientName = `${client.first_name} ${client.last_name}`.trim()
            }
          }

          const method = existingPayment.method === 'card' ? 'Карта' : 
                        existingPayment.method === 'cash' ? 'Наличные' : 
                        existingPayment.method === 'bank_transfer' ? 'Перевод' : 
                        'Другое'

          const telegramMessage = `💰 <b>Оплата ${existingPayment.amount}₪</b>\n\n👤 От: ${clientName}\n💳 Способ: ${method}`
          await sendTelegramMessage(org.telegram_chat_id, telegramMessage)
        }
      } catch (error) {
        console.error('[Tranzilla Webhook] Failed to send Telegram notification:', error)
        // Don't fail the webhook if telegram fails
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      status: updateData.status,
      transaction_id: updateData.transaction_id,
      response_code: parsed.responseCode,
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
