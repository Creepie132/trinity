import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── helpers ────────────────────────────────────────────────────────────────

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

async function writeAudit(params: {
  supabase: ReturnType<typeof createSupabaseServiceClient>
  orgId: string
  userId: string
  userEmail: string
  action: string
  entityType: string
  entityId: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  ip: string
}) {
  const { supabase, orgId, userId, userEmail, action, entityType, entityId, oldData, newData, ip } = params
  await supabase.from('audit_log').insert({
    org_id:      orgId,
    user_id:     userId,
    user_email:  userEmail,
    action,
    entity_type: entityType,
    entity_id:   entityId,
    old_data:    oldData ?? null,
    new_data:    newData ?? null,
    ip_address:  ip,
  })
}

// ─── GET /api/deals ──────────────────────────────────────────────────────────
// Returns deals visible to the current user (own or all based on permissions)
export async function GET(request: NextRequest) {
  try {
    const { user, orgId } = await getAuthContext(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const stageId    = searchParams.get('stage_id')
    const assignedTo = searchParams.get('assigned_to')
    const tag        = searchParams.get('tag')

    const [{ data: perms }, { data: orgUser }] = await Promise.all([
      supabase
        .from('staff_permissions')
        .select('can_view_all_clients')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('org_users')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const isAdmin   = orgUser?.role === 'admin' || orgUser?.role === 'owner'
    const canSeeAll = isAdmin || perms?.can_view_all_clients === true

    let query = supabase
      .from('deals')
      .select(`
        *,
        stage:deal_stages(*),
        client:clients(id, first_name, last_name, phone, social_links),
        tags:deal_tag_assignments(tag:deal_tags(id, name, color))
      `)
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })

    if (!canSeeAll)                  query = query.eq('assigned_to', user.id)
    if (stageId)                     query = query.eq('stage_id', stageId)
    if (assignedTo && canSeeAll)     query = query.eq('assigned_to', assignedTo)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = tag
      ? data?.filter(d =>
          d.tags?.some((t: { tag: { name: string } }) =>
            t.tag?.name?.toLowerCase() === tag.toLowerCase()
          )
        )
      : data

    return NextResponse.json({ deals: result ?? [] })
  } catch (err) {
    console.error('[GET /api/deals]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/deals ─────────────────────────────────────────────────────────
// Create a new deal
export async function POST(request: NextRequest) {
  try {
    const { user, orgId } = await getAuthContext(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      title, client_id, stage_id,
      amount = 0, currency = 'ILS',
      expected_close_date, next_action, next_action_date,
      source, notes, assigned_to, tag_ids,
    } = body

    if (!title?.trim())
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (!stage_id)
      return NextResponse.json({ error: 'stage_id is required' }, { status: 400 })
    if (Number(amount) < 0)
      return NextResponse.json({ error: 'amount must be >= 0' }, { status: 400 })

    const supabase = createSupabaseServiceClient()

    // Validate stage belongs to org
    const { data: stage } = await supabase
      .from('deal_stages').select('id').eq('id', stage_id).eq('org_id', orgId).maybeSingle()
    if (!stage)
      return NextResponse.json({ error: 'Invalid stage_id' }, { status: 400 })

    // Validate client belongs to org (if provided)
    if (client_id) {
      const { data: client } = await supabase
        .from('clients').select('id').eq('id', client_id).eq('org_id', orgId).maybeSingle()
      if (!client)
        return NextResponse.json({ error: 'Invalid client_id' }, { status: 400 })
    }

    // Check deal management permission
    const [{ data: perms }, { data: orgUser }] = await Promise.all([
      supabase.from('staff_permissions').select('can_manage_deals')
        .eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
      supabase.from('org_users').select('role')
        .eq('org_id', orgId).eq('user_id', user.id).maybeSingle(),
    ])
    const isAdmin = orgUser?.role === 'admin' || orgUser?.role === 'owner'
    if (!isAdmin && perms?.can_manage_deals === false)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        org_id:              orgId,
        title:               title.trim(),
        client_id:           client_id ?? null,
        stage_id,
        amount:              Number(amount),
        currency,
        expected_close_date: expected_close_date ?? null,
        next_action:         next_action ?? null,
        next_action_date:    next_action_date ?? null,
        source:              source ?? null,
        notes:               notes ?? null,
        assigned_to:         assigned_to ?? user.id,
        last_contact_at:     new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !deal)
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })

    // Assign tags
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      await supabase.from('deal_tag_assignments')
        .insert(tag_ids.map((tag_id: string) => ({ deal_id: deal.id, tag_id })))
    }

    // Audit
    await writeAudit({
      supabase, orgId, userId: user.id,
      userEmail: user.email ?? '',
      action: 'create', entityType: 'deal', entityId: deal.id,
      newData: { title: deal.title, amount: deal.amount, stage_id: deal.stage_id },
      ip: getIp(request),
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/deals]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
