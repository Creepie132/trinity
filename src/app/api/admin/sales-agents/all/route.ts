import { NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/admin/sales-agents/all
// Все пользователи из Supabase Auth + флаг is_sales_agent из admin_users
export async function GET() {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()

  // 1. Все пользователи из Auth (service role умеет это)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // 2. Текущие sales agents из admin_users
  const { data: agentRows } = await supabase
    .from('admin_users')
    .select('user_id, is_sales_agent')

  const agentMap = new Map((agentRows ?? []).map(r => [r.user_id, r.is_sales_agent]))

  const users = (authData.users ?? []).map(u => ({
    user_id:        u.id,
    email:          u.email ?? '',
    full_name:      (u.user_metadata?.full_name ?? u.user_metadata?.name ?? '') as string,
    role:           (u.app_metadata?.role ?? 'user') as string,
    is_sales_agent: agentMap.get(u.id) === true,
    created_at:     u.created_at,
  }))

  // Сортировка: сначала продажники, потом по дате
  users.sort((a, b) => {
    if (a.is_sales_agent !== b.is_sales_agent) return a.is_sales_agent ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return NextResponse.json({ users })
}
