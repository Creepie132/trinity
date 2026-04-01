import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── GET /api/website/blog ────────────────────────────────────────────────────
// Возвращает ВСЕ статьи (published + drafts) для текущего арендатора.
// org_id берётся СТРОГО из сессии — клиент не может подменить.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId: activeOrgId } = auth

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('blog_posts')
      .select('*')
      .eq('org_id', activeOrgId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[website/blog GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[website/blog GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── POST /api/website/blog ───────────────────────────────────────────────────
// Создаёт новую статью. org_id берётся из сессии — НИКОГДА из тела запроса.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId: activeOrgId } = auth

    const body = await request.json()
    const { title, slug, cover_image, excerpt, content_html, published, published_at } = body

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
    }

    // Slug uniqueness check within this org
    const service = createSupabaseServiceClient()
    const { data: existing } = await service
      .from('blog_posts')
      .select('id')
      .eq('org_id', activeOrgId)
      .eq('slug', slug.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    const { data, error } = await service
      .from('blog_posts')
      .insert({
        org_id: activeOrgId,        // ← принудительно из сессии
        title: title.trim(),
        slug: slug.trim(),
        cover_image: cover_image ?? null,
        excerpt: excerpt ?? null,
        content_html: content_html ?? '',
        published: published ?? false,
        published_at: published_at ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('[website/blog POST]', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[website/blog POST]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
