/**
 * GET /api/mobile/services — список услуг организации
 * POST /api/mobile/services — создать новую услугу
 *
 * Auth: Bearer token (mobile)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── GET /api/mobile/services ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? ''

    const supabase = createSupabaseServiceClient()
    let query = supabase
      .from('services')
      .select('id, name, name_ru, price, duration_minutes, is_active')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(50)

    if (search.trim()) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Нормализуем поля для мобильного клиента
    const services = (data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name_ru || s.name,
      name_ru: s.name_ru,
      price: s.price ?? 0,
      duration: s.duration_minutes ?? 0,
    }))

    return NextResponse.json(services)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST /api/mobile/services ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json()
    const { name, price, duration } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name обязателен' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('services')
      .insert({
        org_id: orgId,
        name: name.trim(),
        name_ru: name.trim(),
        price: parseFloat(price ?? 0),
        duration_minutes: parseInt(duration ?? 0),
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      id: data.id,
      name: data.name_ru || data.name,
      price: data.price ?? 0,
      duration: data.duration_minutes ?? 0,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
