'use client'

import { useOrganization } from '@/hooks/useOrganization'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

/**
 * isAdmin — читает из JWT app_metadata, ZERO сетевых запросов.
 * Supabase хранит сессию в localStorage, getSession() синхронна из кэша.
 * staleTime: Infinity — JWT не меняется без перелогина.
 */
function useIsAdminFast() {
  return useQuery({
    queryKey: ['is-admin-jwt'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user?.app_metadata?.is_admin === true
    },
    staleTime: Infinity,   // JWT не протухает без перелогина
    gcTime:    Infinity,
    retry: false,
  })
}

export function useDemoMode() {
  const { data: organization, isLoading: orgLoading } = useOrganization()
  // ⚡ Zero-network: читаем is_admin из JWT кэша (localStorage), не HTTP /api/admin/check
  const { data: isAdmin, isLoading: adminLoading } = useIsAdminFast()

  const isLoading = orgLoading || adminLoading

  // ⚡ Пока данные грузятся — НЕ блокируем рендер страницы.
  // organization уже в HydrationBoundary кэше из layout.tsx — данные мгновенные.
  // isAdmin читается из JWT кэша — тоже мгновенно.
  if (isLoading) {
    return { isDemo: false, isLoading: true, plan: 'unknown', clientLimit: null, daysLeft: null }
  }

  // Админы НИКОГДА не в demo
  if (isAdmin) {
    return { isDemo: false, isLoading: false, plan: 'custom', clientLimit: null, daysLeft: null }
  }

  const plan               = (organization as any)?.plan || 'demo'
  const subscriptionStatus = (organization as any)?.subscription_status
  const isDemo             = plan === 'demo' || subscriptionStatus === 'trial' || subscriptionStatus === 'demo'

  const featuresClientLimit = (organization as any)?.features?.client_limit
  const clientLimit = featuresClientLimit !== undefined && featuresClientLimit !== null
    ? featuresClientLimit
    : (isDemo ? 10 : null)

  const daysLeft = isDemo && (organization as any)?.subscription_expires_at
    ? Math.max(0, Math.ceil(
        (new Date((organization as any).subscription_expires_at).getTime() - Date.now())
        / (1000 * 60 * 60 * 24)
      ))
    : null

  return { isDemo, isLoading, plan, clientLimit, daysLeft }
}
