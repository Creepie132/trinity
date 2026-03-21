import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/admin/sales-agents — список всех продажников Trinity
export async function GET() {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, full_name, is_sales_agent, created_at')
    .eq('is_sales_agent', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data ?? [] })
}

// POST /api/admin/sales-agents — назначить или снять флаг sales_agent
// Body: { user_id, email, full_name, is_sales_agent: boolean }
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { user_id, email, full_name, is_sales_agent } = body

  if (!user_id || !email) {
    return NextResponse.json({ error: 'user_id and email required' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Upsert в admin_users с флагом is_sales_agent
  const { error } = await supabase
    .from('admin_users')
    .upsert(
      { user_id, email, full_name: full_name ?? email.split('@')[0], is_sales_agent: !!is_sales_agent },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Аудит
  void supabase.from('audit_log').insert({
    org_id: null,
    user_id: auth.user.id,
    action: is_sales_agent ? 'sales_agent_assigned' : 'sales_agent_removed',
    entity_type: 'admin_users',
    entity_id: user_id,
    new_data: { email, is_sales_agent },
  })

  return NextResponse.json({ success: true, user_id, is_sales_agent: !!is_sales_agent })
}
