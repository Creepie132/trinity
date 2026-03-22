import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST() {
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

  // Verify the caller is actually a sales agent
  const { data: agentRow } = await service
    .from('admin_users')
    .select('user_id, is_sales_agent')
    .eq('user_id', user.id)
    .eq('is_sales_agent', true)
    .maybeSingle()

  if (!agentRow) {
    return NextResponse.json({ error: 'Not a sales agent' }, { status: 403 })
  }

  const { error } = await service
    .from('admin_users')
    .update({ sales_onboarding_completed: true })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
