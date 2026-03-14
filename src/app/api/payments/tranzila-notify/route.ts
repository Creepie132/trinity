import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReceipt } from '@/lib/tranzila-invoices'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/payments/tranzila-notify
 *
 * Tranzila My Billing шлёт этот callback при каждом автоматическом
 * рекуррентном списании. Обновляем статус подписки и создаём квитанцию.
 *
 * Параметры от Tranzila:
 *   Response         — '000' = успех
 *   cField1          — org_id (мы передавали его в первом платеже)
 *   sum              — сумма списания
 *   ConfirmationCode — код подтверждения
 *   index            — ID транзакции
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string> = {}

  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      const params = new URLSearchParams(text)
      params.forEach((value, key) => { body[key] = value })
    }
  } catch (e) {
    console.error('[tranzila-notify] Failed to parse body:', e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const responseCode  = body['Response']
  const orgId         = body['cField1']
  const transactionId = body['ConfirmationCode'] || body['index']
  const amount        = parseFloat(body['sum'] ?? '0')

  console.log('[tranzila-notify] Received:', { responseCode, orgId, transactionId, amount })

  if (!orgId) {
    console.error('[tranzila-notify] No org_id in cField1')
    return NextResponse.json({ ok: false, reason: 'no_org_id' })
  }

  if (responseCode !== '000') {
    console.error('[tranzila-notify] Recurring charge failed for org:', orgId, '| Response:', responseCode)
    await supabase
      .from('organizations')
      .update({ billing_status: 'failed' })
      .eq('id', orgId)
    return NextResponse.json({ ok: false, reason: 'charge_failed' })
  }

  // ── Update subscription ──────────────────────────────────────────────────
  const nextBilling = new Date()
  nextBilling.setDate(nextBilling.getDate() + 30)
  const nextBillingStr = nextBilling.toISOString().split('T')[0]

  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status:  'active',
      billing_status:       'paid',
      billing_due_date:     nextBillingStr,
      last_billing_date:    new Date().toISOString().split('T')[0],
      subscription_expires_at: new Date(
        nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq('id', orgId)

  if (error) {
    console.error('[tranzila-notify] Failed to update org:', orgId, error)
    return NextResponse.json({ ok: false, reason: 'db_error' })
  }

  // ── Create Tranzila receipt ──────────────────────────────────────────────
  if (amount > 0) {
    try {
      // Get org name + owner email for receipt
      const { data: org } = await supabase
        .from('organizations')
        .select('name, owner_email, owner_name')
        .eq('id', orgId)
        .single()

      const receipt = await createReceipt({
        clientName:    org?.owner_name  ?? org?.name ?? 'לקוח',
        clientEmail:   org?.owner_email ?? undefined,
        items: [{
          name:       `Trinity CRM — מנוי חודשי`,
          quantity:   1,
          unit_price: amount,
        }],
        totalAmount:   amount,
        paymentMethod: 'credit_card',
      })

      // Store document_id in the payments record for this transaction
      await supabase
        .from('payments')
        .update({ tranzila_document_id: receipt.documentId })
        .eq('org_id', orgId)
        .eq('transaction_id', transactionId)

      console.log('[tranzila-notify] ✅ Receipt created:', receipt.documentId, '| doc#', receipt.documentNum)
    } catch (receiptErr) {
      // Non-fatal — subscription was updated successfully
      console.error('[tranzila-notify] Receipt creation failed:', receiptErr)
    }
  }

  console.log('[tranzila-notify] ✅ Recurring OK for org:', orgId, '| next:', nextBillingStr)
  return NextResponse.json({ ok: true })
}
