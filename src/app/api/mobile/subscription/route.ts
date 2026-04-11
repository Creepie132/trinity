/**
 * GET /api/mobile/subscription
 * Возвращает текущий план, включённые модули и историю платежей организации.
 *
 * Auth: Bearer токен
 * Источники:
 *   - organizations: plan, billing_status, billing_due_date, billing_amount,
 *                    is_trial, trial_expires_at, features.modules
 *   - subscription_plans: название плана, описание
 *   - module_pricing: названия модулей
 *   - org_payment_history: история платежей за Trinity CRM
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { MODULES } from '@/lib/modules-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()

    // Параллельно: данные орга + история платежей + справочник планов
    const [orgRes, historyRes, plansRes] = await Promise.all([
      service
        .from('organizations')
        .select('plan, billing_status, billing_due_date, billing_amount, billing_cycle, is_trial, trial_expires_at, features')
        .eq('id', orgId)
        .single(),
      service
        .from('org_payment_history')
        .select('id, amount, currency, status, description, period_start, period_end, receipt_url, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(24),
      service
        .from('subscription_plans')
        .select('key, name_ru, name_he, desc_ru, desc_he, price_monthly, modules')
        .eq('is_active', true),
    ])

    if (orgRes.error || !orgRes.data) {
      console.error('[mobile/subscription GET] org:', orgRes.error)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org  = orgRes.data
    const plan = plansRes.data?.find(p => p.key === org.plan) ?? null

    // Включённые модули из organizations.features.modules
    const modulesMap: Record<string, boolean> = org.features?.modules ?? {}
    const enabledModules = MODULES
      .filter(m => !m.hiddenInUI && modulesMap[m.key] === true)
      .map(m => ({ key: m.key, name_ru: m.name_ru, name_he: m.name_he }))

    return NextResponse.json({
      plan: {
        key:           org.plan ?? 'basic',
        name_ru:       plan?.name_ru ?? org.plan ?? 'Базовый',
        name_he:       plan?.name_he ?? org.plan ?? 'בסיסי',
        desc_ru:       plan?.desc_ru ?? null,
        price_monthly: plan?.price_monthly ?? org.billing_amount ?? 0,
      },
      billing: {
        status:     org.billing_status ?? 'trial',
        due_date:   org.billing_due_date ?? null,
        amount:     org.billing_amount ?? 0,
        cycle:      org.billing_cycle ?? 'monthly',
        is_trial:   org.is_trial ?? false,
        trial_expires_at: org.trial_expires_at ?? null,
      },
      modules:         enabledModules,
      payment_history: historyRes.data ?? [],
    })
  } catch (e) {
    console.error('[mobile/subscription GET] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
