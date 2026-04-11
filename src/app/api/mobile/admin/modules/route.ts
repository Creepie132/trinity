import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { MODULES, initModulesState, applyLinkedKeys } from '@/lib/modules-config'

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

/**
 * GET /api/mobile/admin/modules?org_id=<uuid>
 * Возвращает список модулей организации с текущим состоянием.
 * Только для super_admin.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = request.nextUrl.searchParams.get('org_id')
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

    const service = createSupabaseServiceClient()
    const { data: org, error } = await service
      .from('organizations')
      .select('id, name, features')
      .eq('id', orgId)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const modulesState = initModulesState(org.features?.modules || {})

    const modules = MODULES
      .filter(m => !m.hiddenInUI)
      .map(m => ({
        key:         m.key,
        name_ru:     m.name_ru,
        name_he:     m.name_he,
        enabled:     modulesState[m.key] ?? false,
        linked_keys: m.linkedKeys ?? [],
      }))

    return NextResponse.json({ org_id: orgId, org_name: org.name, modules })
  } catch (err) {
    console.error('[mobile/admin/modules] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PUT /api/mobile/admin/modules
 * Обновляет состояние модулей организации.
 * Только для super_admin.
 * Body: { org_id: string, modules: Record<string, boolean> }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { org_id, modules } = body as {
      org_id: string
      modules: Record<string, boolean>
    }

    if (!org_id || !modules || typeof modules !== 'object') {
      return NextResponse.json({ error: 'org_id and modules required' }, { status: 400 })
    }

    // Применяем linkedKeys: clients ↔ visits всегда вместе
    let resolved = { ...modules }
    for (const [key, value] of Object.entries(modules)) {
      resolved = applyLinkedKeys(resolved, key, value)
    }

    const service = createSupabaseServiceClient()

    const { data: org } = await service
      .from('organizations')
      .select('features')
      .eq('id', org_id)
      .single()

    const mergedModules = {
      ...(org?.features?.modules || {}),
      ...resolved,
    }

    const { error } = await service
      .from('organizations')
      .update({
        features: {
          ...(org?.features || {}),
          modules: mergedModules,
        },
      })
      .eq('id', org_id)

    if (error) {
      console.error('[mobile/admin/modules] PUT error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, modules: mergedModules })
  } catch (err) {
    console.error('[mobile/admin/modules] PUT error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
