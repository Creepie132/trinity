import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

// ─── CORS — публичный read-only endpoint для сайта ───────────────────────────
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

const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── GET /api/beautymania/bestsellers ────────────────────────────────────────
// Возвращает активные слоты карусели с данными товаров
export async function GET(request: NextRequest) {
  const headers = corsHeaders()

  try {
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-bestsellers:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* ratelimit unavailable */ }

    const service = createSupabaseServiceClient()

    const { data, error } = await service
      .from('site_bestsellers')
      .select(`
        id,
        position,
        custom_title,
        custom_subtitle,
        image_url,
        product:product_id (
          id,
          name,
          description,
          sell_price,
          image_url,
          category
        )
      `)
      .eq('org_id', BM_ORG_ID)
      .eq('is_active', true)
      .not('product_id', 'is', null)
      .order('position', { ascending: true })

    if (error) {
      console.error('[Beautymania Bestsellers] DB error:', error)
      return NextResponse.json({ error: 'Failed to load bestsellers' }, { status: 500, headers })
    }

    // Нормализуем: custom_title/image_url перекрывают данные товара
    const bestsellers = (data ?? []).map((row) => {
      const p = row.product as Record<string, unknown> | null
      return {
        position:    row.position,
        slot_id:     row.id,
        title:       row.custom_title    ?? (p?.name as string)      ?? null,
        subtitle:    row.custom_subtitle ?? (p?.category as string)  ?? null,
        image_url:   row.image_url       ?? (p?.image_url as string) ?? null,
        price:       p?.sell_price                                   ?? null,
        product_id:  p?.id                                           ?? null,
      }
    })

    return NextResponse.json(
      { bestsellers },
      {
        headers: {
          ...headers,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error('[Beautymania Bestsellers] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
