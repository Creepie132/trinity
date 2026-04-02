import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// Edge runtime — минимальная задержка, не блокирует основной поток
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_type, source, referrer, path } = body

    // Валидация входящих данных
    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const allowedEvents = ['view', 'demo_click', 'pricing_click', 'wa_click', 'register_start']
    if (!allowedEvents.includes(event_type)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent') || ''
    const detectedSource = detectSource(referrer || '', source || '')

    const supabase = createSupabaseServiceClient()
    await supabase.from('traffic_events').insert({
      event_type,
      source: detectedSource,
      referrer: referrer ? referrer.slice(0, 2048) : null,
      path: (path || '/').slice(0, 512),
      user_agent: userAgent.slice(0, 512),
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Трекинг никогда не ломает UI — всегда возвращаем ok
    return NextResponse.json({ ok: true })
  }
}

function detectSource(referrer: string, clientSource: string): string {
  if (clientSource && clientSource !== 'direct') return clientSource
  if (!referrer) return 'direct'
  try {
    const host = new URL(referrer).hostname.toLowerCase()
    if (host.includes('google'))    return 'google'
    if (host.includes('yandex'))    return 'yandex'
    if (host.includes('facebook') || host.includes('fb.com')) return 'facebook'
    if (host.includes('instagram')) return 'instagram'
    if (host.includes('whatsapp')) return 'whatsapp'
    if (host.includes('t.me') || host.includes('telegram')) return 'telegram'
    if (host.includes('linkedin')) return 'linkedin'
    if (host.includes('tiktok'))   return 'tiktok'
    return 'referral'
  } catch {
    return 'direct'
  }
}
