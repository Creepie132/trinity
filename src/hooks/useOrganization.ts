'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  billing_status: string
  billing_due_date: string | null
  created_at: string
}

async function fetchCurrentOrganization(): Promise<Organization | null> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return null
    }

    // Get user's organization through org_users
    const { data: orgUser, error: orgUserError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgUserError || !orgUser) {
      console.error('Error fetching org_user:', orgUserError)
      return null
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgUser.org_id)
      .single()

    if (orgError || !organization) {
      console.error('Error fetching organization:', orgError)
      return null
    }

    return organization as Organization
  } catch (error) {
    console.error('Error in fetchCurrentOrganization:', error)
    return null
  }
}

export function useOrganization() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  const query = useQuery({
    queryKey: ['organization'],
    queryFn: fetchCurrentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
