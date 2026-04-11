/**
 * GET /api/cron/google-rating
 * Обновляет Google рейтинг для всех организаций с подключённым place_id.
 * Запускается раз в сутки через Vercel Cron.
 * Защита: заголовок Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PLACES_KEY  = process.env.GOOGLE_PLACES_API_KEY!
const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function GET(req: NextRequest) {
  // Проверка авторизации
  const auth = req.headers.get('authorization') ?? ''
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!PLACES_KEY) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set' }, { status: 503 })
  }

  const service = createSupabaseServiceClient()

  // Берём все орги с place_id
  const { data: orgs, error } = await service
    .from('organizations')
    .select('id, google_place_id')
    .not('google_place_id', 'is', null)

  if (error) {
    console.error('[cron/google-rating]', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!orgs?.length) return NextResponse.json({ ok: true, updated: 0 })

  let updated = 0
  let failed  = 0

  for (const org of orgs) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${org.google_place_id}&fields=rating,user_ratings_total&key=${PLACES_KEY}`
      const res  = await fetch(url)
      const data = await res.json()

      if (data.status !== 'OK') { failed++; continue }

      await service
        .from('organizations')
        .update({
          google_rating:            data.result?.rating ?? null,
          google_reviews_count:     data.result?.user_ratings_total ?? 0,
          google_rating_updated_at: new Date().toISOString(),
        })
        .eq('id', org.id)

      updated++
    } catch (e) {
      console.error(`[cron/google-rating] org ${org.id}:`, e)
      failed++
    }
  }

  console.log(`[cron/google-rating] updated=${updated} failed=${failed}`)
  return NextResponse.json({ ok: true, updated, failed })
}
