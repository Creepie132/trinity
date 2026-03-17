import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GI_SECRET = process.env.GREEN_INVOICE_WEBHOOK_SECRET!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-gi-signature')
  if (!signature) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(GI_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = Buffer.from(signed).toString('hex')
  return signature === expected || signature === `sha256=${expected}`
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  let body: any
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Verify signature (skip in dev)
  if (process.env.NODE_ENV === 'production') {
    const valid = await verifySignature(req, rawBody)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { event, data } = body
  console.log(`[GreenInvoice Webhook] event: ${event}`, data?.id)

  try {
    switch (event) {

      // ── Квитанция / документ создан ────────────────────────────────────
      case 'document/created': {
        const doc = data
        // Логируем в audit_log для истории
        await supabase.from('audit_log').insert({
          action: 'green_invoice.document_created',
          entity_type: 'document',
          entity_id: doc.id,
          details: { type: doc.type, number: doc.number, amount: doc.amount, client: doc.client?.name }
        })
        break
      }

      // ── Платёж получен ─────────────────────────────────────────────────
      case 'payment/received': {
        const payment = data
        // Найти платёж в Trinity по сумме и клиенту, обновить статус
        await supabase.from('audit_log').insert({
          action: 'green_invoice.payment_received',
          entity_type: 'payment',
          entity_id: payment.id,
          details: { amount: payment.amount, client: payment.client?.name, method: payment.type }
        })
        break
      }

      // ── AI распознал черновик расхода ──────────────────────────────────
      case 'expense-draft/parsed': {
        const draft = data
        await supabase.from('audit_log').insert({
          action: 'green_invoice.expense_draft_parsed',
          entity_type: 'expense_draft',
          entity_id: draft.id,
          details: { vendor: draft.supplier?.name, amount: draft.amount, date: draft.date }
        })
        break
      }

      // ── Новый клиент создан ────────────────────────────────────────────
      case 'client/created': {
        await supabase.from('audit_log').insert({
          action: 'green_invoice.client_created',
          entity_type: 'client',
          entity_id: data.id,
          details: { name: data.name, email: data.email, phone: data.phone }
        })
        break
      }

      default:
        console.log(`[GreenInvoice Webhook] Unhandled event: ${event}`)
    }
  } catch (err) {
    console.error('[GreenInvoice Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
