import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// Allowed communication types (matches CHECK constraint in DB)
const ALLOWED_TYPES = [
  'call', 'whatsapp', 'email', 'sms',
  'note', 'visit', 'sale', 'stage_change', 'other',
] as const
type CommType = typeof ALLOWED_TYPES[number]

function isAllowedType(v: unknown): v is CommType {
  return ALLOWED_TYPES.includes(v as CommType)
}

// ─── GET /api/communication-log ──────────────────────────────────────────────
// Query params:
//   deal_id      — filter by deal (required if no client_id)
//   client_id    — filter by client (required if no deal_id)
//   limit        — max entries (default 50, max 100)
//   cursor       — ISO timestamp; returns entries BEFORE this time (pagination)
export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error
  const { user, orgId, isAdmin } = auth

  const { searchParams } = new URL(request.url)
  const deal_id    = searchParams.get('deal_id')
  const client_id  = searchParams.get('client_id')
  const cursor     = searchParams.get('cursor')
  const limitParam = searchParams.get('limit')
  const limit      = Math.min(parseInt(limitParam ?? '50', 10) || 50, 100)

  if (!deal_id && !client_id) {
    return NextResponse.json(
      { error: 'deal_id or client_id is required' },
      { status: 400 }
    )
  }

  const supabase = createSupabaseServiceClient()

  // ── Permission check ────────────────────────────────────────────────────────
  // Workers can only view logs tied to their own deals (unless canSeeAll)
  const canSeeAll = isAdmin || (await (async () => {
    const { data } = await supabase
      .from('staff_permissions')
      .select('can_view_all_clients')
      .eq('org_id', orgId).eq('user_id', user.id).maybeSingle()
    return !!data?.can_view_all_clients
  })())

  // If filtering by deal_id, verify deal belongs to org (and worker can access it)
  if (deal_id) {
    const { data: deal } = await supabase
      .from('deals')
      .select('id, assigned_to, org_id')
      .eq('id', deal_id).eq('org_id', orgId).maybeSingle()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    if (!canSeeAll && deal.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // If filtering by client_id, verify client belongs to org
  if (client_id && !deal_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id).eq('org_id', orgId).maybeSingle()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    // Workers without canSeeAll can only view clients tied to their deals
    if (!canSeeAll) {
      const { count } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client_id).eq('org_id', orgId).eq('assigned_to', user.id)
      if (!count) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // ── Build query ─────────────────────────────────────────────────────────────
  let query = supabase
    .from('communication_log')
    .select('*')
    .eq('org_id', orgId)
    .order('happened_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect next page

  if (deal_id)   query = query.eq('deal_id', deal_id)
  if (client_id) query = query.eq('client_id', client_id)
  if (cursor)    query = query.lt('happened_at', cursor)

  const { data: entries, error } = await query
  if (error) {
    console.error('[communication-log GET]', error)
    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 })
  }

  const hasMore    = entries.length > limit
  const pageItems  = hasMore ? entries.slice(0, limit) : entries
  const next_cursor = hasMore ? pageItems[pageItems.length - 1].happened_at : null

  return NextResponse.json({ entries: pageItems, next_cursor })
}

// ─── POST /api/communication-log ─────────────────────────────────────────────
// Body: { type, summary?, deal_id?, client_id?, happened_at?,
//         direction?, duration_seconds?, metadata? }
// Rules:
//   - type is required and must be an allowed value
//   - At least one of deal_id or client_id must be provided
//   - Workers can only log on their own deals (unless canSeeAll)
//   - Entries are immutable after creation (no PATCH/DELETE endpoints)
export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error
  const { user, orgId, isAdmin } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    type, summary, deal_id, client_id,
    happened_at, direction, duration_seconds, metadata,
  } = body as Record<string, unknown>

  // ── Validate required fields ─────────────────────────────────────────────
  if (!isAllowedType(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` },
      { status: 422 }
    )
  }
  if (!deal_id && !client_id) {
    return NextResponse.json(
      { error: 'deal_id or client_id is required' },
      { status: 422 }
    )
  }

  const supabase = createSupabaseServiceClient()

  // ── Permission check ──────────────────────────────────────────────────────
  const canSeeAll = isAdmin || (await (async () => {
    const { data } = await supabase
      .from('staff_permissions')
      .select('can_view_all_clients')
      .eq('org_id', orgId).eq('user_id', user.id).maybeSingle()
    return !!data?.can_view_all_clients
  })())

  // Verify deal ownership
  if (deal_id) {
    if (typeof deal_id !== 'string') {
      return NextResponse.json({ error: 'Invalid deal_id' }, { status: 422 })
    }
    const { data: deal } = await supabase
      .from('deals')
      .select('id, assigned_to, org_id')
      .eq('id', deal_id).eq('org_id', orgId).maybeSingle()

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    if (!canSeeAll && deal.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Verify client ownership
  if (client_id && !deal_id) {
    if (typeof client_id !== 'string') {
      return NextResponse.json({ error: 'Invalid client_id' }, { status: 422 })
    }
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id).eq('org_id', orgId).maybeSingle()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
  }

  // ── Insert ───────────────────────────────────────────────────────────────
  const insertRow = {
    org_id:           orgId,
    user_id:          user.id,
    type:             type as CommType,
    summary:          typeof summary === 'string' ? summary.trim() || null : null,
    deal_id:          typeof deal_id === 'string'   ? deal_id   : null,
    client_id:        typeof client_id === 'string' ? client_id : null,
    happened_at:      typeof happened_at === 'string' ? happened_at : new Date().toISOString(),
    direction:        typeof direction === 'string' ? direction : null,
    duration_seconds: typeof duration_seconds === 'number' ? Math.floor(duration_seconds) : null,
    metadata:         metadata && typeof metadata === 'object' ? metadata : {},
  }

  const { data: entry, error } = await supabase
    .from('communication_log')
    .insert(insertRow)
    .select()
    .single()

  if (error) {
    console.error('[communication-log POST]', error)
    return NextResponse.json({ error: 'Failed to create log entry' }, { status: 500 })
  }

  return NextResponse.json({ entry }, { status: 201 })
}
