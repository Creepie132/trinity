import { useQuery } from '@tanstack/react-query'

export function useIsAdmin() {
  return useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const response = await fetch('/api/admin/check', {
        credentials: 'include', // Include cookies
      })
      const data = await response.json()
      console.log('[useIsAdmin] Response:', data)
      return data.isAdmin || false
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
