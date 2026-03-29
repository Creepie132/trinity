import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://beautymania.co.il',
  'https://www.beautymania.co.il',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

// ─── Beautymania org config ───────────────────────────────────────────────────
const BM_ORG_ID  = '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── GET /api/beautymania/products ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

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
