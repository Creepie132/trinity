import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

/**
 * Проверяет наличие работников (role=user) в организации.
 * Используется для условного показа "Кабинета" в сайдбаре owner.
 */
export function useHasWorkers() {
  const { role } = useAuth()

  return useQuery({
    queryKey: ['has-workers'],
    queryFn: async () => {
      const res = await fetch('/api/org-users')
      if (!res.ok) return false
      const users: { role: string }[] = await res.json()
      return users.some(u => u.role === 'user')
    },
    enabled: role === 'owner',
    staleTime: 2 * 60 * 1000, // 2 минуты
    retry: false,
  })
}
