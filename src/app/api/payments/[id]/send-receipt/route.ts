import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { createReceipt, getReceiptPdf, CardDetails } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

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
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser || orgUser.org_id !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Idempotency
    if (payment.tranzila_document_id) {
      return NextResponse.json({
        ok: true, documentId: payment.tranzila_document_id, alreadySent: true,
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

    // Extract card details from payment metadata (saved during Tranzila callback)
    const meta = (payment.metadata ?? {}) as Record<string, string>
    const card: CardDetails | undefined = (
      meta.card_last4 || meta.card_type || meta.tranzila_approval_number
    ) ? {
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
      items: [{ name: itemName, quantity: 1, unit_price: Number(payment.amount) }],
      totalAmount:   Number(payment.amount),
      paymentMethod: payment.payment_method ?? 'other',
      card,
    })

    await supabase
      .from('payments')
      .update({ tranzila_document_id: receipt.documentId })
      .eq('id', id)

    let whatsappSent = false
    if (clientPhone) {
      try {
        const pdfBuffer = await getReceiptPdf(receipt.documentId)
        whatsappSent = await sendReceiptWhatsApp({
          phone: clientPhone, clientName,
          amount: Number(payment.amount),
          documentNum: receipt.documentNum,
          pdfBuffer,
        })
      } catch (waErr) {
        console.error('[send-receipt] WhatsApp send failed:', waErr)
      }
    }

    return NextResponse.json({
      ok: true, documentId: receipt.documentId,
      documentNum: receipt.documentNum,
      emailSent: !!clientEmail, whatsappSent,
    })
  } catch (err: any) {
    console.error('[send-receipt]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── WhatsApp Business API (Meta Cloud API) ──────────────────────────────────
async function sendReceiptWhatsApp(opts: {
  phone: string; clientName: string; amount: number
  documentNum: string; pdfBuffer: Buffer
}): Promise<boolean> {
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName  = process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME ?? 'receipt_document'

  if (!accessToken || !phoneNumberId) {
    console.info('[send-receipt] WhatsApp not configured — skipping')
    return false
  }

  const baseUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}`
  const phone   = opts.phone.replace(/\D/g, '').replace(/^0/, '972')

  const formData = new FormData()
  const base64 = opts.pdfBuffer.toString('base64')
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  formData.append('file', new Blob([bytes], { type: 'application/pdf' }), `receipt-${opts.documentNum}.pdf`)
  formData.append('type', 'application/pdf')
  formData.append('messaging_product', 'whatsapp')

  const uploadRes = await fetch(`${baseUrl}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData,
  })
  if (!uploadRes.ok) throw new Error(`WA media upload failed: ${uploadRes.status}`)

  const { id: mediaId } = await uploadRes.json()
  if (!mediaId) throw new Error('WA upload: no media_id')

  const msgRes = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: phone, type: 'template',
      template: {
        name: templateName, language: { code: 'he' },
        components: [
          { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: `receipt-${opts.documentNum}.pdf` } }] },
          { type: 'body', parameters: [
            { type: 'text', text: opts.documentNum },
            { type: 'text', text: opts.amount.toFixed(2) },
            { type: 'text', text: opts.clientName },
          ]},
        ],
      },
    }),
  })
  return msgRes.ok
}
