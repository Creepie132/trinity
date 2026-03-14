'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const queryClient = useQueryClient()
  const router = useRouter()
  const { activeOrgId } = useBranch()
  
  const query = useQuery({
    // Используем activeOrgId из BranchContext как queryKey —
    // так query автоматически перезапускается при смене орг
    queryKey: ['organization', activeOrgId ?? getActiveOrgIdFromCookie()],
    queryFn: fetchCurrentOrganization,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Real-time subscription for organization changes
  useEffect(() => {
    if (!query.data?.id) return

    const orgId = query.data.id
    
    // Subscribe to changes in organizations table
    const channel = supabase
      .channel(`organization:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${orgId}`,
        },
        (payload) => {
          console.log('[useOrganization] Real-time update received:', payload)
          
          // Invalidate and refetch organization data
          queryClient.invalidateQueries({ queryKey: ['organization'] })
          
          // If on a module-specific page, check if module is still accessible
          const currentPath = window.location.pathname
          const newModules = (payload.new as any)?.features?.modules || {}
          
          // Map routes to module keys
          const moduleRoutes: Record<string, string> = {
            '/payments': 'payments',
            '/inventory': 'inventory',
            '/sms': 'sms',
            '/stats': 'statistics',
            '/reports': 'reports',
            '/subscriptions': 'subscriptions',
            '/booking': 'booking',
          }
          
          // Check if current route requires a module
          for (const [route, moduleKey] of Object.entries(moduleRoutes)) {
            if (currentPath.startsWith(route) && !newModules[moduleKey]) {
              // Module was disabled, redirect to dashboard
              console.log(`[useOrganization] Module ${moduleKey} disabled, redirecting to dashboard`)
              router.push('/dashboard')
              break
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [query.data?.id, queryClient, router])

  return query
}
