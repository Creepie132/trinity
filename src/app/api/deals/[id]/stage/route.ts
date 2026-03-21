import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// PATCH /api/deals/[id]/stage
// Drag-and-drop: move a deal to a different stage
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, orgId } = await getAuthContext(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dealId = params.id
    if (!dealId) return NextResponse.json({ error: 'Deal id missing' }, { status: 400 })

    const body = await request.json()
    const { stage_id } = body

    if (!stage_id)
      return NextResponse.json({ error: 'stage_id is required' }, { status: 400 })

    const supabase = createSupabaseServiceClient()

    // Validate target stage belongs to same org
    const { data: stage } = await supabase
      .from('deal_stages')
      .select('id, is_won, is_lost, name')
      .eq('id', stage_id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!stage)
      return NextResponse.json({ error: 'Invalid stage_id' }, { status: 400 })

    // Fetch deal — verify ownership + org
    const { data: deal } = await supabase
      .from('deals')
      .select('id, org_id, assigned_to, stage_id, title')
      .eq('id', dealId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!deal)
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Permission: own deal OR admin/owner
    const { data: orgUser } = await supabase
      .from('org_users')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = orgUser?.role === 'admin' || orgUser?.role === 'owner'
    if (!isAdmin && deal.assigned_to !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const oldStageId = deal.stage_id

    const { data: updated, error } = await supabase
      .from('deals')
      .update({ stage_id })
      .eq('id', dealId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error || !updated)
      return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })

    // Audit
    await supabase.from('audit_log').insert({
      org_id:      orgId,
      user_id:     user.id,
      user_email:  user.email ?? '',
      action:      'update',
      entity_type: 'deal',
      entity_id:   dealId,
      old_data:    { stage_id: oldStageId },
      new_data:    { stage_id, stage_name: stage.name },
      ip_address:  getIp(request),
    })

    return NextResponse.json({ deal: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]/stage]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
