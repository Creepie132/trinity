import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { getReceiptPdf } from '@/lib/tranzila-invoices'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/[id]/tranzila-pdf
 * Proxies the Tranzila receipt PDF to the browser for inline viewing / download.
 */
export async function GET(
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

    const { data: payment } = await supabase
      .from('payments')
      .select('tranzila_document_id, org_id')
      .eq('id', id)
      .single()

    if (!payment?.tranzila_document_id) {
      return NextResponse.json({ error: 'No receipt found for this payment' }, { status: 404 })
    }

    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!orgUser || orgUser.org_id !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pdfBuffer = await getReceiptPdf(payment.tranzila_document_id)

    // Convert Node.js Buffer → Uint8Array so it's compatible with Web API BodyInit
    const pdfBytes = new Uint8Array(pdfBuffer)

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
