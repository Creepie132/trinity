/**
 * POST /api/mobile/onboarding/hours
 * Сохранить рабочее расписание (Шаг 4 онбординга).
 * Auth: Bearer token.
 *
 * Body:
 *   schedule: Array<{
 *     day_of_week: 0-6,      // 0=Вс, 6=Сб
 *     is_working:  boolean,
 *     open_time?:  'HH:MM',
 *     close_time?: 'HH:MM',
 *     breaks?:     Array<{ from: 'HH:MM', to: 'HH:MM' }>
 *   }>
 *
 * Хранение: organizations.features.working_hours
 * Returns: { ok: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RE_TIME = /^\d{2}:\d{2}$/

function validateTime(t: unknown, field: string): string | null {
  if (!t || typeof t !== 'string' || !RE_TIME.test(t)) {
    return `${field} должен быть в формате HH:MM`
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json()
    const schedule = body?.schedule

    if (!Array.isArray(schedule) || schedule.length === 0) {
      return NextResponse.json({ error: 'schedule[] обязателен' }, { status: 400 })
    }

    // Валидация каждого дня
    const normalized: Array<Record<string, unknown>> = []
    for (const day of schedule) {
      const dow = parseInt(day.day_of_week)
      if (isNaN(dow) || dow < 0 || dow > 6) {
        return NextResponse.json({ error: `day_of_week должен быть 0-6, получено: ${day.day_of_week}` }, { status: 400 })
      }

      const entry: Record<string, unknown> = {
        day_of_week: dow,
        is_working:  Boolean(day.is_working),
      }

      if (day.is_working) {
        const errOpen  = validateTime(day.open_time,  'open_time')
        const errClose = validateTime(day.close_time, 'close_time')
        if (errOpen)  return NextResponse.json({ error: errOpen },  { status: 400 })
        if (errClose) return NextResponse.json({ error: errClose }, { status: 400 })

        entry.open_time  = day.open_time
        entry.close_time = day.close_time
        entry.breaks     = []

        for (const brk of (day.breaks ?? [])) {
          const errFrom = validateTime(brk.from, 'break.from')
          const errTo   = validateTime(brk.to,   'break.to')
          if (errFrom) return NextResponse.json({ error: errFrom }, { status: 400 })
          if (errTo)   return NextResponse.json({ error: errTo },   { status: 400 })
          ;(entry.breaks as Array<Record<string, string>>).push({ from: brk.from, to: brk.to })
        }
      }

      normalized.push(entry)
    }

    const service = createSupabaseServiceClient()

    // Читаем текущие features чтобы не затереть другие поля
    const { data: org, error: fetchErr } = await service
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const features = (org?.features as Record<string, unknown>) ?? {}
    const updatedFeatures = {
      ...features,
      working_hours: normalized,
    }

    const { error: updateErr } = await service
      .from('organizations')
      .update({ features: updatedFeatures })
      .eq('id', orgId)

    if (updateErr) {
      console.error('[onboarding/hours]', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[onboarding/hours]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
