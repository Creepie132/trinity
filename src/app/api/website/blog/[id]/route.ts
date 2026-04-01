import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── Security: все операции проверяют и org_id из сессии И id из URL ─────────
// Даже если пользователь угадает чужой post.id — фильтр по org_id не пропустит.

// ─── PATCH /api/website/blog/[id] ────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId: activeOrgId } = auth

    const { id } = await params
    const body = await request.json()

    // Запрещаем клиенту менять org_id через тело запроса
    const { org_id: _ignored, id: _id, created_at: _ca, ...safeFields } = body

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('blog_posts')
      .update({ ...safeFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', activeOrgId)   // ← двойной фильтр: id + org_id
      .select()
      .single()

    if (error) {
      console.error('[website/blog PATCH]', error)
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[website/blog PATCH]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ─── DELETE /api/website/blog/[id] ───────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId: activeOrgId } = auth

    const { id } = await params
    const service = createSupabaseServiceClient()

    const { error, count } = await service
      .from('blog_posts')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('org_id', activeOrgId)   // ← tenant isolation: нельзя удалить чужую статью

    if (error) {
      console.error('[website/blog DELETE]', error)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }
    if (count === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[website/blog DELETE]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
