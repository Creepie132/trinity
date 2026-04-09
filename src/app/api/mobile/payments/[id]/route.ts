/**
 * GET /api/mobile/payments/[id]/sale
 * Возвращает сделку (sale + sale_items), привязанную к платежу payment_id = :id
 * Если сделки нет — { sale: null }
 *
 * Auth: Bearer токен (mobile)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const { id: paymentId } = await params
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment id' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        id,
        status,
        total_amount,
        paid_amount,
        sale_date,
        notes,
        sale_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('org_id', orgId)
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sale: sale ?? null })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
