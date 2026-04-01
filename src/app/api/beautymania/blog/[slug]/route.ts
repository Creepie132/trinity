import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { ratelimitPublic, getClientIp } from '@/lib/ratelimit'

// ─── Tenant isolation ─────────────────────────────────────────────────────────
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

// ─── GET /api/beautymania/blog/[slug] ─────────────────────────────────────────
// Возвращает одну опубликованную статью по slug.
// content_html включён — используется для рендера страницы статьи.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const headers = corsHeaders()

  try {
    try {
      const ip = getClientIp(request)
      const { success } = await ratelimitPublic.limit(`bm-blog-slug:${ip}`)
      if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })
    } catch { /* continue */ }

    const { slug } = await params

    // Валидация slug — только безопасные символы
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400, headers })
    }

    const service = createSupabaseServiceClient()

    // Двойная фильтрация: org_id + published — tenant isolation + visibility
    const { data: post, error } = await service
      .from('blog_posts')
      .select('id, title, slug, cover_image, excerpt, content_html, published_at, created_at')
      .eq('org_id', BM_ORG_ID)
      .eq('published', true)
      .eq('slug', slug)
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404, headers })
    }

    return NextResponse.json(
      { post },
      { headers: { ...headers, 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('[Beautymania Blog Slug] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
