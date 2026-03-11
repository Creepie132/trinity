import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthContext } from '@/lib/auth-helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_PRICE = 249
const PER_USER = 99

function calcBilling(count: number) {
  return BASE_PRICE + Math.max(0, count - 1) * PER_USER
}

// ============================================================
// GET /api/org/team — list all org_users for current org
// ============================================================
export async function GET() {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId } = auth

  const { data: orgUsers, error } = await supabaseAdmin
    .from('org_users')
    .select('user_id, email, role, joined_at')
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with full_name from auth.users for non-null user_ids
  const enriched = await Promise.all(
    (orgUsers || []).map(async (u) => {
      let full_name: string | null = null
      if (u.user_id) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(u.user_id)
        full_name =
          data.user?.user_metadata?.full_name ||
          data.user?.user_metadata?.name ||
          null
      }
      return {
        ...u,
        full_name,
        status: u.user_id ? 'active' : 'pending',
      }
    })
  )

  const billing = calcBilling(enriched.length)

  return NextResponse.json({ users: enriched, count: enriched.length, billing })
}

// ============================================================
// PATCH /api/org/team — change a member's role
// ============================================================
export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, user } = auth

  // Verify requester is owner
  const { data: requesterRow } = await supabaseAdmin
    .from('org_users')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (requesterRow?.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
  }

  const { email, role } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role required' }, { status: 400 })
  }

  const valid = ['owner', 'moderator', 'user']
  if (!valid.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('org_users')
    .update({ role })
    .eq('org_id', orgId)
    .eq('email', email.toLowerCase())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ============================================================
// POST /api/org/team — invite a new member + update billing
// ============================================================
export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, user } = auth

  // Verify requester is owner
  const { data: requesterRow } = await supabaseAdmin
    .from('org_users')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (requesterRow?.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can invite users' }, { status: 403 })
  }

  const { email, role } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const valid = ['owner', 'moderator', 'user']
  if (!valid.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check not already in org
  const { data: existing } = await supabaseAdmin
    .from('org_users')
    .select('email')
    .eq('org_id', orgId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'המשתמש כבר נמצא בארגון' }, { status: 400 })
  }

  // Get org name for email
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Insert org_users record (user_id null = pending until first login)
  const { error: insertError } = await supabaseAdmin
    .from('org_users')
    .insert({ org_id: orgId, email: normalizedEmail, role, user_id: null })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update billing_amount
  const { count } = await supabaseAdmin
    .from('org_users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  await supabaseAdmin
    .from('organizations')
    .update({ billing_amount: calcBilling(count || 1) })
    .eq('id', orgId)

  // Send welcome email (non-blocking)
  const { sendWelcomeEmail } = await import('@/lib/emails')
  sendWelcomeEmail(normalizedEmail, org?.name || 'Trinity CRM').catch(console.error)

  return NextResponse.json({ success: true })
}

// ============================================================
// DELETE /api/org/team — remove a member + update billing
// ============================================================
export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return auth.error

  const { orgId, user } = auth

  // Verify requester is owner
  const { data: requesterRow } = await supabaseAdmin
    .from('org_users')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (requesterRow?.role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can remove users' }, { status: 403 })
  }

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Prevent self-removal
  if (user.email?.toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: 'לא ניתן להסיר את עצמך' }, { status: 400 })
  }

  // Prevent removing last owner
  const { data: target } = await supabaseAdmin
    .from('org_users')
    .select('role')
    .eq('org_id', orgId)
    .eq('email', normalizedEmail)
    .single()

  if (target?.role === 'owner') {
    const { count: ownerCount } = await supabaseAdmin
      .from('org_users')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'owner')

    if ((ownerCount || 0) <= 1) {
      return NextResponse.json({ error: 'לא ניתן להסיר את הבעלים האחרון' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('org_users')
    .delete()
    .eq('org_id', orgId)
    .eq('email', normalizedEmail)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update billing_amount
  const { count } = await supabaseAdmin
    .from('org_users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  await supabaseAdmin
    .from('organizations')
    .update({ billing_amount: calcBilling(count || 1) })
    .eq('id', orgId)

  return NextResponse.json({ success: true })
}
