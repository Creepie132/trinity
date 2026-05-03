import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/invalidate
 *
 * Инвалидирует billing-кэш (trinity_sub_ok cookie) для текущего пользователя.
 * Вызывается клиентом после того как Supabase Realtime уведомил об изменении статуса.
 * Middleware при следующем запросе сделает свежий запрос к БД.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.delete('trinity_sub_ok')
    return response
  } catch (err) {
    console.error('[billing/invalidate] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
