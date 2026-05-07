import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId: activeOrgId } = auth

  const body = await req.json()
  const allowed = ['receipt_sent', 'notes', 'paid_amount', 'status']
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('sales')
    .update(patch)
    .eq('id', id)
    .eq('org_id', activeOrgId)
    .select('id, receipt_sent, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * DELETE /api/sales/[id]
 * Удаление продажи со статусом unpaid или new (ещё не оплачена).
 * paid/partial продажи нельзя удалять — только через суперадмин.
 * После удаления: возвращает stock товаров, удаляет sale_items и pending-платежи.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()

    // 1. Получаем продажу — проверяем принадлежность и статус
    const { data: sale, error: fetchErr } = await service
      .from('sales')
      .select('id, status, org_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchErr || !sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // 2. Запрещаем удалять оплаченные/частично оплаченные продажи
    if (sale.status === 'paid' || sale.status === 'partial') {
      return NextResponse.json(
        { error: 'Cannot delete a paid or partially paid sale. Contact support.' },
        { status: 403 }
      )
    }

    // 3. Получаем items для возврата stock
    const { data: items } = await service
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', id)

    // 4. Удаляем pending-платежи этой продажи (если есть)
    await service
      .from('payments')
      .delete()
      .eq('sale_id', id)
      .eq('org_id', orgId)
      .neq('status', 'completed') // completed не трогаем (их всё равно не должно быть для unpaid)

    // 5. Удаляем inventory_transactions, связанные с продажей (по notes)
    // Возвращаем stock товаров
    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.product_id) continue

        const { data: product } = await service
          .from('products')
          .select('id, quantity')
          .eq('id', item.product_id)
          .eq('org_id', orgId)
          .single()

        if (product) {
          await service
            .from('products')
            .update({ quantity: product.quantity + item.quantity })
            .eq('id', item.product_id)
            .eq('org_id', orgId)
        }
      }
    }

    // 6. Удаляем sale_items
    await service.from('sale_items').delete().eq('sale_id', id)

    // 7. Удаляем саму продажу
    const { error: deleteErr } = await service
      .from('sales')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (deleteErr) {
      console.error('[DELETE /api/sales/[id]]', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/sales/[id]] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
