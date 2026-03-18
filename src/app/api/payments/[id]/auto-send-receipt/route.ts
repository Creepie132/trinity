import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReceipt, getReceiptPdf } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/payments/[id]/auto-send-receipt
// Called internally (server-to-server) after payment is created/updated.
// Checks org_receipt_settings, generates receipt via chosen provider,
// sends PDF via Whapi (per-org token from Vault).
// Authorization: Bearer <CRON_SECRET> (same secret used by cron jobs)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Internal auth — same pattern as cron routes
    const authHeader = req.headers.get('authorization') ?? ''
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paymentId } = await params

    // Load payment + client
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*, clients:client_id (id, first_name, last_name, phone, email)')
      .eq('id', paymentId)
      .single()

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Load org receipt settings
    const { data: settings } = await supabaseAdmin
      .from('org_receipt_settings')
      .select('*')
      .eq('org_id', payment.org_id)
      .maybeSingle()

    if (!settings?.is_enabled || settings.provider === 'none') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled or provider=none' })
    }

    const client = payment.clients as {
      id: string; first_name?: string; last_name?: string
      phone?: string; email?: string
    } | null

    const clientPhone = client?.phone
    if (!clientPhone) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no client phone' })
    }

    const clientName  = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'לקוח' : 'לקוח'
    const clientEmail = client?.email ?? undefined

    // Only Tranzila supported for now (Morning receipt generation TBD)
    let documentId: string
    let documentNum: string

    if (settings.provider === 'tranzila') {
      // If receipt already created for this payment — reuse
      if (payment.tranzila_document_id) {
        documentId  = payment.tranzila_document_id
        documentNum = payment.tranzila_document_num ?? documentId
      } else {
        const meta = (payment.metadata ?? {}) as Record<string, string>
        const card = (meta.card_last4 || meta.card_type) ? {
          last4:       meta.card_last4       ?? undefined,
          brand:       meta.card_type        ?? undefined,
          expiry:      meta.card_expiry      ?? undefined,
          approvalNum: meta.tranzila_approval_number ?? meta.ConfirmationCode ?? undefined,
          shovar:      meta.tranzila_shovar  ?? undefined,
          tranIndex:   payment.transaction_id ?? undefined,
        } : undefined

        const receipt = await createReceipt({
          clientName,
          clientEmail,
          items: [{ name: payment.description || 'תשלום', quantity: 1, unit_price: Number(payment.amount) }],
          totalAmount:   Number(payment.amount),
          paymentMethod: payment.payment_method ?? 'other',
          card,
        })
        documentId  = receipt.documentId
        documentNum = receipt.documentNum

        // Save document ID on payment so we don't re-generate
        await supabaseAdmin.from('payments')
          .update({ tranzila_document_id: documentId })
          .eq('id', paymentId)
      }
    } else {
      // Morning provider — receipt generation not yet implemented
      return NextResponse.json({ ok: true, skipped: true, reason: 'morning receipt generation not yet implemented' })
    }

    // Get Whapi config for this org from wa_integrations + Vault
    const { data: waIntegration } = await supabaseAdmin
      .from('wa_integrations')
      .select('provider_type, instance_id, vault_secret_id, is_active')
      .eq('org_id', payment.org_id)
      .maybeSingle()

    if (!waIntegration?.is_active || waIntegration.provider_type !== 'whapi') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no active Whapi integration' })
    }

    // Read API key from Vault
    const { data: secretData } = await supabaseAdmin
      .rpc('vault_read_secret', { secret_id: waIntegration.vault_secret_id })

    const apiKey = secretData as string | null
    if (!apiKey) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'vault_read_secret failed' })
    }

    // Fetch receipt PDF
    const pdfBuffer = await getReceiptPdf(documentId)

    // Build message from template
    const message = buildMessage(settings.message_template, {
      client_name: clientName,
      amount: Number(payment.amount).toFixed(2),
      document_num: documentNum,
    })

    // Send via Whapi
    const whapiBase = waIntegration.instance_id
      ? `https://gate.whapi.cloud/${waIntegration.instance_id}`
      : 'https://gate.whapi.cloud'

    const sent = await sendViaWhapi({ apiKey, whapiBase, phone: clientPhone, message, pdfBuffer, documentNum })

    return NextResponse.json({ ok: true, sent, documentId, documentNum })
  } catch (err: any) {
    console.error('[auto-send-receipt]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

async function sendViaWhapi(opts: {
  apiKey: string; whapiBase: string; phone: string
  message: string; pdfBuffer: Buffer; documentNum: string
}): Promise<boolean> {
  const { apiKey, whapiBase, phone, message, pdfBuffer, documentNum } = opts
  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '972')

  // Convert buffer to base64 data URI for Whapi document send
  const base64 = pdfBuffer.toString('base64')
  const mediaUrl = `data:application/pdf;base64,${base64}`

  const res = await fetch(`${whapiBase}/messages/document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to:       `${normalizedPhone}@s.whatsapp.net`,
      media:    mediaUrl,
      filename: `receipt-${documentNum}.pdf`,
      caption:  message,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[auto-send-receipt] Whapi error:', res.status, errText)
    return false
  }

  return true
}
