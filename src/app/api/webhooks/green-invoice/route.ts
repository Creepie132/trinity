import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GI_SECRET = process.env.GREEN_INVOICE_SECRET!

// ─── Verify signature ─────────────────────────────────────────────────────────
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !GI_SECRET) return false
  const expected = crypto
    .createHmac('sha256', GI_SECRET)
    .update(payload)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-green-invoice-signature')

  if (!verifySignature(rawBody, signature)) {
    console.warn('Green Invoice webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, data } = event
  console.log('Green Invoice webhook:', type, data?.id)

  try {
    switch (type) {

      // ── Документ создан ──────────────────────────────────────────────────────
      case 'document/created': {
        const doc = data
        const phone = doc.client?.phone?.replace(/\D/g, '') ?? null
        const email = doc.client?.email ?? null
        let clientId: string | null = null
        if (phone) {
          const { data: client } = await supabase
            .from('clients').select('id').ilike('phone', `%${phone}%`).limit(1).single()
          if (client) clientId = client.id
        }
        await supabase.from('audit_log').insert({
          action: 'green_invoice_document_created',
          resource_type: 'document',
          resource_id: doc.id,
          metadata: { document_number: doc.number, amount: doc.amount, client_id: clientId, email },
        })
        break
      }

      // ── Платёж получен ───────────────────────────────────────────────────────
      case 'payment/received': {
        await supabase.from('audit_log').insert({
          action: 'green_invoice_payment_received',
          resource_type: 'payment',
          resource_id: data.id,
          metadata: { amount: data.amount, currency: data.currency, document_id: data.documentId },
        })
        break
      }

      // ── Расход распознан AI ──────────────────────────────────────────────────
      case 'expense-draft/parsed': {
        await supabase.from('audit_log').insert({
          action: 'green_invoice_expense_parsed',
          resource_type: 'expense',
          resource_id: data.id,
          metadata: { vendor: data.vendor?.name, amount: data.amount, vat: data.vat },
        })
        break
      }

      // ── Клиент создан ────────────────────────────────────────────────────────
      case 'client/created': {
        await supabase.from('audit_log').insert({
          action: 'green_invoice_client_created',
          resource_type: 'client',
          resource_id: data.id,
          metadata: { name: data.name, phone: data.phone, email: data.email },
        })
        break
      }

      default:
        console.log('Unhandled Green Invoice event:', type)
    }
  } catch (err) {
    console.error('Green Invoice webhook error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── GET — health check ───────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Green Invoice webhook',
    events: ['document/created', 'payment/received', 'expense-draft/parsed', 'client/created'],
  })
}
