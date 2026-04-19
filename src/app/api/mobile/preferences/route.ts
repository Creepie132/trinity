/**
 * GET  /api/mobile/preferences  — получить настройки (навбар + главная страница)
 * PUT  /api/mobile/preferences  — сохранить настройки
 *
 * Auth: Bearer токен (мобайл) или cookie (веб)
 * Хранение: user_nav_preferences (per user_id — настройки личные, не per org)
 *
 * Поля:
 *   nav_tabs            — массив из 3–5 id табов для mobile-нав (см. AVAILABLE_TABS)
 *   default_landing_page — id страницы, открываемой при логине / клике на логотип
 *                          (см. VALID_LANDING_IDS в src/lib/landing-pages.ts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { VALID_LANDING_IDS, DEFAULT_LANDING_ID } from '@/lib/landing-pages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Пул всех доступных разделов mobile-навбара
const AVAILABLE_TABS = [
  { id: 'dashboard',     label_ru: 'Главная',       label_he: 'ראשי' },
  { id: 'clients',       label_ru: 'Клиенты',       label_he: 'לקוחות' },
  { id: 'visits',        label_ru: 'Визиты',        label_he: 'ביקורים' },
  { id: 'notifications', label_ru: 'Уведомления',   label_he: 'התראות' },
  { id: 'kira',          label_ru: 'Чат с Кирой',   label_he: 'צ׳אט עם קירה' },
] as const

const VALID_TAB_IDS = new Set<string>(AVAILABLE_TABS.map((t) => t.id))
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

function validateLandingPage(id: unknown): string | null {
  if (typeof id !== 'string') return 'default_landing_page must be a string'
  if (!VALID_LANDING_IDS.has(id)) return `Unknown landing page: ${id}`
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
      .select('nav_tabs, default_landing_page, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[preferences GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // PGRST116 = not found — новый пользователь, возвращаем дефолты
    const nav_tabs: string[] = data?.nav_tabs ?? ['dashboard', 'clients', 'visits', 'notifications']
    const default_landing_page: string = data?.default_landing_page ?? DEFAULT_LANDING_ID

    return NextResponse.json({
      nav_tabs,
      default_landing_page,
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
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { nav_tabs: rawTabs, default_landing_page: rawLanding } = body as {
      nav_tabs?: unknown
      default_landing_page?: unknown
    }

    // Собираем частичный upsert — клиент может прислать только одно поле
    const updatePayload: Record<string, unknown> = { user_id: user.id }

    if (rawTabs !== undefined) {
      const err = validateTabs(rawTabs)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
      updatePayload.nav_tabs = rawTabs
    }

    if (rawLanding !== undefined) {
      const err = validateLandingPage(rawLanding)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
      updatePayload.default_landing_page = rawLanding
    }

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { error: 'No updatable fields provided (nav_tabs or default_landing_page)' },
        { status: 400 }
      )
    }

    const service = createSupabaseServiceClient()
    const { error } = await service
      .from('user_nav_preferences')
      .upsert(updatePayload, { onConflict: 'user_id' })

    if (error) {
      console.error('[preferences PUT]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // Возвращаем актуальное состояние
    const { data } = await service
      .from('user_nav_preferences')
      .select('nav_tabs, default_landing_page')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      nav_tabs: data?.nav_tabs,
      default_landing_page: data?.default_landing_page,
    })
  } catch (e) {
    console.error('[preferences PUT] unexpected:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
