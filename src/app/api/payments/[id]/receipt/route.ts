import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/api-auth'
import { generateReceipt } from '@/lib/generate-receipt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get payment with client data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        clients:client_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Get organization data for the current user
    const { data: orgUser, error: orgUserError } = await supabase
      .from('organization_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgUser.org_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization data not found' }, { status: 404 })
    }

    // Get locale from query params (default to 'he')
    const searchParams = request.nextUrl.searchParams
    const locale = (searchParams.get('locale') || 'he') as 'he' | 'ru'

    // Generate HTML receipt
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
      orgName: organization.name,
      description: payment.description,
      locale,
    })

    // Return HTML (can be printed from browser)
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('Receipt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate receipt', details: error.message },
      { status: 500 }
    )
  }
}
