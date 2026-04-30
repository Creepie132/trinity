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

export async function startImpersonation(orgId: string, adminToken: string): Promise<{ error?: string }> {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(adminToken)
  if (authErr || !user) return { error: 'Unauthorized' }
  if (!SUPER_ADMINS.includes(user.email || '')) return { error: 'Forbidden' }

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single()

  if (orgErr || !org) {
    console.error('[startImpersonation] Org not found:', orgId, orgErr?.message)
    return { error: 'Org not found: ' + (orgErr?.message || 'no data') }
  }

  const orgName = org.name as string

  try {
    await service.from('audit_log').insert({
      org_id: orgId, user_email: user.email, user_id: user.id,
      action: 'impersonation_start', entity_type: 'impersonation',
      metadata: { org_name: orgName, method: 'safe_cookie' },
    })
  } catch {}

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_ORG_ID,   orgId,   IMPERSONATE_COOKIE_OPTIONS)
  cookieStore.set(COOKIE_ORG_NAME, orgName, IMPERSONATE_COOKIE_OPTIONS)

  return {}
}

export async function stopImpersonation() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_ORG_ID)
  cookieStore.delete(COOKIE_ORG_NAME)
  redirect('/admin')
}