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
 * setLocaleCookie — записывает trinity_locale cookie (1 год).
 * Вызывается при смене языка — даёт SSR читать язык без DB запроса.
 */
export async function setLocaleCookie(locale: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('trinity_locale', locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 год
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

/**
 * getUserPreferences — читает предпочтения при старте сессии.
 * Используется в Server Components (layout.tsx).
 *
 * Impersonation: если суперадмин вошёл «как пользователь» (кука impersonate_org_id),
 * возвращаем язык/тему целевой организации, а НЕ профиль суперадмина.
 * Иначе язык всегда будет русский (язык суперадмина), даже у ивритоязычных клиентов.
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const cookieStore = await cookies()

  // Проверяем impersonation mode
  const impersonateOrgId = cookieStore.get('impersonate_org_id')?.value
  if (impersonateOrgId) {
    // Читаем настройки владельца (owner) импersonated организации
    const { data } = await service
      .from('org_users')
      .select('theme, preferred_language')
      .eq('org_id', impersonateOrgId)
      .eq('role', 'owner')
      .maybeSingle()

    return {
      theme:              data?.theme              ?? 'midnight',
      preferred_language: data?.preferred_language ?? 'he',
    }
  }

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
