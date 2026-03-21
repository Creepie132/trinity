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

// ─── GET /api/deals/[id] ─────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    const { user, orgId } = auth

    const { id } = await params

    const supabase = createSupabaseServiceClient()

    const { data: deal, error } = await supabase
      .from('deals')
      .select(`
        *,
        stage:deal_stages(*),
        client:clients(id, first_name, last_name, phone, email, social_links, client_tags),
        tags:deal_tag_assignments(tag:deal_tags(id, name, color))
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Visibility check: own deal or can_view_all
    const [{ data: perms }, { data: orgUser }] = await Promise.all([
      supabase.from('staff_permissions').select('can_view_all_clients')
        .eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
      supabase.from('org_users').select('role')
        .eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
    ])
    const isAdmin   = orgUser?.role === 'admin' || orgUser?.role === 'owner'
    const canSeeAll = isAdmin || perms?.can_view_all_clients === true

    if (!canSeeAll && deal.assigned_to !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch communication log for this deal
    const { data: commLog } = await supabase
      .from('communication_log')
      .select('id, type, direction, summary, happened_at, user_id, duration_seconds, metadata')
      .eq('deal_id', id)
      .eq('org_id', orgId)
      .order('happened_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ deal, communication_log: commLog ?? [] })
  } catch (err) {
    console.error('[GET /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/deals/[id] ───────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    const { user, orgId } = auth

    const { id } = await params

    const supabase = createSupabaseServiceClient()

    // Fetch current deal
    const { data: existing } = await supabase
      .from('deals')
      .select('id, org_id, assigned_to, stage_id, title, amount')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Permission: own deal OR admin
    const { data: orgUser } = await supabase
      .from('org_users').select('role')
      .eq('org_id', orgId).eq('user_id', user.id).maybeSingle()

    const isAdmin = orgUser?.role === 'admin' || orgUser?.role === 'owner'
    if (!isAdmin && existing.assigned_to !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const {
      title,
      amount,
      currency,
      expected_close_date,
      next_action,
      next_action_date,
      source,
      notes,
      assigned_to,
      stage_id,
      rejection_reason,
      rejection_category,
      tag_ids,
    } = body

    // Business rule: if moving to a LOST stage, rejection_reason is required
    if (stage_id && stage_id !== existing.stage_id) {
      const { data: targetStage } = await supabase
        .from('deal_stages')
        .select('is_lost, is_won')
        .eq('id', stage_id)
        .eq('org_id', orgId)
        .maybeSingle()

      if (!targetStage)
        return NextResponse.json({ error: 'Invalid stage_id' }, { status: 400 })

      if (targetStage.is_lost) {
        if (!rejection_reason || String(rejection_reason).trim().length === 0) {
          return NextResponse.json(
            { error: 'rejection_reason is required when closing a deal as lost' },
            { status: 422 }
          )
        }
        if (
          rejection_category &&
          !['price', 'competitor', 'timing', 'no_need', 'other'].includes(rejection_category)
        ) {
          return NextResponse.json({ error: 'Invalid rejection_category' }, { status: 400 })
        }
      }
    }

    // Validate reassignment target is in same org
    if (assigned_to) {
      const { data: targetUser } = await supabase
        .from('org_users').select('user_id')
        .eq('org_id', orgId).eq('user_id', assigned_to).maybeSingle()
      if (!targetUser)
        return NextResponse.json({ error: 'Invalid assigned_to: user not in org' }, { status: 400 })
    }

    // Build update payload — only include defined fields
    const patch: Record<string, unknown> = {}
    if (title !== undefined)               patch.title               = String(title).trim()
    if (amount !== undefined)              patch.amount              = Number(amount)
    if (currency !== undefined)            patch.currency            = currency
    if (expected_close_date !== undefined) patch.expected_close_date = expected_close_date
    if (next_action !== undefined)         patch.next_action         = next_action
    if (next_action_date !== undefined)    patch.next_action_date    = next_action_date
    if (source !== undefined)              patch.source              = source
    if (notes !== undefined)               patch.notes               = notes
    if (assigned_to !== undefined)         patch.assigned_to         = assigned_to
    if (stage_id !== undefined)            patch.stage_id            = stage_id
    if (rejection_reason !== undefined)    patch.rejection_reason    = rejection_reason
    if (rejection_category !== undefined)  patch.rejection_category  = rejection_category
    patch.last_contact_at = new Date().toISOString()

    if (Object.keys(patch).length === 1)
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    const { data: updated, error } = await supabase
      .from('deals')
      .update(patch)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error || !updated)
      return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })

    // Replace tags if provided
    if (Array.isArray(tag_ids)) {
      await supabase.from('deal_tag_assignments').delete().eq('deal_id', id)
      if (tag_ids.length > 0) {
        await supabase.from('deal_tag_assignments')
          .insert(tag_ids.map((tag_id: string) => ({ deal_id: id, tag_id })))
      }
    }

    // Audit
    await supabase.from('audit_log').insert({
      org_id:      orgId,
      user_id:     user.id,
      user_email:  user.email ?? '',
      action:      'update',
      entity_type: 'deal',
      entity_id:   id,
      old_data:    { title: existing.title, amount: existing.amount, stage_id: existing.stage_id },
      new_data:    patch,
      ip_address:  getIp(request),
    })

    return NextResponse.json({ deal: updated })
  } catch (err) {
    console.error('[PATCH /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/deals/[id] ──────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    const { user, orgId } = auth

    const { id } = await params

    const supabase = createSupabaseServiceClient()

    const { data: orgUser } = await supabase
      .from('org_users').select('role')
      .eq('org_id', orgId).eq('user_id', user.id).maybeSingle()

    if (orgUser?.role !== 'admin' && orgUser?.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

    const { data: perms } = await supabase
      .from('staff_permissions').select('can_delete_deals')
      .eq('org_id', orgId).eq('user_id', user.id).maybeSingle()

    if (!perms?.can_delete_deals && orgUser?.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden — delete not permitted' }, { status: 403 })

    const { data: existing } = await supabase
      .from('deals').select('title, amount').eq('id', id).eq('org_id', orgId).maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase
      .from('deals').delete().eq('id', id).eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      org_id:      orgId,
      user_id:     user.id,
      user_email:  user.email ?? '',
      action:      'delete',
      entity_type: 'deal',
      entity_id:   id,
      old_data:    existing,
      ip_address:  getIp(request),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/deals/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
