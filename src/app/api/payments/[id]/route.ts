import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const { data: payment, error } = await serviceSupabase
      .from('payments')
      .select(`
        *,
        clients(id, first_name, last_name, phone, email),
        sale:sale_id(
          id, total_amount, paid_amount, status, sale_date,
          payment_method, receipt_sent, notes,
          sale_items(
            id, product_id, product_name, quantity, unit_price, total_price
          )
        )
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/payments/[id]
 * Удаление платежа со статусом pending (ещё не оплачен).
 * completed-платежи удалять нельзя — только суперадмин через /api/admin/...
 * После удаления пересчитывает статус связанной сделки.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const service = createSupabaseServiceClient()

    // 1. Получаем платёж — проверяем принадлежность и статус
    const { data: payment, error: fetchErr } = await service
      .from('payments')
      .select('id, status, sale_id, org_id, amount')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // 2. Запрещаем удалять оплаченные/возвращённые платежи
    if (payment.status === 'completed' || payment.status === 'refunded') {
      return NextResponse.json(
        { error: 'Cannot delete a completed or refunded payment. Contact support.' },
        { status: 403 }
      )
    }

    // 3. Удаляем платёж
    const { error: deleteErr } = await service
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (deleteErr) {
      console.error('[DELETE /api/payments/[id]]', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    // 4. Если платёж был привязан к сделке — пересчитываем её статус
    if (payment.sale_id) {
      const { data: remaining } = await service
        .from('payments')
        .select('amount, status')
        .eq('sale_id', payment.sale_id)
        .eq('org_id', orgId)

      const totalPaid = (remaining ?? [])
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

      const { data: sale } = await service
        .from('sales')
        .select('total_amount')
        .eq('id', payment.sale_id)
        .eq('org_id', orgId)
        .single()

      if (sale) {
        const newStatus =
          totalPaid >= Number(sale.total_amount) ? 'paid'
          : totalPaid > 0 ? 'partial'
          : 'unpaid'

        await service
          .from('sales')
          .update({ paid_amount: totalPaid, status: newStatus })
          .eq('id', payment.sale_id)
          .eq('org_id', orgId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/payments/[id]] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
