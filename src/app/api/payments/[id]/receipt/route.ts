import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { generateReceipt } from '@/lib/generate-receipt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    // Service role — bypasses RLS, нужен при impersonation (supabase anon не видит чужой payment)
    const service = createSupabaseServiceClient()

    const { data: payment, error: paymentError } = await service
      .from('payments')
      .select(`*, clients:client_id (id, first_name, last_name, phone)`)
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Security: суперадмин может смотреть любой платёж; обычный юзер — только своей org
    if (!auth.isAdmin && auth.orgId !== payment.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: organization } = await service
      .from('organizations')
      .select('name')
      .eq('id', payment.org_id)
      .single()

    const searchParams = request.nextUrl.searchParams
    const locale = (searchParams.get('locale') || 'he') as 'he' | 'ru'

    const html = generateReceipt({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        paid_at: payment.paid_at,
        created_at: payment.created_at,
        status: payment.status,
      },
      client: payment.clients || null,
      orgName: organization?.name || '',
      description: payment.description,
      locale,
    })

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error: any) {
    console.error('Receipt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt', details: error.message },
      { status: 500 }
    )
  }
}
