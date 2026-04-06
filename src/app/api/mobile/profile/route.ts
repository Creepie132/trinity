/**
 * GET  /api/mobile/profile  — получить тему пользователя
 * PATCH /api/mobile/profile — обновить тему пользователя
 *
 * Auth: Bearer токен (mobile) или cookie (web)
 * Storage: profiles.theme per user_id
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_THEMES = ['command_center', 'editorial_luxury', 'neon_industrial', 'warm_organic'] as const
type ValidTheme = typeof VALID_THEMES[number]

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('theme')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[profile GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ theme: data?.theme ?? 'command_center' })
  } catch (e) {
    console.error('[profile GET] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { user } = auth

    let body: { theme?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.theme || !(VALID_THEMES as readonly string[]).includes(body.theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase
      .from('profiles')
      .update({ theme: body.theme })
      .eq('user_id', user.id)

    if (error) {
      console.error('[profile PATCH]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[profile PATCH] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
