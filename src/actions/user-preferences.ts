'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export interface UserPreferences {
  theme?: string
  preferred_language?: string
}

/**
 * updateUserPreferences — сохраняет тему и язык в org_users.
 * Вызывается из ThemeContext и LanguageContext (optimistic UI).
 */
export async function updateUserPreferences(prefs: UserPreferences): Promise<{ error?: string }> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { error: 'Unauthorized' }

  const update: Record<string, string> = {}
  if (prefs.theme)             update.theme              = prefs.theme
  if (prefs.preferred_language) update.preferred_language = prefs.preferred_language
  if (Object.keys(update).length === 0) return {}

  const { error } = await service
    .from('org_users')
    .update(update)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  return {}
}

/**
 * getUserPreferences — читает предпочтения при старте сессии.
 * Используется в Server Components (layout.tsx).
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const userId = await getAuthenticatedUserId()
  if (!userId) return {}

  const { data } = await service
    .from('org_users')
    .select('theme, preferred_language')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    theme:              data?.theme              ?? 'midnight',
    preferred_language: data?.preferred_language ?? 'ru',
  }
}
