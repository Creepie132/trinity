'use client'

import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface AdminStatus {
  isAdmin: boolean
  role: 'admin' | 'moderator' | null
}

export function useClientAdminStatus(email: string | null | undefined) {
  const supabase = createSupabaseBrowserClient()

  const query = useQuery({
    queryKey: ['client-admin-status', email],
    queryFn: async (): Promise<AdminStatus> => {
      if (!email) {
        return { isAdmin: false, role: null }
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('email', email)
        .single()

      if (error || !data) {
        return { isAdmin: false, role: null }
      }

      return { 
        isAdmin: true, 
        role: data.role as 'admin' | 'moderator' 
      }
    },
    enabled: !!email,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    isAdmin: query.data?.isAdmin ?? false,
    role: query.data?.role ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
