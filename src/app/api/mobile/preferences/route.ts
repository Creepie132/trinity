/**
 * GET  /api/mobile/preferences  — получить настройки навбара
 * PUT  /api/mobile/preferences  — сохранить настройки навбара
 *
 * Auth: Bearer токен (мобайл) или cookie (веб)
 * Хранение: user_nav_preferences (per user_id — настройки личные, не per org)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Пул всех доступных разделов
const AVAILABLE_TABS = [
  { id: 'dashboard',     label_ru: 'Главная',       label_he: 'ראשי' },
  { id: 'clients',       label_ru: 'Клиенты',       label_he: 'לקוחות' },
  { id: 'visits',        label_ru: 'Визиты',        label_he: 'ביקורים' },
  { id: 'notifications', label_ru: 'Уведомления',   label_he: 'התראות' },
  { id: 'kira',          label_ru: 'Чат с Кирой',   label_he: 'צ׳אט עם קירה' },
] as const

type TabId = typeof AVAILABLE_TABS[number]['id']
const VALID_TAB_IDS = new Set<string>(AVAILABLE_TABS.map(t => t.id))
const MIN_TABS = 3
const MAX_TABS = 5

/** Возвращает строку ошибки или null если всё ок */
function validateTabs(tabs: unknown): string | null {
  if (!Array.isArray(tabs)) return 'nav_tabs must be an array'
  if (tabs.length < MIN_TABS) return `Minimum ${MIN_TABS} tabs required`
  if (tabs.length > MAX_TABS) return `Maximum ${MAX_TABS} tabs allowed`
  for (const t of tabs) {
    if (typeof t !== 'string' || !VALID_TAB_IDS.has(t)) return `Unknown tab: ${t}`
  }
  if (new Set(tabs).size !== tabs.length) return 'Duplicate tabs not allowed'
  return null
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('user_nav_preferences')
      .select('nav_tabs, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[preferences GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // PGRST116 = not found — новый пользователь, возвращаем дефолт
    const nav_tabs: string[] = data?.nav_tabs ?? ['dashboard', 'clients', 'visits', 'notifications']

    return NextResponse.json({
      nav_tabs,
      available_tabs: AVAILABLE_TABS,
      updated_at: data?.updated_at ?? null,
    })
  } catch (e) {
    console.error('[preferences GET] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user } = auth

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { nav_tabs: rawTabs } = body as { nav_tabs?: unknown }
    const validationError = validateTabs(rawTabs)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const validTabs = rawTabs as string[]

    const service = createSupabaseServiceClient()
    const { error } = await service
      .from('user_nav_preferences')
      .upsert(
        { user_id: user.id, nav_tabs: validTabs },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('[preferences PUT]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, nav_tabs: validTabs })
  } catch (e) {
    console.error('[preferences PUT] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
