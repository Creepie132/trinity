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
}

export function useAdminProfile() {
  const { user } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const query = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching admin profile:', error)
        return null
      }

      return data as AdminProfile
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    adminProfile: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
