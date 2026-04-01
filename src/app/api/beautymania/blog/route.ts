import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

// ─── Tenant isolation — жёстко захардкожен, не берётся из запроса ────────────
const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── CORS ────────────────────────────────────────────────────────────────────
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

// ─── GET /api/beautymania/blog?limit=10&offset=0 ─────────────────────────────
// Возвращает только опубликованные статьи (published = true).
// content_html не включается в список — только в детальном роуте /[slug].
export async function GET(request: NextRequest) {
  const headers = corsHeaders()

  try {
    // Rate limit
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-blog:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* ratelimit unavailable — продолжаем */ }

    const { searchParams } = new URL(request.url)
    const limit  = Math.min(Math.max(parseInt(searchParams.get('limit')  ?? '10'), 1), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)

    const service = createSupabaseServiceClient()

    // Запрос строго по BM_ORG_ID — tenant isolation
    const { data: posts, error, count } = await service
      .from('blog_posts')
      .select('id, title, slug, cover_image, excerpt, published_at, created_at', { count: 'exact' })
      .eq('org_id', BM_ORG_ID)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Beautymania Blog] DB error:', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500, headers })
    }

    return NextResponse.json(
      { posts: posts ?? [], total: count ?? 0, limit, offset },
      { headers: { ...headers, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[Beautymania Blog] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
