import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// POST /api/worker/heartbeat
// Called every 30s by active sales agents to update their online presence
export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createSupabaseServiceClient()
    const now = new Date().toISOString()

    // Update last_seen_at in org_users (all rows for this user across all orgs)
    const { error } = await service
      .from('org_users')
      .update({ last_seen_at: now })
      .eq('user_id', user.id)

    if (error) {
      console.error('[heartbeat] update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[heartbeat] unexpected error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
