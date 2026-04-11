/**
 * POST /api/mobile/google-business
 * Принимает Google Maps URL, резолвит Place ID, возвращает превью.
 * Body: { url: string }
 * Response: { place_id, name, rating, reviews_count, address }
 *
 * PUT /api/mobile/google-business
 * Сохраняет подключение (после подтверждения пользователем).
 * Body: { place_id: string }
 *
 * DELETE /api/mobile/google-business
 * Отключает Google Business для орга.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY!

// ── Утилиты ───────────────────────────────────────────────────────────────────

/** Вытащить place_id напрямую из URL если есть */
function extractPlaceIdFromUrl(url: string): string | null {
  const m = url.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  return m?.[1] ?? null
}

/** Вытащить текстовый запрос из Google Maps URL */
function extractQueryFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // /maps/place/NAME/@lat,lng
    const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    // ?q=NAME
    const q = u.searchParams.get('q')
    if (q) return q
    return null
  } catch { return null }
}

/** Получить детали места по place_id */
async function fetchPlaceDetails(placeId: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address&key=${PLACES_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  if (data.status !== 'OK') return null
  const r = data.result
  return {
    place_id:      placeId,
    name:          r.name as string,
    rating:        r.rating as number ?? null,
    reviews_count: r.user_ratings_total as number ?? 0,
    address:       r.formatted_address as string ?? null,
  }
}

/** Найти place_id по текстовому запросу */
async function findPlaceByText(query: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${PLACES_KEY}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  const data = await res.json()
  if (data.status !== 'OK') return null
  return data.candidates?.[0]?.place_id ?? null
}

// ── POST — резолв URL → превью ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    const inputUrl: string = body.url ?? ''
    if (!inputUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

    if (!PLACES_KEY) return NextResponse.json({ error: 'Places API not configured' }, { status: 503 })

    // 1. Пробуем вытащить place_id из URL напрямую
    let placeId = extractPlaceIdFromUrl(inputUrl)

    // 2. Если нет — ищем по названию из URL
    if (!placeId) {
      const query = extractQueryFromUrl(inputUrl)
      if (!query) return NextResponse.json({ error: 'Не удалось распознать ссылку. Попробуйте скопировать её прямо из Google Maps.' }, { status: 400 })
      placeId = await findPlaceByText(query)
    }

    if (!placeId) return NextResponse.json({ error: 'Место не найдено. Проверьте ссылку.' }, { status: 404 })

    const details = await fetchPlaceDetails(placeId)
    if (!details) return NextResponse.json({ error: 'Не удалось получить данные места.' }, { status: 404 })

    return NextResponse.json(details)
  } catch (e) {
    console.error('[google-business POST]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── PUT — сохранить подключение ────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await req.json().catch(() => ({}))
    const placeId: string = body.place_id ?? ''
    if (!placeId) return NextResponse.json({ error: 'place_id required' }, { status: 400 })

    // Получаем актуальные данные перед сохранением
    const details = await fetchPlaceDetails(placeId)
    if (!details) return NextResponse.json({ error: 'Место не найдено' }, { status: 404 })

    const service = createSupabaseServiceClient()
    const { error } = await service
      .from('organizations')
      .update({
        google_place_id:          placeId,
        google_place_name:        details.name,
        google_rating:            details.rating,
        google_reviews_count:     details.reviews_count,
        google_rating_updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (error) {
      console.error('[google-business PUT]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, ...details })
  } catch (e) {
    console.error('[google-business PUT]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── DELETE — отключить ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const service = createSupabaseServiceClient()
    const { error } = await service
      .from('organizations')
      .update({
        google_place_id:          null,
        google_place_name:        null,
        google_rating:            null,
        google_reviews_count:     null,
        google_rating_updated_at: null,
      })
      .eq('id', orgId)

    if (error) {
      console.error('[google-business DELETE]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[google-business DELETE]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
