import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkAdmin(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await admin.from('admin_users').select('email').eq('user_id', user.id).maybeSingle()
  return data ? { user, adminEmail: data.email || user.email } : null
}

// GET — загрузить данные поддержки для всех орг
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id')

    // Audit log
    const auditQuery = admin
      .from('audit_log')
      .select('id, org_id, user_email, action, entity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(orgId ? 50 : 100)
    if (orgId) auditQuery.eq('org_id', orgId)

    // Notes
    const notesQuery = admin
      .from('admin_notes')
      .select('id, org_id, admin_email, note, created_at')
      .order('created_at', { ascending: false })
    if (orgId) notesQuery.eq('org_id', orgId)

    // Orgs list
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name, features, subscription_status, last_seen_at, owner_email')
      .not('name', 'ilike', '%test%')
      .order('name')

    const [{ data: auditLog }, { data: notes }] = await Promise.all([
      auditQuery, notesQuery
    ])

    // Vercel errors from last 24h
    let recentErrors: any[] = []
    try {
      // We'll pass empty array - Vercel errors fetched client-side via separate endpoint
      recentErrors = []
    } catch {}

    return NextResponse.json({
      orgs: (orgs || []).map(o => ({
        id: o.id,
        name: (o.features as any)?.business_info?.display_name || o.name,
        status: o.subscription_status,
        last_seen_at: o.last_seen_at,
        owner_email: o.owner_email,
      })),
      auditLog: auditLog || [],
      notes: notes || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — добавить заметку
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { org_id, note } = await request.json()
    if (!org_id || !note?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('admin_notes')
      .insert({ org_id, admin_email: auth.adminEmail, note: note.trim() })
      .select().single()

    if (error) throw error
    return NextResponse.json({ note: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — удалить заметку
export async function DELETE(request: NextRequest) {
  try {
    const auth = await checkAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await request.json()
    await admin.from('admin_notes').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
