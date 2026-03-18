import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function requireAdmin(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: adminRow } = await supabaseAdmin
    .from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
  return adminRow ? user : null
}

// GET /api/admin/organizations/[orgId]/integrations?provider=green_invoice
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params
    const provider = request.nextUrl.searchParams.get('provider') ?? 'green_invoice'

    const { data, error } = await supabaseAdmin
      .from('org_integrations')
      .select('id, provider, config, is_active, created_at, updated_at')
      .eq('org_id', orgId)
      .eq('provider', provider)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ integration: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/admin/organizations/[orgId]/integrations
// Body: { provider, config: { api_key, webhook_secret }, is_active? }
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params
    const body = await request.json()
    const { provider = 'green_invoice', config, is_active = true } = body

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'config is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('org_integrations')
      .upsert(
        { org_id: orgId, provider, config, is_active },
        { onConflict: 'org_id,provider' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ integration: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[orgId]/integrations?provider=green_invoice
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await requireAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orgId } = await context.params
    const provider = request.nextUrl.searchParams.get('provider') ?? 'green_invoice'

    const { error } = await supabaseAdmin
      .from('org_integrations')
      .delete()
      .eq('org_id', orgId)
      .eq('provider', provider)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
