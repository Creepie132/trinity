import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getReceiptPdf } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/[id]/tranzila-pdf
 * Proxies the Tranzila receipt PDF to the browser for inline viewing / download.
 * Service role used — supports impersonation (supabase anon+RLS would block admin viewing client's payment).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const service = createSupabaseServiceClient()

    const { data: payment } = await service
      .from('payments')
      .select('tranzila_document_id, org_id')
      .eq('id', id)
      .single()

    if (!payment?.tranzila_document_id) {
      return NextResponse.json({ error: 'No receipt found for this payment' }, { status: 404 })
    }

    // Security: суперадмин может смотреть любой платёж; обычный юзер — только своей org
    if (!auth.isAdmin && auth.orgId !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pdfBuffer = await getReceiptPdf(payment.tranzila_document_id)
    const pdfBytes  = new Uint8Array(pdfBuffer)

    return new Response(pdfBytes, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${id.slice(0, 8)}.pdf"`,
        'Cache-Control':       'private, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[tranzila-pdf]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
