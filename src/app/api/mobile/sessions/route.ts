/**
 * GET    /api/mobile/sessions  — список сессий пользователя
 * DELETE /api/mobile/sessions  — завершить все сессии кроме текущей
 *
 * Auth: Bearer токен (обязателен)
 * Таблица: mobile_sessions (upsert by user_id — 1 строка на пользователя)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function currentHash(req: NextRequest): string | null {
  const token = req.headers.get('Authorization')?.slice(7) ?? ''
  return token ? createHash('sha256').update(token).digest('hex') : null
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { user } = auth

    const hash = currentHash(req)
    const service = createSupabaseServiceClient()

    const { data: sessions, error } = await service
      .from('mobile_sessions')
      .select('id, device_name, last_seen_at, created_at, token_hash')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('[mobile/sessions GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const result = (sessions ?? []).map(s => ({
      id:           s.id,
      device_name:  s.device_name ?? 'Неизвестное устройство',
      last_seen_at: s.last_seen_at,
      created_at:   s.created_at,
      is_current:   hash ? s.token_hash === hash : false,
    }))

    return NextResponse.json({ sessions: result })
  } catch (e) {
    console.error('[mobile/sessions GET] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// Обнуляет token_hash у всех других сессий → SessionWatcher делает logout
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { user } = auth

    const hash = currentHash(req)
    if (!hash) return NextResponse.json({ error: 'Bearer token required' }, { status: 400 })

    const service = createSupabaseServiceClient()
    const { error } = await service
      .from('mobile_sessions')
      .update({ token_hash: '' })
      .eq('user_id', user.id)
      .neq('token_hash', hash)

    if (error) {
      console.error('[mobile/sessions DELETE]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[mobile/sessions DELETE] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
