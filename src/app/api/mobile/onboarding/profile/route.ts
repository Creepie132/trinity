/**
 * PATCH /api/mobile/onboarding/profile
 * Обновить профиль организации (Шаг 1 онбординга).
 * Auth: Bearer token.
 *
 * Body:
 *   org_name:    string   — название компании
 *   owner_first: string   — имя владельца
 *   owner_last:  string   — фамилия владельца
 *   phone:       string   — мобильный телефон
 *   phone_fixed: string?  — стационарный (опционально)
 *   company_id:  string   — ת.ז./ח.פ. (9 цифр)
 *   logo_url:    string?  — URL логотипа после загрузки
 *   category_id: string?  — ID категории бизнеса
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Валидация израильских телефонов
const RE_MOBILE  = /^0(5[0-9])\d{7}$/
const RE_FIXED   = /^0[2-4679]\d{7}$/
const RE_COMPANY = /^\d{9}$/

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json()
    const {
      org_name,
      owner_first,
      owner_last,
      phone,
      phone_fixed,
      company_id,
      logo_url,
      category_id,
    } = body as Record<string, string | undefined>

    // ── Валидация ──────────────────────────────────────────────────────────
    if (!org_name?.trim())   return NextResponse.json({ error: 'org_name обязателен' },   { status: 400 })
    if (!owner_first?.trim()) return NextResponse.json({ error: 'owner_first обязателен' }, { status: 400 })
    if (!owner_last?.trim()) return NextResponse.json({ error: 'owner_last обязателен' },  { status: 400 })
    if (!phone?.trim() || !RE_MOBILE.test(phone.trim())) {
      return NextResponse.json({ error: 'Неверный формат мобильного телефона' }, { status: 400 })
    }
    if (phone_fixed?.trim() && !RE_FIXED.test(phone_fixed.trim())) {
      return NextResponse.json({ error: 'Неверный формат стационарного телефона' }, { status: 400 })
    }
    if (!company_id?.trim() || !RE_COMPANY.test(company_id.trim())) {
      return NextResponse.json({ error: 'ת.ז./ח.פ. должен содержать ровно 9 цифр' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // ── Обновляем organizations ────────────────────────────────────────────
    // Поля хранятся в features JSONB (расширяемо без ALTER TABLE)
    // + обновляем name и phone верхнего уровня
    const { data: org, error: fetchErr } = await service
      .from('organizations')
      .select('features')
      .eq('id', orgId)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const currentFeatures = (org?.features as Record<string, unknown>) ?? {}
    const updatedFeatures = {
      ...currentFeatures,
      onboarding: {
        ...(currentFeatures.onboarding as Record<string, unknown> ?? {}),
        owner_first:  owner_first.trim(),
        owner_last:   owner_last.trim(),
        phone_fixed:  phone_fixed?.trim() ?? '',
        company_id:   company_id.trim(),
        ...(logo_url    ? { logo_url }    : {}),
        ...(category_id ? { category_id } : {}),
      },
    }

    const { error: updateErr } = await service
      .from('organizations')
      .update({
        name:     org_name.trim(),
        phone:    phone.trim(),
        features: updatedFeatures,
        ...(logo_url ? { logo_url } : {}),
      })
      .eq('id', orgId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[onboarding/profile]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
