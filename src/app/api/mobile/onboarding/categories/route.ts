/**
 * GET  /api/mobile/onboarding/categories — список категорий бизнеса
 * POST /api/mobile/onboarding/categories — добавить новую категорию
 *
 * Таблица: business_categories (id uuid, name text, org_id uuid nullable)
 * Если таблицы нет — возвращаем хардкод-список и логируем.
 * Auth: Bearer token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Дефолтный список если таблицы нет
const DEFAULT_CATEGORIES = [
  { id: 'salon',      name: 'Салон красоты' },
  { id: 'barber',     name: 'Барбершоп' },
  { id: 'clinic',     name: 'Клиника' },
  { id: 'spa',        name: 'СПА' },
  { id: 'nails',      name: 'Ногтевой сервис' },
  { id: 'tattoo',     name: 'Тату / пирсинг' },
  { id: 'massage',    name: 'Массаж' },
  { id: 'carwash',    name: 'Автомойка' },
  { id: 'fitness',    name: 'Фитнес / спорт' },
  { id: 'dental',     name: 'Стоматология' },
  { id: 'vet',        name: 'Ветеринария' },
  { id: 'legal',      name: 'Юридические услуги' },
  { id: 'realty',     name: 'Недвижимость' },
  { id: 'education',  name: 'Обучение' },
  { id: 'other',      name: 'Другое' },
]

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const service = createSupabaseServiceClient()

    const { data, error } = await service
      .from('business_categories')
      .select('id, name')
      .order('name', { ascending: true })
      .limit(100)

    if (error) {
      // Таблица ещё не создана — возвращаем хардкод
      console.warn('[onboarding/categories] table missing, using defaults:', error.message)
      return NextResponse.json(DEFAULT_CATEGORIES)
    }

    return NextResponse.json(data ?? DEFAULT_CATEGORIES)
  } catch (e: any) {
    console.error('[onboarding/categories GET]', e)
    return NextResponse.json(DEFAULT_CATEGORIES)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const { name } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name обязателен' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    const { data, error } = await service
      .from('business_categories')
      .insert({ name: name.trim(), org_id: orgId })
      .select('id, name')
      .single()

    if (error) {
      console.error('[onboarding/categories POST]', error)
      // Если таблицы нет — возвращаем временный UUID чтобы не блокировать флоу
      return NextResponse.json({ id: `custom-${Date.now()}`, name: name.trim() })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    console.error('[onboarding/categories POST]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
