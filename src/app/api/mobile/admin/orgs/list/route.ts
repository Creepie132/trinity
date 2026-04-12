/**
 * GET /api/mobile/admin/orgs/list
 * Полный список организаций для AdminOrganizationsScreen.
 * Auth: Bearer токен. Только super_admin.
 *
 * Query params:
 *   search?: string  — фильтр по name/owner_email
 *   limit?:  number  — (default 200)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return null
  const jwt = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await anonClient.auth.getUser(jwt)
  if (error || !data.user) return null
  const isAdmin = data.user.app_metadata?.is_admin === true
  const orgRole = data.user.app_metadata?.org_role as string | null
  if (!isAdmin && orgRole !== 'super_admin') return null
  return data.user
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 })
    }

    const url    = new URL(request.url)
    const search = url.searchParams.get('search')?.trim() ?? ''
    const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 500)

    const service = createSupabaseServiceClient()

    let query = service
      .from('organizations')
      .select('id, name, owner_email, subscription_status, created_at, features')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,owner_email.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('[admin/orgs/list]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const orgs = (data ?? []).map((o: any) => ({
      id:          o.id,
      name:        o.name,
      owner_email: o.owner_email ?? '',
      status:      o.subscription_status ?? '',
      created_at:  o.created_at,
    }))

    return NextResponse.json({ orgs, total: orgs.length })
  } catch (err: any) {
    console.error('[admin/orgs/list] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
