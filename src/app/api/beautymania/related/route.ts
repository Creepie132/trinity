import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

/**
 * GET /api/beautymania/related?ids=uuid1,uuid2
 * Возвращает cross-sell товары для переданных product_id.
 * Дедуплицирует результаты и исключает товары уже в корзине.
 */
export async function GET(request: NextRequest) {
  const headers = corsHeaders()

  try {
    // Rate limit
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-related:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* continue */ }

    const ids = request.nextUrl.searchParams.get('ids')
    if (!ids) return NextResponse.json({ products: [] }, { headers })

    const productIds = ids.split(',').filter(id => /^[0-9a-f-]{36}$/.test(id)).slice(0, 10)
    if (productIds.length === 0) return NextResponse.json({ products: [] }, { headers })

    const service = createSupabaseServiceClient()

    // Находим все cross-sell связи для переданных товаров
    const { data: relations } = await service
      .from('product_relations')
      .select('related_id')
      .eq('org_id', BM_ORG_ID)
      .eq('relation_type', 'cross_sell')
      .in('product_id', productIds)

    if (!relations || relations.length === 0) {
      return NextResponse.json({ products: [] }, { headers })
    }

    // Дедуплицируем related_id и исключаем сами запрошенные товары
    const seen = new Set<string>()
    const relatedIds: string[] = []
    for (const r of relations) {
      if (!productIds.includes(r.related_id) && !seen.has(r.related_id)) {
        seen.add(r.related_id)
        relatedIds.push(r.related_id)
        if (relatedIds.length >= 6) break
      }
    }

    if (relatedIds.length === 0) return NextResponse.json({ products: [] }, { headers })

    // Загружаем данные о связанных товарах
    const { data: products } = await service
      .from('products')
      .select('id, name, description, sell_price, image_url, category, quantity')
      .eq('org_id', BM_ORG_ID)
      .eq('is_active', true)
      .gt('quantity', 0)
      .in('id', relatedIds)

    return NextResponse.json(
      { products: products ?? [] },
      { headers: { ...headers, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )

  } catch (err) {
    console.error('[Beautymania Related] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
