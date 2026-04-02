import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 365)

  const db = createSupabaseServiceClient()

  // Параллельно запрашиваем все 3 RPC
  const [statsRes, byDayRes, googleRes] = await Promise.all([
    db.rpc('get_traffic_stats', { days_back: days }),
    db.rpc('get_traffic_by_day', { days_back: days }),
    db.rpc('get_google_conversion_report', { days_back: days }),
  ])

  if (statsRes.error) {
    return NextResponse.json({ error: statsRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    bySource:       statsRes.data  ?? [],
    byDay:          byDayRes.data  ?? [],
    googleReport:   googleRes.data?.[0] ?? null,
    days,
    generatedAt:    new Date().toISOString(),
  })
}
