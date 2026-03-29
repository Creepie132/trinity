import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

// ─── CORS — публичный read-only endpoint, разрешаем все origins ───────────────
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

// ─── Beautymania org config ───────────────────────────────────────────────────
const BM_ORG_ID = '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── GET /api/beautymania/products ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const headers = corsHeaders()

  try {
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-products:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* ratelimit unavailable */ }

    const service = createSupabaseServiceClient()

    const { data: products, error } = await service
      .from('products')
      .select('id, name, description, sell_price, image_url, category, quantity, unit')
      .eq('org_id', BM_ORG_ID)
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Beautymania Products] DB error:', error)
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500, headers })
    }

    return NextResponse.json(
      { products: products ?? [] },
      { headers: { ...headers, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[Beautymania Products] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
