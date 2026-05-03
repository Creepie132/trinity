import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

const supabase = createSupabaseServiceClient()

/**
 * GET /api/permissions/sets — список пресетов разрешений org
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  if (auth.orgRole !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const { data, error } = await supabase
    .from('permission_sets')
    .select('id, name, description, permissions, is_default, created_at')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/permissions/sets — создать пресет
 * Body: { name, description?, permissions: Record<string,boolean>, is_default? }
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  if (auth.orgRole !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const body = await req.json()
  const { name, description, permissions, is_default } = body as {
    name: string
    description?: string
    permissions: Record<string, boolean>
    is_default?: boolean
  }

  if (!name?.trim() || typeof permissions !== 'object') {
    return NextResponse.json({ error: 'name and permissions required' }, { status: 400 })
  }

  // Если is_default — снимаем флаг со всех остальных пресетов org
  if (is_default) {
    await supabase
      .from('permission_sets')
      .update({ is_default: false })
      .eq('org_id', auth.orgId)
  }

  const { data, error } = await supabase
    .from('permission_sets')
    .insert({ org_id: auth.orgId, name: name.trim(), description, permissions, is_default: !!is_default })
    .select('id, name, description, permissions, is_default')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/permissions/sets?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  if (auth.orgRole !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('permission_sets')
    .delete()
    .eq('id', id)
    .eq('org_id', auth.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
