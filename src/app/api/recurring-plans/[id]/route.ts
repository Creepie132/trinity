import { NextRequest, NextResponse } from 'next/server'
import { checkAuthAndFeature, getSupabaseServerClient } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/recurring-plans/[id] — обновить план
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await checkAuthAndFeature('subscriptions')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }
    const { org_id } = authResult.data
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('recurring_plans')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/recurring-plans/[id] — удалить план
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await checkAuthAndFeature('subscriptions')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }
    const { org_id } = authResult.data
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { error } = await supabase
      .from('recurring_plans')
      .delete()
      .eq('id', id)
      .eq('org_id', org_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
