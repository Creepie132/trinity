/**
 * POST /api/mobile/onboarding/services
 * Пакетный INSERT базовых услуг (Шаг 2 онбординга).
 * Auth: Bearer token.
 *
 * Body: { services: Array<{ name, duration_minutes, price }> }
 * Returns: { ok: true, inserted: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_SERVICES = 10

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json()
    const services = body?.services

    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'services[] обязателен и не может быть пустым' }, { status: 400 })
    }
    if (services.length > MAX_SERVICES) {
      return NextResponse.json({ error: `Максимум ${MAX_SERVICES} услуг` }, { status: 400 })
    }

    // Валидация и нормализация каждой услуги
    const rows: Array<Record<string, unknown>> = []
    let rowErr: NextResponse | null = null
    services.forEach((s: Record<string, unknown>, i: number) => {
      if (rowErr) return
      const name     = String(s.name ?? '').trim()
      const duration = parseInt(String(s.duration_minutes ?? s.duration ?? 0))
      const price    = parseFloat(String(s.price ?? 0))

      if (!name) {
        rowErr = NextResponse.json({ error: `Услуга #${i + 1}: name обязателен` }, { status: 400 })
        return
      }
      if (isNaN(duration) || duration < 1) {
        rowErr = NextResponse.json({ error: `Услуга #${i + 1}: duration_minutes должен быть > 0` }, { status: 400 })
        return
      }
      if (isNaN(price) || price < 0) {
        rowErr = NextResponse.json({ error: `Услуга #${i + 1}: price должен быть >= 0` }, { status: 400 })
        return
      }

      rows.push({
        org_id:           orgId,
        name:             name,
        name_ru:          name,
        price:            price,
        duration_minutes: duration,
        is_active:        true,
      })
    })
    if (rowErr) return rowErr

    const service = createSupabaseServiceClient()
    const { error } = await service.from('services').insert(rows)

    if (error) {
      console.error('[onboarding/services]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted: rows.length })
  } catch (e: any) {
    console.error('[onboarding/services]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
