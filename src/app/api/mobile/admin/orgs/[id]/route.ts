/**
 * GET  /api/mobile/admin/orgs/[id] — детали организации
 * DELETE /api/mobile/admin/orgs/[id] — удалить организацию
 * Auth: Bearer токен. Только super_admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

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

// ─── DELETE /api/mobile/admin/orgs/[id] ──────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSuperAdmin(request)
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: orgId } = await params
    if (!orgId) return NextResponse.json({ error: 'org id обязателен' }, { status: 400 })

    const service = createSupabaseServiceClient()

    // Читаем орг чтобы убедиться что она существует
    const { data: org, error: fetchErr } = await service
      .from('organizations')
      .select('id, name, owner_email')
      .eq('id', orgId)
      .single()

    if (fetchErr || !org) {
      return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 })
    }

    // Удаляем данные орги последовательно (соблюдаем FK)
    // Порядок важен: сначала дочерние таблицы, потом org
    const tables = [
      'visit_services',        // → visits
      'inventory_transactions', // → products
      'sale_items',            // → sales, products
      'wa_messages',           // → wa_conversations
      'wa_conversations',
      'wa_send_log',
      'wa_integrations',
      'wa_trigger_settings',
      'payments',
      'sales',
      'visits',
      'expenses',
      'products',
      'services',
      'clients',
      'tasks',
      'audit_log',
      'mobile_sessions',
      'notification_preferences',
      'kira_messages',
      'kira_sessions',
      'org_receipt_settings',
      'org_users',             // последним — чтобы не потерять ссылку на владельца
    ]

    for (const table of tables) {
      const { error } = await service
        .from(table as any)
        .delete()
        .eq('org_id', orgId)
      // Ошибки типа "column org_id does not exist" игнорируем — таблица просто не имеет этого поля
      if (error && !error.message.includes('org_id')) {
        console.error(`[admin/orgs/delete] cleanup ${table}:`, error.message)
      }
    }

    // Удаляем саму организацию
    const { error: deleteErr } = await service
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (deleteErr) {
      console.error('[admin/orgs/delete] delete org:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    console.log(`[admin/orgs/delete] deleted org ${orgId} (${org.name}) by ${user.email}`)

    return NextResponse.json({ ok: true, deleted_org: org.name })
  } catch (err: any) {
    console.error('[admin/orgs/delete] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── GET /api/mobile/admin/orgs/[id] ─────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const jwt = authHeader.slice(7)

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: authData, error: authError } = await anonClient.auth.getUser(jwt)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user    = authData.user
    const orgRole = user.app_metadata?.org_role as string | null ?? null
    const isAdmin = user.app_metadata?.is_admin === true
    if (orgRole !== 'super_admin' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: orgId } = await params
    const service = createSupabaseServiceClient()
    const now     = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      orgResult,
      ownerResult,
      clientsCountResult,
      activeVisitsResult,
      paymentsResult,
      tranzilaResult,
      mobileTokenResult,
      waIntegrationResult,
    ] = await Promise.all([
      service
        .from('organizations')
        .select('id, name, subscription_status, billing_amount, billing_due_date, owner_email, features')
        .eq('id', orgId)
        .single(),
      service
        .from('org_users')
        .select('first_name, last_name, phone, last_seen_at')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .maybeSingle(),
      service
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
      service
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['scheduled', 'confirmed']),
      service
        .from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .gte('created_at', monthStart),
      service
        .from('payments')
        .select('amount')
        .eq('org_id', orgId)
        .in('payment_method', ['card', 'tranzila', 'credit_card'])
        .eq('status', 'paid')
        .gte('created_at', monthStart),
      service
        .from('mobile_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
      service
        .from('wa_integrations')
        .select('is_active, instance_id')
        .eq('org_id', orgId)
        .maybeSingle(),
    ])

    if (orgResult.error || !orgResult.data) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org      = orgResult.data
    const owner    = ownerResult.data
    const features = (org.features as any) ?? {}

    const payments      = paymentsResult.data ?? []
    const paymentsCount = payments.length
    const revenue       = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

    const tranzilaPayments   = tranzilaResult.data ?? []
    const tranzilaEnabled    = features?.modules?.processing === true
    const tranzilaData = tranzilaEnabled ? {
      deals_this_month:  tranzilaPayments.length,
      amount_this_month: tranzilaPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    } : null

    const whapiConnected    = waIntegrationResult.data?.is_active === true
    const receiptsConnected = features?.receipts?.enabled === true
    const paymentSystem: string = tranzilaEnabled ? 'tranzila'
      : (features?.morning?.enabled ? 'morning' : 'none')

    const tokenExists = (mobileTokenResult.count ?? 0) > 0

    return NextResponse.json({
      org: {
        id:                org.id,
        name:              features?.business_info?.display_name || org.name,
        status:            org.subscription_status,
        billing_amount:    org.billing_amount ?? null,
        next_billing_date: org.billing_due_date ?? null,
        owner_email:       org.owner_email,
        owner_name:        owner ? `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim() || null : null,
        phone:             owner?.phone ?? null,
        address:           features?.business_info?.address ?? null,
      },
      token:  { exists: tokenExists },
      stats: {
        clients:        clientsCountResult.count ?? 0,
        active_visits:  activeVisitsResult.count ?? 0,
        payments_count: paymentsCount,
        revenue,
      },
      tranzila: tranzilaData,
      integrations: {
        whapi_connected:    whapiConnected,
        receipts_connected: receiptsConnected,
        payment_system:     paymentSystem,
      },
      presence: {
        last_seen_at: owner?.last_seen_at ?? null,
      },
    })
  } catch (err: any) {
    console.error('[admin/orgs/[id]] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
