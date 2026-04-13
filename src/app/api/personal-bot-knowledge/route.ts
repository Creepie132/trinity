import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function checkIsAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const service = createSupabaseServiceClient()
    const { data } = await service.from('admin_users').select('id').eq('user_id', user.id).maybeSingle()
    return !!data
  } catch { return false }
}

// GET — список всех записей
export async function GET() {
  if (!await checkIsAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('personal_bot_knowledge')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — создать запись
export async function POST(req: NextRequest) {
  if (!await checkIsAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { category, title, content, is_active, sort_order } = body
  if (!category || !title || !content) {
    return NextResponse.json({ error: 'category, title, content обязательны' }, { status: 400 })
  }
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('personal_bot_knowledge')
    .insert({ category, title, content, is_active: is_active ?? true, sort_order: sort_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — обновить запись
export async function PATCH(req: NextRequest) {
  if (!await checkIsAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('personal_bot_knowledge')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — удалить запись
export async function DELETE(req: NextRequest) {
  if (!await checkIsAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.from('personal_bot_knowledge').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
