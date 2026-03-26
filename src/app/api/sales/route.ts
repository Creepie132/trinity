import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId: activeOrgId } = auth

  const supabase = createSupabaseServiceClient()
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const month     = searchParams.get('month')
  const search    = searchParams.get('search')
  const page      = parseInt(searchParams.get('page') || '0')
  const pageSize  = 25
  const chartMode = searchParams.get('chart') === '1'
  const dateFrom  = searchParams.get('dateFrom')
  const dateTo    = searchParams.get('dateTo')

  // ── Chart mode: lightweight, no pagination, no PII ───────────────────────
  // Returns sale_date + total_amount for the last 12 months.
  // Used exclusively by BarChart — never exposes client data.
  if (chartMode) {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const fromDate = dateFrom || twelveMonthsAgo.toISOString().slice(0, 10)

    let chartQuery = supabase
      .from('sales')
      .select('sale_date, total_amount, status')
      .eq('org_id', activeOrgId)
      .gte('sale_date', fromDate)
      .order('sale_date', { ascending: true })

    if (dateTo) chartQuery = chartQuery.lte('sale_date', dateTo)

    const { data: chartData, error: chartErr } = await chartQuery
    if (chartErr) return NextResponse.json({ error: chartErr.message }, { status: 500 })
    return NextResponse.json(chartData || [])
  }

  // ── Normal list mode ──────────────────────────────────────────────────────
  let query = supabase
    .from('sales')
    .select(`
      *,
      clients(id, first_name, last_name, phone),
      sale_items(id, product_id, product_name, quantity, unit_price, total_price)
    `)
    .eq('org_id', activeOrgId)
    .order('created_at', { ascending: false })
    .order('sale_date', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (month) {
    const [y, m] = month.split('-')
    query = query.gte('sale_date', `${y}-${m}-01`).lte('sale_date', `${y}-${m}-31`)
  }
  if (dateFrom) query = query.gte('sale_date', dateFrom)
  if (dateTo)   query = query.lte('sale_date', dateTo)

  const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = data || []
  if (search) {
    const q = search.toLowerCase()
    result = result.filter((s: any) =>
      s.clients?.first_name?.toLowerCase().includes(q) ||
      s.clients?.last_name?.toLowerCase().includes(q) ||
      s.sale_items?.some((i: any) => i.product_name.toLowerCase().includes(q))
    )
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { user, orgId: activeOrgId } = auth

  const body = await req.json()
  const { client_id, items, paid_amount, payment_method, sale_date, notes } = body
  if (!items?.length) return NextResponse.json({ error: 'items required' }, { status: 400 })

  const supabase = createSupabaseServiceClient()
  const total_amount = items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0)
  const paid = Number(paid_amount ?? total_amount)
  const saleStatus = paid >= total_amount ? 'paid' : paid > 0 ? 'partial' : 'new'
  const paymentStatus = paid >= total_amount ? 'completed' : 'pending'

  const { data: payment, error: pmErr } = await supabase
    .from('payments')
    .insert({
      org_id: activeOrgId,
      client_id: client_id || null,
      amount: total_amount,
      status: paymentStatus,
      payment_method: payment_method || 'cash',
      paid_at: paid > 0 ? new Date().toISOString() : null,
      description: `Sale ${sale_date || new Date().toISOString().slice(0, 10)}`,
    })
    .select('id')
    .single()
  if (pmErr) return NextResponse.json({ error: pmErr.message }, { status: 500 })

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      org_id: activeOrgId,
      client_id: client_id || null,
      staff_id: user.id,
      payment_id: payment.id,
      sale_date: sale_date || new Date().toISOString().slice(0, 10),
      total_amount,
      paid_amount: paid,
      status: saleStatus,
      notes: notes || null,
    })
    .select('id')
    .single()
  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 })

  const saleItems = items.map((i: any) => ({
    sale_id: sale.id,
    org_id: activeOrgId,
    product_id: i.product_id || null,
    product_name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))
  const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  // ── Склад: списываем товары (только те у которых есть product_id) ──────────
  const productItems = items.filter((i: any) => i.product_id)
  if (productItems.length > 0) {
    for (const item of productItems) {
      // Получаем текущий остаток
      const { data: product } = await supabase
        .from('products')
        .select('id, quantity')
        .eq('id', item.product_id)
        .eq('org_id', activeOrgId)
        .single()

      if (!product) continue

      const newQty = Math.max(0, product.quantity - item.quantity)

      // Создаём транзакцию склада
      await supabase.from('inventory_transactions').insert({
        org_id: activeOrgId,
        product_id: item.product_id,
        type: 'sale',
        quantity: item.quantity,
        price_per_unit: item.unit_price,
        total_price: item.quantity * item.unit_price,
        related_payment_id: payment.id,
        notes: `Продажа #${sale.id.slice(0, 8)}`,
      })

      // Обновляем остаток в products
      await supabase
        .from('products')
        .update({ quantity: newQty })
        .eq('id', item.product_id)
        .eq('org_id', activeOrgId)
    }
  }

  return NextResponse.json({ id: sale.id, payment_id: payment.id }, { status: 201 })
}
