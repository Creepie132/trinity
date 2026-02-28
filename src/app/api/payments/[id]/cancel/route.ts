import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== CANCEL PAYMENT START ===')
    
    // ✅ Check auth and feature access
    console.log('Step 1: Checking auth...')
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      console.log('Step 1: Auth failed')
      return authResult.response
    }
    console.log('Step 1: Auth OK, org_id:', authResult.data.org_id)

    const { org_id } = authResult.data
    const supabase = await getSupabaseServerClient()
    const { id: paymentId } = await params

    console.log('Step 2: Payment ID:', paymentId)

    // Get payment
    console.log('Step 3: Fetching payment...')
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('org_id', org_id)
      .single()

    console.log('Step 3: Fetch result:', { payment, fetchError })

    if (fetchError || !payment) {
      console.log('Step 3: Payment not found')
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if payment can be cancelled
    console.log('Step 4: Checking if can cancel...')
    const paymentMethod = payment.payment_method || payment.method || ''
    const isCredit = paymentMethod === 'credit_card' || paymentMethod === 'credit' || paymentMethod === 'אשראי' || paymentMethod === 'card'
    const isPending = payment.status === 'pending' || payment.status === 'Ожидание'

    console.log('Step 4: Payment details:', {
      paymentMethod,
      isCredit,
      isPending,
      currentStatus: payment.status
    })

    if (!isCredit || !isPending) {
      console.log('Step 4: Cannot cancel - validation failed')
      return NextResponse.json(
        { error: 'Only pending credit card payments can be cancelled' },
        { status: 400 }
      )
    }

    // Update payment status to cancelled
    console.log('Step 5: Starting Supabase update...')
    console.log('Step 5: Update params:', {
      paymentId,
      org_id,
      newStatus: 'cancelled'
    })

    const { data, error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('org_id', org_id)
      .select()
    
    console.log('Step 6: Update result - data:', data)
    console.log('Step 6: Update result - error:', updateError)

    if (updateError) {
      console.error('Step 6: Update failed:', JSON.stringify(updateError))
      return NextResponse.json(
        { error: 'Failed to cancel payment', details: updateError.message },
        { status: 500 }
      )
    }

    // ✅ Audit log
    console.log('Step 7: Writing audit log...')
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

    console.log('Step 8: Success! Returning response')
    console.log('=== CANCEL PAYMENT END ===')

    return NextResponse.json({
      success: true,
      payment_id: paymentId,
      status: 'cancelled',
    })
  } catch (error: any) {
    console.error('=== CAUGHT EXCEPTION ===')
    console.error('Exception:', error)
    console.error('Error string:', JSON.stringify(error, null, 2))
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error stack:', error?.stack)
    console.error('======================')
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message, code: error?.code },
      { status: 500 }
    )
  }
}
