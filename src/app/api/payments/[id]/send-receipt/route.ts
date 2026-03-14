import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { createReceipt, getReceiptPdf } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/[id]/send-receipt
 *
 * 1. Loads payment + client from DB
 * 2. Creates receipt via Tranzila Invoices API (Tranzila auto-emails if client.email exists)
 * 3. Fetches PDF bytes
 * 4. Sends via Wati WhatsApp if client.phone exists
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
        whatsappSent = await sendReceiptWhatsapp({
          phone: clientPhone,
          clientName,
          amount: Number(payment.amount),
          documentNum: receipt.documentNum,
          pdfBase64: pdfBuffer.toString('base64'),
        })
      } catch (waErr) {
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

// ─── Wati WhatsApp helper ────────────────────────────────────────────────────

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  // Create Blob from a plain number array to avoid ArrayBufferLike issues
  return new Blob([bytes.buffer as ArrayBuffer], { type })
}

async function sendReceiptWhatsapp(opts: {
  phone:       string
  clientName:  string
  amount:      number
  documentNum: string
  pdfBase64:   string
}): Promise<boolean> {
  const watiToken   = process.env.WATI_API_TOKEN
  const watiBaseUrl = process.env.WATI_API_URL

  if (!watiToken || !watiBaseUrl) {
    console.warn('[send-receipt] WATI_API_TOKEN / WATI_API_URL not set — skipping WhatsApp')
    return false
  }

  const normalizedPhone = opts.phone.replace(/\D/g, '').replace(/^0/, '972')

  const formData = new FormData()
  const blob     = base64ToBlob(opts.pdfBase64, 'application/pdf')
  formData.append('file', blob, `receipt-${opts.documentNum}.pdf`)

  const uploadRes = await fetch(`${watiBaseUrl}/api/v1/uploadMedia`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${watiToken}` },
    body:    formData,
  })

  if (!uploadRes.ok) throw new Error(`Wati uploadMedia failed: ${uploadRes.status}`)

  const uploadData = await uploadRes.json()
  const mediaId    = uploadData?.mediaId ?? uploadData?.id
  if (!mediaId) throw new Error('Wati uploadMedia: no mediaId in response')

  const msgRes = await fetch(`${watiBaseUrl}/api/v1/sendSessionFile/${normalizedPhone}`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${watiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mediaId,
      caption: `קבלה מספר ${opts.documentNum} — ₪${opts.amount.toFixed(2)}\nתודה, ${opts.clientName}!`,
    }),
  })

  return msgRes.ok
}
