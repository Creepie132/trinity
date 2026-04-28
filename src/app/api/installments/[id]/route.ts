import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/installments/[id]
 * Обновить статус плана рассрочки (cancel, pause — будущее)
 *
 * DELETE /api/installments/[id]
 * Отменить (cancel) план рассрочки. Списаний больше не будет.
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id } = await params

    const body = await request.json()
    const { status } = body

    if (!['cancelled', 'active'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('payment_installments')
      .update({ status })
      .eq('id', id)
      .eq('org_id', orgId)
      .select().single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[installments PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth
    const { id } = await params

    const supabase = createSupabaseServiceClient()

    const { error } = await supabase
      .from('payment_installments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[installments DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
