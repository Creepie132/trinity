/**
 * GET /api/mobile/admin/dashboard
 * Мобильный Admin Dashboard — только для super_admin.
 * Auth: Bearer токен из Authorization header.
 * Returns: mrr, org_count, org_limit, new_orgs_week, failed_payments,
 *          recent_orgs[], recent_actions[], monthly_new_orgs[]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ORG_LIMIT = 200 // Плановый лимит организаций

export async function GET(request: NextRequest) {
  try {
    // ── Bearer auth ──────────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const jwt = authHeader.slice(7)

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data, error: authError } = await anonClient.auth.getUser(jwt)
    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = data.user
    const orgRole = user.app_metadata?.org_role as string | null ?? null
    const isAdmin = user.app_metadata?.is_admin === true

    // Только super_admin (или is_admin флаг из admin_users)
    if (orgRole !== 'super_admin' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 })
    }

    const service = createSupabaseServiceClient()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    // ── Параллельные запросы ──────────────────────────────────────────────────
    const [
      orgsResult,
      newOrgsWeekResult,
      failedPaymentsResult,
      recentActionsResult,
      monthlyOrgsResult,
    ] = await Promise.all([
      // Все организации + billing info
      service
        .from('organizations')
        .select('id, name, subscription_status, billing_amount, created_at, owner_email, features')
        .not('name', 'ilike', '%test%')
        .order('created_at', { ascending: false }),

      // Новые за неделю
      service
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .not('name', 'ilike', '%test%')
        .gte('created_at', weekAgo.toISOString()),

      // Неудачные платежи за 30 дней
      service
        .from('subscription_billing_log')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Последние действия из audit_log
      service
        .from('audit_log')
        .select('id, action, entity_type, user_email, org_id, created_at, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(20),

      // Новые орги по месяцам (последние 6 месяцев)
      service
        .from('organizations')
        .select('created_at')
        .not('name', 'ilike', '%test%')
        .gte('created_at', monthAgo.toISOString()),
    ])

    const allOrgs = orgsResult.data ?? []

    // ── MRR ───────────────────────────────────────────────────────────────────
    const payingStatuses = ['active', 'trial', 'manual']
    const payingOrgs = allOrgs.filter(o =>
      payingStatuses.includes(o.subscription_status) && o.billing_amount != null
    )
    const mrr = payingOrgs.reduce((sum, o) => sum + Number(o.billing_amount || 0), 0)

    // ── Recent orgs (last 5) ──────────────────────────────────────────────────
    const recentOrgs = allOrgs.slice(0, 5).map(o => ({
      id: o.id,
      name: (o.features as any)?.business_info?.display_name || o.name,
      status: o.subscription_status,
      owner_email: o.owner_email,
      created_at: o.created_at,
    }))

    // ── Recent actions (last 10) ──────────────────────────────────────────────
    const recentActions = (recentActionsResult.data ?? []).slice(0, 10).map((a: any) => ({
      id: a.id,
      action: a.action,
      entity_type: a.entity_type,
      user_email: a.user_email,
      org_name: a.organizations?.name ?? null,
      created_at: a.created_at,
    }))

    // ── Monthly new orgs (last 6 months) ──────────────────────────────────────
    const monthCounts: Record<string, number> = {}
    for (const org of monthlyOrgsResult.data ?? []) {
      const month = (org.created_at as string).slice(0, 7)
      monthCounts[month] = (monthCounts[month] || 0) + 1
    }
    const monthlyNewOrgs = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { month: key, count: monthCounts[key] ?? 0 }
    })

    return NextResponse.json({
      mrr,
      org_count: allOrgs.length,
      org_limit: ORG_LIMIT,
      new_orgs_week: newOrgsWeekResult.count ?? 0,
      failed_payments: failedPaymentsResult.count ?? 0,
      recent_orgs: recentOrgs,
      recent_actions: recentActions,
      monthly_new_orgs: monthlyNewOrgs,
    })
  } catch (err: any) {
    console.error('[mobile/admin/dashboard] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
