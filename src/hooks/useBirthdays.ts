import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from './useAuth'

export interface BirthdayClient {
  id: string
  first_name: string
  last_name: string
  phone: string
  date_of_birth: string
  age?: number
}

export function useTodayBirthdays() {
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  return useQuery({
    queryKey: ['today-birthdays', orgId],
    queryFn: async () => {
      if (!orgId) return []

      const today = new Date()
      const currentMonth = today.getMonth() + 1 // 1-12
      const currentDay = today.getDate()

      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, date_of_birth')
        .eq('org_id', orgId)
        .not('date_of_birth', 'is', null)

      if (error) {
        console.error('Error fetching birthdays:', error)
        return []
      }

      // Filter by birth month and day
      const birthdays: BirthdayClient[] = (data || [])
        .filter((client) => {
          if (!client.date_of_birth) return false
          const birthDate = new Date(client.date_of_birth)
          return (
            birthDate.getMonth() + 1 === currentMonth &&
            birthDate.getDate() === currentDay
          )
        })
        .map((client) => {
          const birthDate = new Date(client.date_of_birth!)
          const age = today.getFullYear() - birthDate.getFullYear()
          return {
            ...client,
            age: age > 0 && age < 150 ? age : undefined
          }
        })

      return birthdays
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
