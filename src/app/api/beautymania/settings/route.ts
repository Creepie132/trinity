import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── CORS — публичный read-only endpoint ──────────────────────────────────────
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

// ─── Beautymania org — hardcoded, не принимаем из запроса ────────────────────
const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── GET /api/beautymania/settings ────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const headers = corsHeaders()
  try {
    const service = createSupabaseServiceClient()

    const { data, error } = await service
      .from('website_settings')
      .select('hero_title, hero_subtitle, hero_image_url, seo_description, social_links, updated_at')
      .eq('org_id', BM_ORG_ID)
      .maybeSingle()

    if (error) {
      console.error('[beautymania/settings] DB error:', error)
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500, headers })
    }

    return NextResponse.json(
      { settings: data ?? {} },
      {
        headers: {
          ...headers,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (err) {
    console.error('[beautymania/settings] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
