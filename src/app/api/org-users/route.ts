import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/org-users - список пользователей организации с именами
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const { orgId } = auth

    // Получаем всех пользователей организации
    const { data: orgUsers, error } = await auth.supabase
      .from('org_users')
      .select('user_id, role, email')
      .eq('org_id', orgId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!orgUsers || orgUsers.length === 0) return NextResponse.json([])

    // Обогащаем full_name через service role (auth.users)
    const supabaseAdmin = createSupabaseServiceClient()
    const enriched = await Promise.all(
      orgUsers
        .filter(u => u.user_id) // только активные (не pending)
        .map(async (u) => {
          let full_name = ''
          try {
            const { data } = await supabaseAdmin.auth.admin.getUserById(u.user_id)
            const meta = data?.user?.user_metadata
            full_name =
              meta?.full_name ||
              meta?.name ||
              data?.user?.email?.split('@')[0] ||
              ''
          } catch {
            full_name = u.email?.split('@')[0] || ''
          }
          return {
            user_id: u.user_id,
            role: u.role,
            email: u.email || '',
            full_name,
          }
        })
    )

    return NextResponse.json(enriched)
  } catch (e: any) {
    console.error('Org users catch:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
