import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Check auth and feature access
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      return authResult.response
    }

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()
    const paymentId = params.id

    // Get payment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('org_id', org_id)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if payment can be cancelled
    const paymentMethod = payment.payment_method || payment.method || ''
    const isCredit = paymentMethod === 'credit_card' || paymentMethod === 'credit' || paymentMethod === 'אשראי' || paymentMethod === 'card'
    const isPending = payment.status === 'pending' || payment.status === 'Ожидание'

    if (!isCredit || !isPending) {
      return NextResponse.json(
        { error: 'Only pending credit card payments can be cancelled' },
        { status: 400 }
      )
    }

    // Update payment status to cancelled
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('org_id', org_id)

    if (updateError) {
      console.error('Failed to cancel payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel payment' },
        { status: 500 }
      )
    }

    // ✅ Audit log
    await logAudit({
      org_id,
      user_id: authResult.data.user.id,
      user_email: authResult.data.email,
      action: 'cancel',
      entity_type: 'payment',
      entity_id: paymentId,
      new_data: { status: 'cancelled' },
      ip_address: getClientIp(request),
    })

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      status: 'cancelled',
    })
  } catch (error: any) {
    console.error('Cancel payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
