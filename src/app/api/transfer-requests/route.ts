import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/transfer-requests — list requests for current org (sent + received)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgUser } = await supabase
    .from('org_users').select('org_id').eq('user_id', user.id).single()
  if (!orgUser) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = orgUser.org_id

  const { data, error } = await supabaseAdmin
    .from('transfer_requests')
    .select('*')
    .or(`from_org_id.eq.${orgId},to_org_id.eq.${orgId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/transfer-requests — create transfer request
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgUser } = await supabase
    .from('org_users').select('org_id').eq('user_id', user.id).single()
  if (!orgUser) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const body = await request.json()
  const { from_org_id, to_org_id, items, note } = body

  if (!from_org_id || !to_org_id || !items?.length) {
    return NextResponse.json({ error: 'from_org_id, to_org_id and items are required' }, { status: 400 })
  }

  // Create transfer request
  const { data: req, error } = await supabaseAdmin
    .from('transfer_requests')
    .insert({ from_org_id, to_org_id, items, note: note || null, created_by: user.id, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owners of the TO org
  const [{ data: toOrg }, { data: owners }] = await Promise.all([
    supabaseAdmin.from('organizations').select('name').eq('id', to_org_id).single(),
    supabaseAdmin.from('org_users').select('user_id').eq('org_id', to_org_id).eq('role', 'owner'),
  ])
  const { data: fromOrg } = await supabaseAdmin.from('organizations').select('name').eq('id', from_org_id).single()

  if (owners && owners.length > 0) {
    await supabaseAdmin.from('notifications').insert(
      owners.map((o) => ({
        org_id: to_org_id,
        user_id: o.user_id,
        type: 'transfer_request',
        title: 'Новый запрос на перевод товаров',
        body: `${fromOrg?.name || from_org_id} хочет перевести ${items.length} поз. товаров в ${toOrg?.name || to_org_id}. Заметка: ${note || '—'}`,
        metadata: {
          transfer_request_id: req.id,
          from_org_id,
          to_org_id,
          from_org_name: fromOrg?.name || '',
          to_org_name: toOrg?.name || '',
          items_count: items.length,
        },
      }))
    )
  }

  return NextResponse.json(req, { status: 201 })
}

// PATCH /api/transfer-requests — approve or reject
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await request.json()
  if (!id || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'id and status (approved|rejected) required' }, { status: 400 })
  }

  // Load the request
  const { data: transferReq } = await supabaseAdmin
    .from('transfer_requests').select('*').eq('id', id).single()
  if (!transferReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (transferReq.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

  // Verify user is owner of to_org_id (the one who approves)
  const { data: ownerRow } = await supabaseAdmin
    .from('org_users')
    .select('role')
    .eq('org_id', transferReq.to_org_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!ownerRow || ownerRow.role !== 'owner') {
    return NextResponse.json({ error: 'Only the target org owner can approve/reject' }, { status: 403 })
  }

  // Update status
  const { error: updateError } = await supabaseAdmin
    .from('transfer_requests')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // On approval: apply inventory changes
  if (status === 'approved') {
    const items: { product_id: string; product_name: string; quantity: number; unit?: string }[] = transferReq.items

    for (const item of items) {
      // 1) Reduce quantity in source org
      const { data: srcProduct } = await supabaseAdmin
        .from('products')
        .select('id, quantity, name, sell_price, unit, category, min_quantity')
        .eq('id', item.product_id)
        .eq('org_id', transferReq.from_org_id)
        .maybeSingle()

      if (srcProduct && srcProduct.quantity >= item.quantity) {
        await supabaseAdmin.from('products')
          .update({ quantity: srcProduct.quantity - item.quantity })
          .eq('id', srcProduct.id)

        await supabaseAdmin.from('inventory_transactions').insert({
          org_id: transferReq.from_org_id,
          product_id: srcProduct.id,
          type: 'write_off',
          quantity: item.quantity,
          notes: `Перевод в ${transferReq.to_org_id} (запрос ${id})`,
        })
      }

      // 2) Increase quantity in destination org — match by name
      const { data: dstProduct } = await supabaseAdmin
        .from('products')
        .select('id, quantity')
        .eq('org_id', transferReq.to_org_id)
        .eq('name', item.product_name)
        .maybeSingle()

      if (dstProduct) {
        await supabaseAdmin.from('products')
          .update({ quantity: dstProduct.quantity + item.quantity })
          .eq('id', dstProduct.id)

        await supabaseAdmin.from('inventory_transactions').insert({
          org_id: transferReq.to_org_id,
          product_id: dstProduct.id,
          type: 'purchase',
          quantity: item.quantity,
          notes: `Перевод из ${transferReq.from_org_id} (запрос ${id})`,
        })
      } else if (srcProduct) {
        // Create product in destination org
        const { data: newProduct } = await supabaseAdmin.from('products').insert({
          org_id: transferReq.to_org_id,
          name: srcProduct.name,
          sell_price: srcProduct.sell_price,
          unit: srcProduct.unit,
          category: srcProduct.category,
          min_quantity: srcProduct.min_quantity,
          quantity: item.quantity,
        }).select('id').single()

        if (newProduct) {
          await supabaseAdmin.from('inventory_transactions').insert({
            org_id: transferReq.to_org_id,
            product_id: newProduct.id,
            type: 'purchase',
            quantity: item.quantity,
            notes: `Перевод из ${transferReq.from_org_id} (запрос ${id})`,
          })
        }
      }
    }
  }

  // Notify the requester
  const { data: fromOrg } = await supabaseAdmin.from('organizations').select('name').eq('id', transferReq.from_org_id).single()
  const { data: toOrg } = await supabaseAdmin.from('organizations').select('name').eq('id', transferReq.to_org_id).single()

  // Find the requester's org to create notification
  const { data: requesterOrg } = await supabaseAdmin
    .from('org_users').select('org_id').eq('user_id', transferReq.created_by).maybeSingle()

  await supabaseAdmin.from('notifications').insert({
    org_id: requesterOrg?.org_id || transferReq.from_org_id,
    user_id: transferReq.created_by,
    type: 'transfer_result',
    title: status === 'approved' ? '✅ Запрос на перевод одобрен' : '❌ Запрос на перевод отклонён',
    body: `${toOrg?.name || transferReq.to_org_id} ${status === 'approved' ? 'одобрил' : 'отклонил'} перевод товаров из ${fromOrg?.name || transferReq.from_org_id}.`,
    metadata: { transfer_request_id: id, status },
  })

  return NextResponse.json({ success: true, status })
}
