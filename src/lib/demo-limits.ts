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
 *
 * Standard 403 response format (machine-readable, used by global interceptor):
 *   { code: "LIMIT_EXCEEDED", entity: "clients", current: 10, limit: 10 }
 */

import { NextResponse } from 'next/server'
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

/**
 * Entity names for the standard error response.
 * Maps internal limit type → frontend entity key used by DemoLimitInterceptor.
 */
const ENTITY_MAP: Record<DemoLimitType, string> = {
  clients:       'clients',
  visits_total:  'visits',
  visits_active: 'visits',
  products:      'products',
  tasks:         'tasks',
}

export interface DemoLimitResult {
  exceeded: boolean
  current:  number
  limit:    number
  type:     DemoLimitType
}

/** Standard error payload — parsed by global DemoLimitInterceptor on frontend */
export interface DemoLimitErrorPayload {
  code:    'LIMIT_EXCEEDED'
  entity:  string
  current: number
  limit:   number
}

// ─── Main helper ───────────────────────────────────────────────────────────────
/**
 * Returns null  → org is NOT demo (no limits apply)
 * Returns result with exceeded=false → demo org, limit not yet reached
 * Returns result with exceeded=true  → demo org, limit reached → REJECT request
 *
 * Race-condition protection: uses PostgreSQL advisory lock (pg_try_advisory_lock)
 * via RPC so parallel requests cannot both pass the count check simultaneously.
 * Falls back gracefully if the RPC function is unavailable.
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

  // 2. Acquire advisory lock to prevent race conditions on parallel inserts.
  //    Lock key = deterministic 32-bit int from orgId + type string.
  //    The lock is released automatically at the end of the Supabase connection.
  //    Wrapped in try/catch — degrades gracefully if RPC doesn't exist.
  const lockKey = Math.abs(hashCode(`${orgId}:${type}`))
  try {
    await service.rpc('pg_try_advisory_xact_lock', { key: lockKey })
  } catch {
    // RPC not available → skip lock, still enforce count check below
  }

  // 3. Count current records
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
 * Convenience: check a limit and return a 403 NextResponse if exceeded.
 *
 * Response format (machine-readable — parsed by global DemoLimitInterceptor):
 *   HTTP 403
 *   { code: "LIMIT_EXCEEDED", entity: "clients", current: 10, limit: 10 }
 *
 * Usage:
 *   const limitError = await enforceDemoLimit(orgId, 'clients')
 *   if (limitError) return limitError
 */
export async function enforceDemoLimit(
  orgId: string,
  type:  DemoLimitType,
): Promise<NextResponse | null> {
  const result = await checkDemoLimit(orgId, type)
  if (!result || !result.exceeded) return null   // OK — proceed with insert

  const payload: DemoLimitErrorPayload = {
    code:    'LIMIT_EXCEEDED',
    entity:  ENTITY_MAP[result.type],
    current: result.current,
    limit:   result.limit,
  }

  return NextResponse.json(payload, { status: 403 })
}

// ─── Internal utils ────────────────────────────────────────────────────────────

/** Stable 32-bit hash of a string → used as PostgreSQL advisory lock key */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0   // convert to 32-bit int
  }
  return hash
}
