/**
 * demo-limits.ts — server-side enforcement of demo org creation limits.
 *
 * ★ SECURITY RULE: All limits are checked on the SERVER, against the DB.
 *   Client-side banners are UX only — this is the authoritative gate.
 *
 * Limits (mirrors DEMO_LIMITS in DemoSectionBanner):
 *   clients       : 10
 *   visits_total  : 15
 *   visits_active : 3  (simultaneous: status IN ('scheduled','in_progress'))
 *   products      : 5
 *   tasks         : 5
 */

import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── Constants ─────────────────────────────────────────────────────────────────
export const DEMO_LIMITS = {
  clients:       10,
  visits_total:  15,
  visits_active: 3,
  products:      5,
  tasks:         5,
} as const

export type DemoLimitType = keyof typeof DEMO_LIMITS

export interface DemoLimitResult {
  exceeded: boolean
  current:  number
  limit:    number
  type:     DemoLimitType
}

// ─── Main helper ───────────────────────────────────────────────────────────────
/**
 * Returns null  → org is NOT demo (no limits apply)
 * Returns result with exceeded=false → demo org, limit not yet reached
 * Returns result with exceeded=true  → demo org, limit reached → REJECT request
 */
export async function checkDemoLimit(
  orgId: string,
  type:  DemoLimitType,
): Promise<DemoLimitResult | null> {
  const service = createSupabaseServiceClient()

  // 1. Is this org a demo org?
  const { data: org } = await service
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .single()

  const isDemo = !!(org?.features as Record<string, unknown>)?.is_demo
  if (!isDemo) return null   // Regular org — no limits

  const limit = DEMO_LIMITS[type]
  let current = 0

  // 2. Count current records
  switch (type) {
    case 'clients': {
      const { count } = await service
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
      current = count ?? 0
      break
    }

    case 'visits_total': {
      const { count } = await service
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
      current = count ?? 0
      break
    }

    case 'visits_active': {
      const { count } = await service
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['scheduled', 'in_progress'])
      current = count ?? 0
      break
    }

    case 'products': {
      const { count } = await service
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_active', true)
      current = count ?? 0
      break
    }

    case 'tasks': {
      const { count } = await service
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('archived_at', null)
        .neq('status', 'completed')
        .neq('task_type', 'meeting')
      current = count ?? 0
      break
    }
  }

  return { exceeded: current >= limit, current, limit, type }
}

/**
 * Convenience: check a limit and return a 429 NextResponse if exceeded.
 * Usage:
 *   const limitError = await enforceDemoLimit(orgId, 'clients')
 *   if (limitError) return limitError
 */
import { NextResponse } from 'next/server'

export async function enforceDemoLimit(
  orgId: string,
  type:  DemoLimitType,
): Promise<NextResponse | null> {
  const result = await checkDemoLimit(orgId, type)
  if (!result || !result.exceeded) return null   // OK

  return NextResponse.json(
    {
      error:   'demo_limit_exceeded',
      type:    result.type,
      current: result.current,
      limit:   result.limit,
      message: `Demo limit reached: ${result.current}/${result.limit} ${type}`,
    },
    { status: 429 },
  )
}
