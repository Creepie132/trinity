/**
 * POST /api/mobile/onboarding/products
 * Пакетный INSERT начального ассортимента (Шаг 3 — только при модуле inventory).
 * Auth: Bearer token.
 *
 * Body: { products: Array<{ name, quantity, price }> }
 * Returns: { ok: true, inserted: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_PRODUCTS = 10

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json()
    const products = body?.products

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'products[] обязателен и не может быть пустым' }, { status: 400 })
    }
    if (products.length > MAX_PRODUCTS) {
      return NextResponse.json({ error: `Максимум ${MAX_PRODUCTS} товаров` }, { status: 400 })
    }

    const rows: Array<Record<string, unknown>> = []
    let rowErr: NextResponse | null = null
    products.forEach((p: Record<string, unknown>, i: number) => {
      if (rowErr) return
      const name     = String(p.name ?? '').trim()
      const quantity = parseInt(String(p.quantity ?? p.qty ?? 0))
      const price    = parseFloat(String(p.price ?? 0))

      if (!name) {
        rowErr = NextResponse.json({ error: `Товар #${i + 1}: name обязателен` }, { status: 400 })
        return
      }
      if (isNaN(quantity) || quantity < 0) {
        rowErr = NextResponse.json({ error: `Товар #${i + 1}: quantity должен быть >= 0` }, { status: 400 })
        return
      }
      if (isNaN(price) || price < 0) {
        rowErr = NextResponse.json({ error: `Товар #${i + 1}: price должен быть >= 0` }, { status: 400 })
        return
      }

      rows.push({
        org_id:         orgId,
        name:           name,
        sell_price:     price,
        purchase_price: 0,
        quantity:       quantity,
        stock_quantity: quantity,
        min_quantity:   0,
        unit:           'יחידה',
        is_active:      true,
      })
    })
    if (rowErr) return rowErr

    const service = createSupabaseServiceClient()
    const { error } = await service.from('products').insert(rows)

    if (error) {
      console.error('[onboarding/products]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Создаём inventory_transaction type='initial' для учёта начального остатка
    // Игнорируем ошибки если таблица не поддерживает этот тип
    const { data: inserted } = await service
      .from('products')
      .select('id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(rows.length)

    if (inserted && inserted.length > 0) {
      const txRows = inserted.map((p: { id: string }, idx: number) => ({
        org_id:     orgId,
        product_id: p.id,
        type:       'initial',
        quantity:   rows[idx]?.quantity ?? 0,
        notes:      'Онбординг — начальный остаток',
      }))
      await service.from('inventory_transactions').insert(txRows)
    }

    return NextResponse.json({ ok: true, inserted: rows.length })
  } catch (e: any) {
    console.error('[onboarding/products]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
