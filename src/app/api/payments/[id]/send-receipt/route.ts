import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { createReceipt, getReceiptPdf } from '@/lib/tranzila-invoices'

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

    const receipt = await createReceipt({
      clientName,
      clientEmail,
      items: [{ name: itemName, quantity: 1, unit_price: Number(payment.amount) }],
      totalAmount:   Number(payment.amount),
      paymentMethod: payment.payment_method ?? 'other',
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
// Required env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// WHATSAPP_RECEIPT_TEMPLATE_NAME (default: 'receipt_document')
async function sendReceiptWhatsApp(opts: {
  phone: string; clientName: string; amount: number
  documentNum: string; pdfBuffer: Buffer
}): Promise<boolean> {
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName  = process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME ?? 'receipt_document'

  if (!accessToken || !phoneNumberId) {
    console.info('[send-receipt] WhatsApp Business API not configured — skipping')
    return false
  }

  const baseUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}`
  const phone   = opts.phone.replace(/\D/g, '').replace(/^0/, '972')

  const formData = new FormData()
  const base64 = opts.pdfBuffer.toString('base64')
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  formData.append('file', blob, `receipt-${opts.documentNum}.pdf`)
  formData.append('type', 'application/pdf')
  formData.append('messaging_product', 'whatsapp')

  const uploadRes = await fetch(`${baseUrl}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData,
  })
  if (!uploadRes.ok) throw new Error(`WhatsApp media upload failed: ${uploadRes.status}`)

  const { id: mediaId } = await uploadRes.json()
  if (!mediaId) throw new Error('WhatsApp media upload: no media_id returned')

  const msgRes = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'he' },
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
  if (!msgRes.ok) throw new Error(`WhatsApp send failed: ${msgRes.status}`)
  return true
}
