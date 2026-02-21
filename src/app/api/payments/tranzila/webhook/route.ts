import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTranzilaInvoice, getInvoiceDisplayUrl, TRANZILA_INVOICE_ERRORS, mapPaymentMethodToTranzila } from '@/lib/tranzila-invoices'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TRANZILA_IPS = ['62.219.85.140', '62.219.85.141', '62.219.85.148']

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  basic: {
    clients: true,
    visits: true,
    booking: true,
    payments: true,
    statistics: true,
    sms: false,
    inventory: false,
    reports: false,
    subscriptions: false,
    telegram: false,
    loyalty: false,
    birthday: false,
  },
  pro: {
    clients: true,
    visits: true,
    booking: true,
    payments: true,
    statistics: true,
    sms: true,
    inventory: true,
    reports: true,
    subscriptions: true,
    telegram: false,
    loyalty: true,
    birthday: true,
  },
  enterprise: {
    clients: true,
    visits: true,
    booking: true,
    payments: true,
    statistics: true,
    sms: true,
    inventory: true,
    reports: true,
    subscriptions: true,
    telegram: true,
    loyalty: true,
    birthday: true,
  },
}

async function handleWebhook(req: NextRequest) {
  try {
    // IP whitelist (только в production)
    if (process.env.NODE_ENV === 'production' && process.env.TRANZILA_IP_WHITELIST_ENABLED === 'true') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
      if (!TRANZILA_IPS.includes(ip)) {
        console.warn(`Tranzila webhook: rejected IP ${ip}`)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Парсим params (form-urlencoded или query string)
    let params: Record<string, string> = {}
    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      params = Object.fromEntries(new URLSearchParams(text))
    } else {
      params = Object.fromEntries(new URL(req.url).searchParams)
    }

    const {
      Response: responseCode,
      index: tranId,
      sum,
      cardtype,
      last4digits,
      token,
      contact: paymentId, // Наш payment_id
    } = params

    if (!paymentId) {
      console.error('Tranzila webhook: missing contact (paymentId)')
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // Идемпотентность — проверяем статус
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, status, org_id, metadata')
      .eq('id', paymentId)
      .single()

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'completed') {
      console.log(`Webhook idempotent: payment ${paymentId} already completed`)
      return NextResponse.json({ ok: true, idempotent: true })
    }

    const isSuccess = responseCode === '000'

    if (!isSuccess) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          metadata: {
            ...(payment.metadata as object),
            tranzila_response: responseCode,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      return NextResponse.json({ ok: true, status: 'failed' })
    }

    // ── УСПЕШНАЯ ОПЛАТА ──
    const meta = payment.metadata as Record<string, unknown>
    const plan = (meta?.plan as string) ?? 'basic'
    const clientEmail = (meta?.client_email as string) ?? ''
    const clientName = (meta?.client_name as string) ?? 'לקוח'
    const setupFee = (meta?.setup_fee as number) ?? 0
    const monthlyFee = (meta?.monthly_fee as number) ?? 0
    const paymentAmount = parseFloat(sum ?? '0')

    // 1. Обновить payments → completed
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: tranId ?? null,
        paid_at: new Date().toISOString(),
        metadata: {
          ...meta,
          tranzila_response: responseCode,
          tranzila_tran_id: tranId,
          card_last4: last4digits,
          card_type: cardtype,
          token: token ?? null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // 2. Сохранить токен для рекуррентных платежей
    if (token) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('metadata')
        .eq('id', payment.org_id)
        .single()

      await supabaseAdmin
        .from('organizations')
        .update({
          metadata: {
            ...(org?.metadata as object ?? {}),
            tranzila_token: token,
            tranzila_card_last4: last4digits,
            tranzila_card_type: cardtype,
          },
        })
        .eq('id', payment.org_id)
    }

    // 3. Активировать подписку (upsert)
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    await supabaseAdmin
      .from('org_subscriptions')
      .upsert({
        org_id: payment.org_id,
        plan,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
        monthly_amount: monthlyFee,
        setup_fee_paid: setupFee > 0,
        payment_id: paymentId,
        updated_at: now.toISOString(),
      }, { onConflict: 'org_id' })

    // 4. Активировать модули организации
    await supabaseAdmin
      .from('organizations')
      .update({
        features: PLAN_FEATURES[plan] ?? PLAN_FEATURES.basic,
      })
      .eq('id', payment.org_id)

    // 5. Сгенерировать инвойс через Tranzila Billing API
    let invoiceUrl: string | null = null
    try {
      const items = []
      if (setupFee > 0) items.push({ name: 'Trinity CRM — דמי התקנה', unitPrice: setupFee, code: 'SETUP' })
      if (monthlyFee > 0) items.push({ name: `Trinity CRM — מנוי (${plan})`, unitPrice: monthlyFee, code: 'MONTHLY' })

      const invoiceResp = await createTranzilaInvoice({
        terminalName: process.env.TRANZILLA_TERMINAL_NAME!,
        clientName,
        clientEmail,
        amount: paymentAmount,
        items,
        paymentMethod: 'credit_card',
        ccLast4: last4digits,
        ccBrand: parseInt(cardtype ?? '2'),
        txnIndex: tranId ? parseInt(tranId) : undefined,
      })

      if (invoiceResp.status_code === 0 && invoiceResp.document?.retrieval_key) {
        invoiceUrl = getInvoiceDisplayUrl(invoiceResp.document.retrieval_key)

        await supabaseAdmin
          .from('payments')
          .update({
            metadata: {
              ...meta,
              invoice_url: invoiceUrl,
              invoice_id: invoiceResp.document.id,
              invoice_number: invoiceResp.document.number,
            },
          })
          .eq('id', paymentId)
      } else {
        const errMsg = TRANZILA_INVOICE_ERRORS[invoiceResp.status_code] ?? invoiceResp.status_msg
        console.error(`Invoice error ${invoiceResp.status_code}: ${errMsg}`)
      }
    } catch (invoiceErr) {
      console.error('Invoice creation failed (non-critical):', invoiceErr)
    }

    // 6. Audit log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        org_id: payment.org_id,
        action: 'subscription_activated',
        entity_type: 'payment',
        entity_id: paymentId,
        new_data: {
          plan,
          amount: paymentAmount,
          invoice_url: invoiceUrl,
        },
      })

    return NextResponse.json({ ok: true, invoice_url: invoiceUrl })
  } catch (error) {
    console.error('Tranzila webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return handleWebhook(req)
}

export async function GET(req: NextRequest) {
  return handleWebhook(req)
}

export const dynamic = 'force-dynamic'
