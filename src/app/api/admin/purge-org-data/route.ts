import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

/**
 * POST /api/admin/purge-org-data
 * Удаляет ВСЕ бизнес-данные организации (клиенты, визиты, платежи,
 * продажи, склад), НЕ удаляя саму org и пользователей.
 * Только для суперадминов + подтверждение паролем.
 *
 * Body: { orgId: string, scope: ('all' | 'clients' | 'visits' | 'payments' | 'sales' | 'inventory')[], password: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth — только суперадмин
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!SUPER_ADMINS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orgId, scope, password } = await req.json()

    // 2. Пароль подтверждения
    const correctPassword = process.env.ADMIN_DELETE_PASSWORD
    if (!correctPassword || password !== correctPassword) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    // 3. Проверяем что org существует
    const { data: org } = await service
      .from('organizations').select('id, name').eq('id', orgId).maybeSingle()
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    const scopes: string[] = Array.isArray(scope) ? scope : ['all']
    const all = scopes.includes('all')
    const deleted: Record<string, number> = {}

    // Получаем client_ids для каскадного удаления
    const { data: clients } = await service
      .from('clients').select('id').eq('org_id', orgId)
    const clientIds = (clients || []).map(c => c.id)

    // ── PAYMENTS ─────────────────────────────────────────────────────────
    if (all || scopes.includes('payments')) {
      const { count: pc } = await service
        .from('payments').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      await service.from('payment_attempts').delete().eq('org_id', orgId)
      await service.from('payments').delete().eq('org_id', orgId)
      deleted.payments = pc || 0
    }

    // ── VISITS ───────────────────────────────────────────────────────────
    if (all || scopes.includes('visits')) {
      const { count: vc } = await service
        .from('visits').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      // Каскад: visit_services, visit_products если есть
      if (clientIds.length > 0) {
        await service.from('visit_services').delete().in('visit_id',
          (await service.from('visits').select('id').eq('org_id', orgId)).data?.map(v => v.id) || []
        )
      }
      await service.from('visits').delete().eq('org_id', orgId)
      deleted.visits = vc || 0
    }

    // ── SALES ────────────────────────────────────────────────────────────
    if (all || scopes.includes('sales')) {
      const { count: sc } = await service
        .from('sales').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      await service.from('sale_items').delete().in('sale_id',
        (await service.from('sales').select('id').eq('org_id', orgId)).data?.map(s => s.id) || []
      )
      await service.from('sales').delete().eq('org_id', orgId)
      deleted.sales = sc || 0
    }

    // ── INVENTORY ────────────────────────────────────────────────────────
    if (all || scopes.includes('inventory')) {
      const { count: ic } = await service
        .from('products').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      await service.from('inventory_transactions').delete().eq('org_id', orgId)
      await service.from('products').delete().eq('org_id', orgId)
      deleted.inventory = ic || 0
    }

    // ── CLIENTS (последними — на них FK) ─────────────────────────────────
    if (all || scopes.includes('clients')) {
      const { count: cc } = await service
        .from('clients').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
      if (clientIds.length > 0) {
        await service.from('loyalty_points').delete().in('client_id', clientIds)
        await service.from('client_subscriptions').delete().in('client_id', clientIds)
        await service.from('sms_messages').delete().in('client_id', clientIds)
        await service.from('tasks').delete().in('client_id', clientIds)
      }
      await service.from('bookings').delete().eq('org_id', orgId)
      await service.from('clients').delete().eq('org_id', orgId)
      deleted.clients = cc || 0
    }

    // Audit log
    await service.from('audit_log').insert({
      action: 'admin_purge_data',
      user_email: user.email,
      org_id: orgId,
      metadata: { org_name: org.name, scope: scopes, deleted },
    }).maybeSingle()

    return NextResponse.json({ ok: true, org: org.name, deleted })
  } catch (err: any) {
    console.error('[purge-org-data]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
