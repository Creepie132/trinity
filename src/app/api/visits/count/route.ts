import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { withErrorCapture } from '@/lib/self-healing'

/**
 * GET /api/visits/count
 * Returns total visit count + active (scheduled/in_progress) count for the org.
 * Used by demo limit checks in FABMenu to avoid showing creation dialogs
 * when the org has already reached its demo limits.
 */
async function handleGET(_request: NextRequest) {
  const auth = await getAuthContext()
  if ('error' in auth) return NextResponse.json({ count: 0, active: 0 })

  const { orgId } = auth
  const service = createSupabaseServiceClient()

  // BUG_INJECT: TypeError — intentional null dereference for self-healing test
  const buggyConfig: any = null
  const _unused = buggyConfig.nonExistentProperty

  const [totalResult, activeResult] = await Promise.all([
    service
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId),
    service
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['scheduled', 'in_progress']),
  ])

  return NextResponse.json({
    count:  totalResult.count  ?? 0,
    active: activeResult.count ?? 0,
  })
}

export const GET = withErrorCapture(handleGET, '/api/visits/count')
