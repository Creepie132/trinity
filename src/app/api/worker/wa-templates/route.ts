import { NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/wa-templates
// Returns active message_templates + all org-family clients for sending

async function getRelatedOrgIds(supabase: ReturnType<typeof createSupabaseServiceClient>, orgId: string): Promise<string[]> {
  const { data: parentRows } = await supabase
    .from('branches')
    .select('parent_org_id')
    .eq('child_org_id', orgId)

  const rootOrgId: string = parentRows?.[0]?.parent_org_id ?? orgId

  const { data: childRows } = await supabase
    .from('branches')
    .select('child_org_id')
    .eq('parent_org_id', rootOrgId)
    .eq('is_active', true)

  const ids = new Set<string>([orgId, rootOrgId])
  childRows?.forEach((r) => ids.add(r.child_org_id))
  return Array.from(ids)
}

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    // Получаем mainOrgId через org_users
    const { data: orgUserRow } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const mainOrgId = orgUserRow?.org_id
    if (!mainOrgId) {
      return NextResponse.json({ error: 'Org not found' }, { status: 403 })
    }

    const { getActiveOrgId } = await import('@/lib/get-active-org')
    const orgId = await getActiveOrgId(user.id, mainOrgId)

    const relatedOrgIds = await getRelatedOrgIds(supabase, orgId)

    const [tplRes, clientsRes] = await Promise.all([
      supabase
        .from('message_templates')
        .select('id, name, content, category, variables')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('category'),

      supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .in('org_id', relatedOrgIds)
        .not('phone', 'is', null)
        .order('first_name')
        .limit(200),
    ])

    return NextResponse.json({
      templates: tplRes.data  ?? [],
      clients:   clientsRes.data ?? [],
    })
  } catch (err) {
    console.error('[GET /api/worker/wa-templates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
