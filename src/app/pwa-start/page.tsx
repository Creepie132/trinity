/**
 * /pwa-start — entry point для PWA приложения.
 *
 * PWA manifest указывает на этот URL как start_url. При тапе на иконку PWA
 * пользователь попадает сюда — и мы редиректим на его предпочтительную
 * главную страницу (user_nav_preferences.default_landing_page).
 *
 * Почему отдельный URL:
 * - /callback срабатывает только после OAuth-обмена кодом, его не хватает
 *   для залогиненного юзера возвращающегося в PWA
 * - /dashboard нельзя редиректить "умно": сломается явный клик по
 *   "Дашборд" в навбаре (будет бесконечный редирект)
 * - /pwa-start чистое место где любой заход — это "дай мне главную"
 *
 * Логика:
 *   1. Нет сессии → /login
 *   2. Сессия есть + есть preference → /{preference}
 *   3. Сессия есть + нет preference → /dashboard
 *   4. Любая ошибка БД → /dashboard (безопасный fallback)
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { pathFromLandingId, DEFAULT_LANDING_PATH } from '@/lib/landing-pages'

// Принудительно динамический — кэшировать редирект нельзя
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PwaStart() {
  const cookieStore = await cookies()

  // Читаем юзера через cookies (тот же механизм что layout.tsx)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              /* server component read-only в некоторых Next.js branches */
            }
          }),
      },
    }
  )

  let userId: string | null = null
  try {
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    userId = null
  }

  // Не залогинен → логин
  if (!userId) {
    redirect('/login')
  }

  // Читаем preference через service-role (обход RLS для быстрого lookup).
  // RLS бы не помешало (auth.uid() = user_id), но service role не требует сессии
  // и работает одинаково быстро.
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let targetPath = DEFAULT_LANDING_PATH
  try {
    const { data } = await service
      .from('user_nav_preferences')
      .select('default_landing_page')
      .eq('user_id', userId)
      .maybeSingle()
    targetPath = pathFromLandingId(data?.default_landing_page)
  } catch {
    // Любая DB-ошибка → fallback /dashboard
    targetPath = DEFAULT_LANDING_PATH
  }

  redirect(targetPath)
}
