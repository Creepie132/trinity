import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { z } from 'zod'

const BM_ORG_ID = process.env.BEAUTYMANIA_ORG_ID ?? '1e77c781-3848-4b16-a623-693de123c6bc'

// ─── Validation ───────────────────────────────────────────────────────────────
const SlotSchema = z.object({
  position:       z.number().int().min(1).max(5),
  product_id:     z.string().uuid().nullable(),
  custom_title:   z.string().max(120).nullable().optional(),
  custom_subtitle: z.string().max(120).nullable().optional(),
  image_url:      z.string().url().nullable().optional(),
  is_active:      z.boolean().optional(),
})

const PutSchema = z.object({
  slots: z.array(SlotSchema).min(1).max(5),
})

// ─── GET /api/beautymania/admin/bestsellers ───────────────────────────────────
// Возвращает все 5 слотов (включая пустые и неактивные) для редактора Trinity
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  // Только Beautymania org
  if (auth.orgId !== BM_ORG_ID) {
    return NextResponse.json({ error: 'Not authorized for this org' }, { status: 403 })
  }

  const service = createSupabaseServiceClient()

  const { data, error } = await service
    .from('site_bestsellers')
    .select(`
      id,
      position,
      product_id,
      custom_title,
      custom_subtitle,
      image_url,
      is_active,
      updated_at,
      product:product_id (
        id,
        name,
        sell_price,
        image_url,
        category
      )
    `)
    .eq('org_id', BM_ORG_ID)
    .order('position', { ascending: true })

  if (error) {
    console.error('[Admin Bestsellers GET] DB error:', error)
    return NextResponse.json({ error: 'Failed to load bestsellers' }, { status: 500 })
  }

  return NextResponse.json({ slots: data ?? [] })
}

// ─── PUT /api/beautymania/admin/bestsellers ───────────────────────────────────
// Сохраняет состояние всех слотов (upsert по position)
export async function PUT(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error

  if (auth.orgId !== BM_ORG_ID) {
    return NextResponse.json({ error: 'Not authorized for this org' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 })
  }

  const service = createSupabaseServiceClient()

  const upsertData = parsed.data.slots.map((slot) => ({
    org_id:          BM_ORG_ID,
    position:        slot.position,
    product_id:      slot.product_id,
    custom_title:    slot.custom_title    ?? null,
    custom_subtitle: slot.custom_subtitle ?? null,
    image_url:       slot.image_url       ?? null,
    is_active:       slot.is_active       ?? true,
    updated_at:      new Date().toISOString(),
  }))

  const { error } = await service
    .from('site_bestsellers')
    .upsert(upsertData, { onConflict: 'org_id,position' })

  if (error) {
    console.error('[Admin Bestsellers PUT] DB error:', error)
    return NextResponse.json({ error: 'Failed to save bestsellers' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
