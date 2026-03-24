import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

// Разрешённые типы записей и их каскадные зависимости
const RECORD_CONFIG: Record<string, {
  table: string
  cascades?: Array<{ table: string; fk: string }>
}> = {
  payment: {
    table: 'payments',
    cascades: [{ table: 'payment_attempts', fk: 'payment_id' }],
  },
  visit: {
    table: 'visits',
    cascades: [
      { table: 'visit_services', fk: 'visit_id' },
      { table: 'visit_products', fk: 'visit_id' },
    ],
  },
  sale: {
    table: 'sales',
    cascades: [{ table: 'sale_items', fk: 'sale_id' }],
  },
  product: {
    table: 'products',
    cascades: [{ table: 'inventory_transactions', fk: 'product_id' }],
  },
  client: {
    table: 'clients',
    cascades: [
      { table: 'visits',               fk: 'client_id' },
      { table: 'payments',             fk: 'client_id' },
      { table: 'sms_messages',         fk: 'client_id' },
      { table: 'loyalty_points',       fk: 'client_id' },
      { table: 'client_subscriptions', fk: 'client_id' },
      { table: 'tasks',                fk: 'client_id' },
    ],
  },
}

/**
 * DELETE /api/admin/delete-record
 * Удаляет одну запись по типу + id. Только суперадмины.
 * Body: { type: 'payment'|'visit'|'sale'|'product'|'client', id: string, orgId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!SUPER_ADMINS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, id, orgId } = await req.json()

    const config = RECORD_CONFIG[type]
    if (!config) return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    if (!id || !orgId) return NextResponse.json({ error: 'id and orgId required' }, { status: 400 })

    // Verify record belongs to orgId (security: не даём удалять чужое)
    const { data: record } = await service
      .from(config.table).select('id').eq('id', id).eq('org_id', orgId).maybeSingle()
    if (!record) return NextResponse.json({ error: 'Record not found or wrong org' }, { status: 404 })

    // Cascade deletes
    if (config.cascades) {
      for (const { table, fk } of config.cascades) {
        // visit cascade: нужно сначала удалить visit_services по visit_id
        if (fk === 'visit_id' || fk === 'sale_id' || fk === 'payment_id' || fk === 'product_id') {
          await service.from(table).delete().eq(fk, id)
        } else {
          // client cascade: удаляем всё что принадлежит этому client_id
          await service.from(table).delete().eq(fk, id)
        }
      }
    }

    // Delete the record itself
    const { error } = await service.from(config.table).delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error

    // Audit
    await service.from('audit_log').insert({
      action: `admin_delete_${type}`,
      user_email: user.email,
      org_id: orgId,
      metadata: { record_id: id, type },
    }).maybeSingle()

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[delete-record]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
