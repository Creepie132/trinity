'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  COOKIE_ORG_ID,
  COOKIE_ORG_NAME,
  IMPERSONATE_COOKIE_OPTIONS,
} from '@/lib/impersonation-cookies'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SUPER_ADMINS = ['ambersolutions.systems@gmail.com', 'creepie1357@gmail.com']

/**
 * startImpersonation — устанавливает HttpOnly куки.
 * НЕ меняет сессию Supabase и НЕ меняет user_active_branch в БД.
 *
 * ВАЖНО: service.auth.getUser(token) работает только с anon ключом,
 * но для запросов к БД нам нужен service role — используем два клиента.
 */
export async function startImpersonation(orgId: string, adminToken: string): Promise<{ error?: string }> {
  // Верифицируем токен через anon клиент (service role не умеет getUser)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(adminToken)
  if (authErr || !user) return { error: 'Unauthorized' }
  if (!SUPER_ADMINS.includes(user.email || '')) return { error: 'Forbidden' }

  // Запрос к БД — через service role (обходит RLS)
  const { data: org, error: orgErr } = await service
    .from('organizations')
    .select('id, name, display_name')
    .eq('id', orgId)
    .single()

  if (orgErr || !org) {
    console.error('[startImpersonation] Org not found:', { orgId, orgErr: orgErr?.message })
    return { error: 'Org not found: ' + (orgErr?.message || 'no data') }
  }

  const orgName = (org.display_name || org.name) as string

  try {
    await service.from('audit_log').insert({
      org_id: orgId, user_email: user.email, user_id: user.id,
      action: 'impersonation_start', entity_type: 'impersonation',
      metadata: { org_name: orgName, method: 'safe_cookie' },
    })
  } catch { /* некритично */ }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_ORG_ID,   orgId,   IMPERSONATE_COOKIE_OPTIONS)
  cookieStore.set(COOKIE_ORG_NAME, orgName, IMPERSONATE_COOKIE_OPTIONS)

  return {}
}

/**
 * stopImpersonation — удаляет куки и редиректит в /admin.
 */
export async function stopImpersonation() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_ORG_ID)
  cookieStore.delete(COOKIE_ORG_NAME)
  redirect('/admin')
}
