'use client'

import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from './useAuth'

interface AdminProfile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  created_at: string
  role?: string
}

export function useAdminProfile() {
  const { user, orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const query = useQuery({
    queryKey: ['admin-profile', user?.id, orgId],
    queryFn: async () => {
      if (!user?.id || !orgId) return null

      const { data, error } = await supabase
        .from('org_users')
        .select('id, user_id, org_id, role, created_at')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      // Map org_users data to AdminProfile format
      return {
        id: data.id,
        user_id: data.user_id,
        email: user.email || '',
        full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
        created_at: data.created_at,
        role: data.role,
      } as AdminProfile
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    adminProfile: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
