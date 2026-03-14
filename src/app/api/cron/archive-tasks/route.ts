import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/archive-tasks
 *
 * Архивирует completed/cancelled задачи старше 7 дней.
 * Запускается каждое воскресенье в 03:00 UTC через Vercel Cron
 * (дублирует pg_cron на случай сбоя).
 *
 * Vercel cron.json:
 * { "path": "/api/cron/archive-tasks", "schedule": "0 3 * * 0" }
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

  const { data, error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .in('status', ['completed', 'cancelled'])
    .is('archived_at', null)
    .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .select('id')

  if (error) {
    console.error('[cron/archive-tasks] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const archived = data?.length ?? 0
  console.log(`[cron/archive-tasks] archived ${archived} tasks`)

  return NextResponse.json({ success: true, archived })
}
