import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const service = createSupabaseServiceClient()
  let query = service
    .from('expenses')
    .select('*')
    .eq('org_id', orgId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (month) {
    const start = `${month}-01`
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
      .toISOString().split('T')[0]
    query = query.gte('expense_date', start).lte('expense_date', end)
  }
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const body = await request.json()
  const { id, vendor, amount, expense_date, category, description, verified } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from('expenses')
    .update({
      vendor, amount, expense_date, category, description,
      verified: verified ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data })
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: expense } = await service
    .from('expenses').select('receipt_storage_path').eq('id', id).eq('org_id', orgId).single()

  if (expense?.receipt_storage_path) {
    await service.storage.from('receipts').remove([expense.receipt_storage_path])
  }

  const { error } = await service.from('expenses').delete().eq('id', id).eq('org_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
