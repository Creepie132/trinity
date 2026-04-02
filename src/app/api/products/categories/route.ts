// ================================================
// TRINITY CRM - Product Categories API
// GET:  List categories for current org (seeding defaults on first call)
// POST: Create custom category
// ================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ── Default categories seeded per org on first call ──────────────────────────
const DEFAULT_CATEGORIES = [
  { value: 'beauty',    label_ru: 'Красота',      label_he: 'יופי',      sort_order: 10 },
  { value: 'hair',      label_ru: 'Волосы',       label_he: 'שיער',      sort_order: 20 },
  { value: 'body',      label_ru: 'Тело',         label_he: 'גוף',       sort_order: 30 },
  { value: 'nails',     label_ru: 'Ногти',        label_he: 'ציפורניים', sort_order: 40 },
  { value: 'equipment', label_ru: 'Оборудование', label_he: 'ציוד',      sort_order: 50 },
  { value: 'other',     label_ru: 'Прочее',       label_he: 'אחר',       sort_order: 999 },
]

/**
 * GET /api/products/categories
 * Returns categories for current org.
 * Seeds defaults on first call (idempotent via ON CONFLICT DO NOTHING).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()

    // Seed defaults idempotently — upsert with onConflict keeps existing rows intact
    await service.from('product_categories').upsert(
      DEFAULT_CATEGORIES.map(c => ({
        org_id:     orgId,
        value:      c.value,
        label_ru:   c.label_ru,
        label_he:   c.label_he,
        is_default: true,
        sort_order: c.sort_order,
      })),
      { onConflict: 'org_id,value', ignoreDuplicates: true }
    )

    const { data: categories, error } = await service
      .from('product_categories')
      .select('id, value, label_ru, label_he, is_default, sort_order')
      .eq('org_id', orgId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[API] GET /api/products/categories error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: categories ?? [] })
  } catch (err) {
    console.error('[API] GET /api/products/categories exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/products/categories
 * Create custom category for current org.
 * Body: { label_ru: string, label_he?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId, orgRole } = auth

    if (!['owner', 'admin', 'manager'].includes(orgRole ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const labelRu: string = (body.label_ru ?? '').trim()
    if (!labelRu || labelRu.length < 1 || labelRu.length > 50) {
      return NextResponse.json({ error: 'label_ru is required (1–50 chars)' }, { status: 400 })
    }

    const value = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const labelHe: string = (body.label_he ?? labelRu).trim()

    const service = createSupabaseServiceClient()

    const { data: category, error } = await service
      .from('product_categories')
      .insert({
        org_id:     orgId,
        value,
        label_ru:   labelRu,
        label_he:   labelHe,
        is_default: false,
        sort_order: 500,
      })
      .select('id, value, label_ru, label_he, is_default, sort_order')
      .single()

    if (error) {
      console.error('[API] POST /api/products/categories error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (err) {
    console.error('[API] POST /api/products/categories exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
