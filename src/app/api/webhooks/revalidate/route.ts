import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

/**
 * POST /api/webhooks/revalidate
 *
 * Принимает POST от Trinity CRM (Server Action) когда настройки сайта обновились.
 * Инвалидирует кэш Next.js на стороне Beautymania.
 *
 * Защита: проверяем секретный заголовок x-revalidate-secret.
 * Env: REVALIDATE_SECRET (должен совпадать с BM_REVALIDATE_SECRET в Trinity).
 */

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? ''

export async function POST(request: NextRequest) {
  // ─── Auth: проверяем секрет ────────────────────────────────────────────────
  const incomingSecret = request.headers.get('x-revalidate-secret')
  if (!REVALIDATE_SECRET || incomingSecret !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const tag: string = body?.tag ?? 'website-settings'

    // Инвалидируем корень + /api/beautymania/settings — кэш обновится при следующем запросе
    revalidatePath('/', 'layout')
    revalidatePath('/api/beautymania/settings', 'page')

    console.log(`[revalidate] Paths revalidated at ${new Date().toISOString()}`)

    return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
  } catch (err) {
    console.error('[revalidate] Error:', err)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
