import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { createReceipt, getReceiptPdf } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/[id]/send-receipt
 *
 * 1. Loads payment + client from DB
 * 2. Creates receipt via Tranzila Invoices API
 *    → Tranzila auto-emails PDF to client if client.email exists
 * 3. Fetches PDF bytes
 * 4. Sends via WhatsApp Business API if client.phone exists (when configured)
 * 5. Saves tranzila_document_id back to DB
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select(`*, clients:client_id (id, first_name, last_name, email, phone)`)
      .eq('id', id)
      .single()

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser || orgUser.org_id !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Idempotency: receipt already created
    if (payment.tranzila_document_id) {
      return NextResponse.json({
        ok: true,
        documentId: payment.tranzila_document_id,
        alreadySent: true,
      })
    }

    const client = payment.clients as {
      id: string; first_name?: string; last_name?: string
      email?: string; phone?: string
    } | null

    const clientName  = client
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || 'לקוח'
      : 'לקוח'
    const clientEmail = client?.email ?? undefined
    const clientPhone = client?.phone ?? undefined
    const itemName    = payment.description || 'תשלום'

    // Create receipt (Tranzila auto-emails PDF if clientEmail is provided)
    const receipt = await createReceipt({
      clientName,
      clientEmail,
      items: [{ name: itemName, quantity: 1, unit_price: Number(payment.amount) }],
      totalAmount:   Number(payment.amount),
      paymentMethod: payment.payment_method ?? 'other',
    })

    // Persist document_id before WhatsApp — don't risk losing it on WA failure
    await supabase
      .from('payments')
      .update({ tranzila_document_id: receipt.documentId })
      .eq('id', id)

    // WhatsApp Business API (Cloud API by Meta)
    let whatsappSent = false
    if (clientPhone) {
      try {
        const pdfBuffer = await getReceiptPdf(receipt.documentId)
        whatsappSent = await sendReceiptWhatsApp({
          phone:       clientPhone,
          clientName,
          amount:      Number(payment.amount),
          documentNum: receipt.documentNum,
          pdfBuffer,
        })
      } catch (waErr) {
        // Non-fatal — receipt was created and email sent
        console.error('[send-receipt] WhatsApp send failed:', waErr)
      }
    }

    return NextResponse.json({
      ok:          true,
      documentId:  receipt.documentId,
      documentNum: receipt.documentNum,
      emailSent:   !!clientEmail,
      whatsappSent,
    })
  } catch (err: any) {
    console.error('[send-receipt]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── WhatsApp Business API (Meta Cloud API) ──────────────────────────────────
//
// Required env vars (set when you get WhatsApp Business API access):
//   WHATSAPP_ACCESS_TOKEN   — permanent system user token from Meta Business Manager
//   WHATSAPP_PHONE_NUMBER_ID — your WhatsApp Business phone number ID
//   WHATSAPP_RECEIPT_TEMPLATE_NAME — approved template name (e.g. "receipt_document")
//
// Flow:
//   1. Upload PDF → POST /media → get media_id
//   2. Send template message with document component → media_id + caption
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

async function sendReceiptWhatsApp(opts: {
  phone:       string
  clientName:  string
  amount:      number
  documentNum: string
  pdfBuffer:   Buffer
}): Promise<boolean> {
  const accessToken      = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId    = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName     = process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME ?? 'receipt_document'

  if (!accessToken || !phoneNumberId) {
    console.info('[send-receipt] WhatsApp Business API not configured — skipping')
    return false
  }

  const baseUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}`

  // Normalize: strip non-digits, replace leading 0 with 972 (Israel)
  const phone = opts.pdfBuffer
    ? opts.phone.replace(/\D/g, '').replace(/^0/, '972')
    : opts.phone.replace(/\D/g, '').replace(/^0/, '972')

  // Step 1 — Upload PDF as WhatsApp media
  const formData = new FormData()
  // Convert Buffer → Blob via base64 to avoid ArrayBufferLike TS issue
  const base64   = opts.pdfBuffer.toString('base64')
  const binary   = atob(base64)
  const bytes    = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  formData.append('file', blob, `receipt-${opts.documentNum}.pdf`)
  formData.append('type', 'application/pdf')
  formData.append('messaging_product', 'whatsapp')

  const uploadRes = await fetch(`${baseUrl}/media`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body:    formData,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`WhatsApp media upload failed (${uploadRes.status}): ${err}`)
  }

  const { id: mediaId } = await uploadRes.json()
  if (!mediaId) throw new Error('WhatsApp media upload: no media_id returned')

  // Step 2 — Send template message with document
  // Template must be pre-approved in Meta Business Manager.
  // Expected template structure:
  //   Header: document (PDF)
  //   Body: "קבלה מספר {{1}} על סך ₪{{2}}"
  //   (adjust component params below to match your template)
  const msgRes = await fetch(`${baseUrl}/messages`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to:                phone,
      type:              'template',
      template: {
        name:     templateName,
        language: { code: 'he' },
        components: [
          {
            type:   'header',
            parameters: [{
              type:     'document',
              document: {
                id:       mediaId,
                filename: `receipt-${opts.documentNum}.pdf`,
              },
            }],
          },
          {
            type:       'body',
            parameters: [
              { type: 'text', text: opts.documentNum },
              { type: 'text', text: opts.amount.toFixed(2) },
              { type: 'text', text: opts.clientName },
            ],
          },
        ],
      },
    }),
  })

  if (!msgRes.ok) {
    const err = await msgRes.text()
    throw new Error(`WhatsApp send message failed (${msgRes.status}): ${err}`)
  }

  return true
}
