import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/cleanup-tokens
 *
 * Удаляет истёкшие client_edit_tokens (expires_at < now() - 1h).
 * Запускается ежедневно в 03:00 UTC через Vercel Cron.
 * pg_cron делает то же самое — это резервный маршрут.
 *
 * Grace period 1 час: не удаляем только-что-истёкшие токены,
 * на случай если клиент открыл форму в последний момент.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString() // now - 1h

  const { data, error } = await supabase
    .from('client_edit_tokens')
    .delete()
    .lt('expires_at', cutoff)
    .select('id')

  if (error) {
    console.error('[cron/cleanup-tokens] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deleted = data?.length ?? 0
  console.log(`[cron/cleanup-tokens] deleted ${deleted} expired tokens`)

  return NextResponse.json({ success: true, deleted })
}
