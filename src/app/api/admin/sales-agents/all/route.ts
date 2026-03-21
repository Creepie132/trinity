import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/admin/sales-agents/all
// Все пользователи из admin_users (для списка в UI назначения продажников)
export async function GET() {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, full_name, role, is_sales_agent, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    users: (data ?? []).map(u => ({
      user_id:       u.user_id,
      email:         u.email,
      role:          u.role ?? 'user',
      avatar_url:    null,
      is_sales_agent: u.is_sales_agent,
    }))
  })
}
