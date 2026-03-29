import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/site-orders/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('site_orders')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Попробуем найти клиента по телефону
  let matchedClient = null
  if (data.customer_phone) {
    const phone = data.customer_phone.replace(/\D/g, '')
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, phone')
      .eq('org_id', orgId)
      .or(`phone.ilike.%${phone}%`)
      .limit(1)
    if (clients && clients.length > 0) matchedClient = clients[0]
  }

  return NextResponse.json({ ...data, matched_client: matchedClient })
}

// PATCH /api/site-orders/[id] — обновить статус
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  const body = await req.json()
  const { status, sale_id, client_id } = body

  const supabase = createSupabaseServiceClient()

  const update: Record<string, unknown> = {}
  if (status) update.status = status
  if (sale_id) update.sale_id = sale_id
  if (client_id) update.client_id = client_id

  const { data, error } = await supabase
    .from('site_orders')
    .update(update)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
