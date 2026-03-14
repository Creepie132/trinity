import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { user, orgId: activeOrgId } = auth

  const supabase = createSupabaseServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const month = searchParams.get('month')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = 25

  let query = supabase
    .from('sales')
    .select(`
      *,
      clients(id, first_name, last_name, phone),
      sale_items(id, product_id, product_name, quantity, unit_price, total_price)
    `)
    .eq('org_id', activeOrgId)
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (month) {
    const [y, m] = month.split('-')
    query = query.gte('sale_date', `${y}-${m}-01`).lte('sale_date', `${y}-${m}-31`)
  }

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

  return NextResponse.json({ id: sale.id, payment_id: payment.id }, { status: 201 })
}
