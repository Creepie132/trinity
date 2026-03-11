import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/work-shifts
// Returns { myShift, activeShifts } for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const { orgId, role } = { orgId: orgUser.org_id, role: orgUser.role }

  // My active shift
  const { data: myShift } = await supabase
    .from('work_shifts')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Active shifts for the whole org (owner sees all)
  let activeShifts: any[] = []
  if (role === 'owner') {
    const { data } = await supabaseAdmin
      .from('work_shifts')
      .select('*')
      .eq('org_id', orgId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })

    // Enrich with user display names
    if (data && data.length > 0) {
      activeShifts = await Promise.all(
        data.map(async (shift) => {
          const { data: orgMember } = await supabaseAdmin
            .from('org_users')
            .select('email')
            .eq('org_id', orgId)
            .eq('user_id', shift.user_id)
            .maybeSingle()
          let name = orgMember?.email || shift.user_id
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(shift.user_id)
            name = authUser?.user?.user_metadata?.full_name || authUser?.user?.user_metadata?.name || name
          } catch {}
          return { ...shift, display_name: name }
        })
      )
    }
  }

  return NextResponse.json({ myShift: myShift || null, activeShifts })
}

// POST /api/work-shifts — start shift
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) return NextResponse.json({ error: 'No org' }, { status: 403 })

  // Check no active shift already exists
  const { data: existing } = await supabase
    .from('work_shifts')
    .select('id')
    .eq('org_id', orgUser.org_id)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Shift already active', shiftId: existing.id }, { status: 409 })
  }

  const { data: shift, error } = await supabase
    .from('work_shifts')
    .insert({ org_id: orgUser.org_id, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(shift)
}

// PATCH /api/work-shifts — end shift
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: shift, error } = await supabase
    .from('work_shifts')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('ended_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!shift) return NextResponse.json({ error: 'Shift not found or already ended' }, { status: 404 })

  return NextResponse.json(shift)
}
