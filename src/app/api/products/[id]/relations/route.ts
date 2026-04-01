import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

// GET /api/products/[id]/relations — получить связанные товары
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  const service = createSupabaseServiceClient()

  // Проверяем что товар принадлежит этой орг
  const { data: product } = await service
    .from('products').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: relations } = await service
    .from('product_relations')
    .select('related_id, products!product_relations_related_id_fkey(id, name, sell_price, image_url, category)')
    .eq('org_id', orgId)
    .eq('product_id', id)
    .eq('relation_type', 'cross_sell')

  const related = (relations ?? [])
    .map((r: any) => r.products)
    .filter(Boolean)

  return NextResponse.json({ related })
}

// PUT /api/products/[id]/relations — перезаписать связи (delete + insert)
export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext(req)
  if ('error' in auth) return auth.error
  const { orgId } = auth
  const { id } = await params

  const bodySchema = z.object({
    related_ids: z.array(z.string().uuid()).max(20),
  })

  let body: z.infer<typeof bodySchema>
  try {
    const raw = await req.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const service = createSupabaseServiceClient()

  // Проверяем что товар принадлежит этой орг
  const { data: product } = await service
    .from('products').select('id').eq('id', id).eq('org_id', orgId).single()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Проверяем что все related_ids принадлежат этой орг
  if (body.related_ids.length > 0) {
    const { data: valid } = await service
      .from('products').select('id').eq('org_id', orgId).in('id', body.related_ids)
    const validSet = new Set((valid ?? []).map((p: any) => p.id))
    body.related_ids = body.related_ids.filter(rid => validSet.has(rid))
  }

  // Транзакция: DELETE + INSERT
  const { error: delError } = await service
    .from('product_relations')
    .delete()
    .eq('org_id', orgId)
    .eq('product_id', id)
    .eq('relation_type', 'cross_sell')

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (body.related_ids.length > 0) {
    const rows = body.related_ids.map(related_id => ({
      org_id: orgId, product_id: id, related_id, relation_type: 'cross_sell',
    }))
    const { error: insError } = await service.from('product_relations').insert(rows)
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: body.related_ids.length })
}
