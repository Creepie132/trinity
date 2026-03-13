import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: adminRow } = await admin
      .from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name, features, subscription_status, last_seen_at')
      .not('name', 'ilike', '%test%')
      .order('name')

    if (!orgs?.length) return NextResponse.json({ orgs: [] })

    // Per-org usage stats in parallel
    const results = await Promise.all(orgs.map(async (org) => {
      const orgId = org.id

      const [
        { count: clientsTotal },
        { count: visits30d },
        { count: payments30d },
        { count: productsTotal },
        { count: tasksTotal },
        { count: bookings30d },
      ] = await Promise.all([
        admin.from('clients').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        admin.from('visits').select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        admin.from('payments').select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        admin.from('products').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        admin.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
        admin.from('bookings').select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ])

      const modules = org.features?.modules || {}
      const displayName = org.features?.business_info?.display_name || org.name

      return {
        id: orgId,
        name: displayName,
        status: org.subscription_status,
        last_seen_at: org.last_seen_at,
        modules,
        usage: {
          clients: clientsTotal || 0,
          visits30d: visits30d || 0,
          payments30d: payments30d || 0,
          products: productsTotal || 0,
          tasks: tasksTotal || 0,
          bookings30d: bookings30d || 0,
        },
      }
    }))

    return NextResponse.json({ orgs: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
