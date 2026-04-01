'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useBranch } from '@/contexts/BranchContext'

export interface Organization {
  id: string
  name: string
  email: string | null
  phone: string | null
  category: string
  plan: string
  is_active: boolean
  features: {
    sms: boolean
    payments: boolean
    analytics: boolean
    subscriptions?: boolean
    visits?: boolean
    inventory?: boolean
    meeting_mode?: boolean
    modules?: Record<string, boolean>
  }
  subscription_status?: string
  billing_status: string
  billing_due_date: string | null
  created_at: string
  payments_enabled?: boolean
  recurring_enabled?: boolean
  branches_enabled?: boolean
}

/** Читает activeOrgId из cookie (синхронно, без запроса) */
function getActiveOrgIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('trinity_active_branch='))
  return match ? match.split('=')[1] : null
}

async function fetchCurrentOrganization(): Promise<Organization | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Читаем activeOrgId из cookie — источник истины на клиенте
    const activeOrgId = getActiveOrgIdFromCookie()

    // Если есть activeOrgId в cookie — грузим эту org напрямую
    if (activeOrgId) {
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', activeOrgId)
        .single()
      if (!error && organization) return organization as Organization
    }

    // Fallback: грузим mainOrg через org_users
    const { data: orgUser, error: orgUserError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) return null

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgUser.org_id)
      .single()

    if (orgError || !organization) return null
    return organization as Organization
  } catch (error) {
    return null
  }
}

export function useOrganization() {
  // activeOrgId нужен для invalidation при switchBranch —
  // не блокируем первый рендер ожиданием BranchContext
  const { activeOrgId } = useBranch()

  // queryKey читается синхронно из cookie при монтировании — нет задержки.
  // При смене филиала switchBranch вызывает queryClient.removeQueries() →
  // query перезапускается автоматически, подхватив новый cookie.
  const cookieOrgId = getActiveOrgIdFromCookie()

  const query = useQuery({
    queryKey: ['organization', cookieOrgId ?? activeOrgId],
    queryFn: fetchCurrentOrganization,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // ⚠️ Realtime-подписка на таблицу organizations НАМЕРЕННО УДАЛЕНА из этого хука.
  // useOrganization() вызывается из 15+ компонентов одновременно.
  // Каждый вызов создавал канал с одним именем → Supabase ошибка:
  // "cannot add postgres_changes callbacks after subscribe()"
  //
  // Централизованная подписка находится в:
  // src/components/providers/ClientProviders.tsx → GlobalRealtimeSync
  // Там же обрабатывается redirect при отключении модуля.

  return query
}
