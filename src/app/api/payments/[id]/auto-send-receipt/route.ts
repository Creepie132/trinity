import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReceipt, getReceiptPdf, TranzilaDocumentType } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/payments/[id]/auto-send-receipt
// Internal route (Bearer CRON_SECRET). Checks org_receipt_settings,
// generates receipt via Tranzila or Morning, sends PDF via Whapi.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paymentId } = await params

    const { data: payment, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*, clients:client_id (id, first_name, last_name, phone, email)')
      .eq('id', paymentId)
      .single()

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const { data: settings } = await supabaseAdmin
      .from('org_receipt_settings')
      .select('*')
      .eq('org_id', payment.org_id)
      .maybeSingle()

    if (!settings?.is_enabled || settings.provider === 'none') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'disabled or provider=none' })
    }

    const documentType = (settings.document_type ?? 'receipt_invoice') as TranzilaDocumentType

    const client = payment.clients as {
      id: string; first_name?: string; last_name?: string
      phone?: string; email?: string
    } | null

    const clientPhone = client?.phone
    if (!clientPhone) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no client phone' })
    }

    const clientName  = client
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'לקוח'
      : 'לקוח'
    const clientEmail = client?.email ?? undefined

    let documentId: string
    let documentNum: string
    let pdfBuffer: Buffer

    // ── Tranzila ─────────────────────────────────────────────────────────────
    if (settings.provider === 'tranzila') {
      // Credential guard: org must have tranzila_token to use platform invoice API
      const { data: orgRow } = await supabaseAdmin
        .from('organizations')
        .select('tranzila_terminal')
        .eq('id', payment.org_id)
        .maybeSingle()

      if (!orgRow?.tranzila_terminal) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'Tranzila terminal not configured for this org' })
      }

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
          clientName, clientEmail,
          items: [{ name: payment.description || 'תשלום', quantity: 1, unit_price: Number(payment.amount) }],
          totalAmount:   Number(payment.amount),
          paymentMethod: payment.payment_method ?? 'other',
          card,
          documentType,
        })
        documentId  = receipt.documentId
        documentNum = receipt.documentNum

        await supabaseAdmin.from('payments')
          .update({ tranzila_document_id: documentId })
          .eq('id', paymentId)
      }
      pdfBuffer = await getReceiptPdf(documentId)

    // ── Morning (Green Invoice) ───────────────────────────────────────────────
    } else if (settings.provider === 'morning') {
      // Load Morning API key from org_integrations
      const { data: integration } = await supabaseAdmin
        .from('org_integrations')
        .select('config, is_active')
        .eq('org_id', payment.org_id)
        .eq('provider', 'green_invoice')
        .maybeSingle()

      if (!integration?.is_active || !integration.config?.api_key) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'Morning not configured for this org' })
      }

      const morningResult = await createMorningReceipt({
        apiKey:      integration.config.api_key as string,
        clientName,
        clientEmail,
        clientPhone,
        amount:      Number(payment.amount),
        description: payment.description || 'תשלום',
        paymentMethod: payment.payment_method ?? 'other',
      })

      documentId  = morningResult.documentId
      documentNum = morningResult.documentNum
      pdfBuffer   = morningResult.pdfBuffer

    } else {
      return NextResponse.json({ ok: true, skipped: true, reason: `unknown provider: ${settings.provider}` })
    }

    // ── Send via Whapi ────────────────────────────────────────────────────────
    const { data: waIntegration } = await supabaseAdmin
      .from('wa_integrations')
      .select('provider_type, instance_id, vault_secret_id, is_active')
      .eq('org_id', payment.org_id)
      .maybeSingle()

    if (!waIntegration?.is_active || waIntegration.provider_type !== 'whapi') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no active Whapi integration' })
    }

    const { data: secretData } = await supabaseAdmin
      .rpc('vault_read_secret', { secret_id: waIntegration.vault_secret_id })

    const whapiKey = secretData as string | null
    if (!whapiKey) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'vault_read_secret failed' })
    }

    const message = buildMessage(settings.message_template, {
      client_name:  clientName,
      amount:       Number(payment.amount).toFixed(2),
      document_num: documentNum,
    })

    const whapiBase = waIntegration.instance_id
      ? `https://gate.whapi.cloud/${waIntegration.instance_id}`
      : 'https://gate.whapi.cloud'

    const sent = await sendViaWhapi({ apiKey: whapiKey, whapiBase, phone: clientPhone, message, pdfBuffer, documentNum })

    return NextResponse.json({ ok: true, sent, documentId, documentNum })
  } catch (err: any) {
    console.error('[auto-send-receipt]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Morning (Green Invoice) receipt creation ────────────────────────────────
// API: https://api.greeninvoice.co.il/api/v1
// Document type 400 = קבלה (receipt)
const GI_BASE = 'https://api.greeninvoice.co.il/api/v1'

const PAYMENT_METHOD_MAP: Record<string, number> = {
  cash: 1, check: 2, bank_transfer: 3, credit_card: 4, other: 1,
}

async function createMorningReceipt(opts: {
  apiKey: string; clientName: string; clientEmail?: string; clientPhone: string
  amount: number; description: string; paymentMethod: string
}): Promise<{ documentId: string; documentNum: string; pdfBuffer: Buffer }> {
  const { apiKey, clientName, clientEmail, clientPhone, amount, description, paymentMethod } = opts

  const today = new Date().toISOString().slice(0, 10)
  const giPaymentType = PAYMENT_METHOD_MAP[paymentMethod] ?? 1

  const body: Record<string, unknown> = {
    description: 'קבלה',
    type: 400,
    date: today,
    dueDate: today,
    lang: 'he',
    currency: 'ILS',
    vatType: 0,
    discount: 0,
    roundingRequested: false,
    signed: true,
    client: {
      name: clientName,
      ...(clientEmail ? { emailAddress: clientEmail } : {}),
      ...(clientPhone ? { phone: clientPhone } : {}),
    },
    income: [{ description, quantity: 1, price: amount, currency: 'ILS', vatType: 0 }],
    payment: [{ type: giPaymentType, price: amount, currency: 'ILS', date: today }],
  }

  const createRes = await fetch(`${GI_BASE}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Morning createReceipt failed ${createRes.status}: ${errText}`)
  }

  const doc = await createRes.json()
  const documentId  = String(doc.id)
  const documentNum = String(doc.number ?? doc.id)

  // Fetch PDF — Green Invoice returns download URL or we call /documents/{id}/download
  const pdfBuffer = await fetchMorningPdf(apiKey, documentId, doc.attachment?.downloadUrl)

  return { documentId, documentNum, pdfBuffer }
}

async function fetchMorningPdf(apiKey: string, docId: string, downloadUrl?: string): Promise<Buffer> {
  const url = downloadUrl ?? `${GI_BASE}/documents/${docId}/download`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Morning PDF fetch failed ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function buildMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

async function sendViaWhapi(opts: {
  apiKey: string; whapiBase: string; phone: string
  message: string; pdfBuffer: Buffer; documentNum: string
}): Promise<boolean> {
  const { apiKey, whapiBase, phone, message, pdfBuffer, documentNum } = opts
  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '972')
  const base64   = pdfBuffer.toString('base64')
  const mediaUrl = `data:application/pdf;base64,${base64}`

  const res = await fetch(`${whapiBase}/messages/document`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
