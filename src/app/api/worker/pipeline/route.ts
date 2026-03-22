import { NextRequest, NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/pipeline
// Returns all stages + their deals in one structured response.
// Shape: { stages: [ { ...stage, deals: [ { ...deal, client, tags } ] } ] }
// Query params:
//   ?tag=VIP            — filter deals by tag name
//   ?assigned_to=uuid   — filter by assignee (requires can_view_all_clients)
//   ?include_closed=1   — include won/lost stages (default: excluded)

export async function GET(request: NextRequest) {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const filterTag      = searchParams.get('tag')
    const filterAssigned = searchParams.get('assigned_to')
    const includeClosed  = searchParams.get('include_closed') === '1'

    // Продажник работает в org Amber Solutions
    const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

    // Продажник не admin и не может видеть все сделки — только свои
    const canSeeAll = false

    // ── 1. Load all stages ────────────────────────────────────────────────────
    const { data: stages, error: stagesErr } = await supabase
      .from('deal_stages')
      .select('id, name, name_he, color, position, is_won, is_lost, is_booking_stage')
      .eq('org_id', orgId)
      .order('position', { ascending: true })

    if (stagesErr) return NextResponse.json({ error: stagesErr.message }, { status: 500 })

    const visibleStages = includeClosed
      ? (stages ?? [])
      : (stages ?? []).filter(s => !s.is_won && !s.is_lost)

    if (visibleStages.length === 0) {
      return NextResponse.json({ stages: [] })
    }

    // ── 2. Load all deals in one shot ─────────────────────────────────────────
    let dealsQuery = supabase
      .from('deals')
      .select(`
        id, title, amount, currency, stage_id,
        assigned_to, expected_close_date,
        last_contact_at, next_action, next_action_date,
        source, created_at, updated_at,
        client:clients(id, first_name, last_name, phone),
        tags:deal_tag_assignments(tag:deal_tags(id, name, color))
      `)
      .eq('org_id', orgId)
      .in('stage_id', visibleStages.map(s => s.id))
      .order('updated_at', { ascending: false })

    if (!canSeeAll)                   dealsQuery = dealsQuery.eq('assigned_to', user.id)
    if (filterAssigned && canSeeAll)  dealsQuery = dealsQuery.eq('assigned_to', filterAssigned)

    const { data: allDeals, error: dealsErr } = await dealsQuery
    if (dealsErr) return NextResponse.json({ error: dealsErr.message }, { status: 500 })

    // ── 3. Tag filter (in-memory — nested join) ───────────────────────────────
    const filteredDeals = filterTag
      ? (allDeals ?? []).filter(d =>
          d.tags?.some(
            (t: { tag: { id: any; name: any; color: any }[] }) =>
              (Array.isArray(t.tag) ? t.tag[0]?.name : (t.tag as any)?.name)
                ?.toLowerCase() === filterTag.toLowerCase()
          )
        )
      : (allDeals ?? [])

    // ── 4. Group by stage_id ──────────────────────────────────────────────────
    type DealRow = (typeof filteredDeals)[number]
    const byStage = filteredDeals.reduce<Record<string, DealRow[]>>((acc, deal) => {
      if (!acc[deal.stage_id]) acc[deal.stage_id] = []
      acc[deal.stage_id].push(deal)
      return acc
    }, {})

    // ── 5. Assemble response ──────────────────────────────────────────────────
    const pipeline = visibleStages.map(stage => ({
      ...stage,
      deals:        byStage[stage.id] ?? [],
      deals_count:  (byStage[stage.id] ?? []).length,
      total_amount: (byStage[stage.id] ?? []).reduce(
        (sum, d) => sum + Number(d.amount ?? 0), 0
      ),
    }))

    return NextResponse.json({ stages: pipeline })
  } catch (err) {
    console.error('[GET /api/worker/pipeline]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
