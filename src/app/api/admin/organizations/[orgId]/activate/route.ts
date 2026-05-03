import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { getPlanModules, normalizePlan, VALID_PLANS } from '@/lib/billing-plans'

type Plan = typeof VALID_PLANS[number]

/**
 * POST /api/admin/organizations/[orgId]/activate
 *
 * Ручной перевод организации из demo → active в панели администратора.
 *
 * ── Гарантии ─────────────────────────────────────────────────────────────────
 *  1. Данные не удаляются: clients, visits, payments — НЕ трогаем
 *  2. Только изменяем: subscription_status, plan, features.modules, limits
 *  3. Доступно ТОЛЬКО системному администратору (is_admin в JWT или admin_users)
 *  4. Аудит-лог каждой активации
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  // ── 1. Авторизация — только системный администратор ──────────────────────
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { orgId } = await context.params
  if (!orgId || orgId.trim().length === 0) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  // ── 2. Парсим и валидируем body ─────────────────────────────────────────
  let body: { plan?: string; modules?: Record<string, boolean> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const plan = normalizePlan(body.plan ?? 'basic') as Plan
  const explicitModules: Record<string, boolean> | null = body.modules ?? null

  if (!VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json(
      { error: `Invalid plan. Allowed: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    )
  }

  // Если explicit modules — каждый ключ должен быть boolean
  if (explicitModules !== null) {
    for (const [key, val] of Object.entries(explicitModules)) {
      if (typeof val !== 'boolean') {
        return NextResponse.json(
          { error: `modules.${key} must be boolean` },
          { status: 400 }
        )
      }
    }
  }

  const service = createSupabaseServiceClient()

  // ── 3. Загружаем организацию — проверяем что существует ─────────────────
  const { data: org, error: orgErr } = await service
    .from('organizations')
    .select('id, name, features, subscription_status, plan')
    .eq('id', orgId)
    .single()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const previousStatus = org.subscription_status

  // ── 4. Вычисляем новые модули ────────────────────────────────────────────
  // Приоритет: explicit modules > план из PLAN_MODULES > базовый план
  const newModules = explicitModules ?? getPlanModules(plan)

  // Сохраняем существующие features — не удаляем бизнес-конфигурацию
  const existingFeatures = (org.features as Record<string, any>) ?? {}

  const nextBillingDate = new Date()
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  expiresAt.setDate(expiresAt.getDate() + 3)

  // ── 5. Атомарное обновление — ТОЛЬКО статус и лимиты, данные не трогаем ─
  // ⚠️  clients, visits, payments, services — не удаляем ни одной записи
  const { error: updateErr } = await service
    .from('organizations')
    .update({
      plan,
      subscription_status:     'active',
      subscription_expires_at: expiresAt.toISOString(),
      billing_status:          'manual_activation',
      billing_due_date:        nextBillingDate.toISOString().split('T')[0],
      features: {
        ...existingFeatures,       // сохраняем все существующие настройки
        modules:      newModules,  // разблокируем выбранные модули
        is_demo:      false,       // снимаем demo-флаг
        client_limit: 9999,        // снимаем лимит клиентов
      },
    })
    .eq('id', orgId)

  if (updateErr) {
    console.error('[admin/activate] DB update error:', updateErr)
    return NextResponse.json(
      { error: 'Database update failed', detail: updateErr.message },
      { status: 500 }
    )
  }

  // ── 6. Аудит-лог (non-fatal) ─────────────────────────────────────────────
  try {
    await service.from('audit_log').insert({
      action:      'admin.manual_activate_org',
      entity_type: 'organization',
      entity_id:   orgId,
      details: {
        plan,
        modules:         newModules,
        activated_by:    auth.user.id,
        from_status:     previousStatus,
        to_status:       'active',
        explicit_modules: explicitModules !== null,
        expires_at:      expiresAt.toISOString(),
      },
    })
  } catch (auditErr) {
    console.warn('[admin/activate] Audit log failed (non-fatal):', auditErr)
  }

  const activeModuleList = Object.keys(newModules).filter(k => newModules[k])

  console.log('[admin/activate] ✅ Org activated:', {
    orgId, orgName: org.name, plan,
    from: previousStatus, to: 'active',
    by: auth.user.id, modules: activeModuleList,
  })

  return NextResponse.json({
    ok:          true,
    org_id:      orgId,
    org_name:    org.name,
    plan,
    modules:     newModules,
    active_modules: activeModuleList,
    expires_at:  expiresAt.toISOString(),
    activated_by: auth.user.id,
    message: `Organization "${org.name}" activated as "${plan}". Client and visit data preserved.`,
  })
}
