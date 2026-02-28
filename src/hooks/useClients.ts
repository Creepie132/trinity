import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['clients', orgId, searchQuery, page, pageSize],
    enabled: !!orgId,
    queryFn: async () => {
      console.log('Loading clients for org_id:', orgId)
      
      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      let query = supabase
        .from('client_summary')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data, error, count } = await query
      
      if (error) {
        console.error('Error loading clients:', error)
        throw error
      }
      
      console.log('Loaded clients count:', count)
      
      return { data: data as ClientSummary[], count: count || 0 }
    },
  })
}

export function useClient(id?: string) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['client', orgId, id],
    enabled: !!orgId && !!id,
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', orgId) // <-- важно
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Client
    },
  })
}

export function useAddClient() {
  const queryClient = useQueryClient()
  const { isLoading } = useAuth()

  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'org_id'>) => {
      // Проверяем что auth загружен
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }

      // Получаем токен для авторизации API запроса
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('לא נמצא ארגון למשתמש הנוכחי. אנא פנה לתמיכה.')
      }

      console.log('Adding client via API route') // debug

      // Вызываем API роут вместо прямого обращения к Supabase
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(client),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add client')
      }

      const data = await response.json()
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('הלקוח נוסף בהצלחה')
    },
    onError: (error: any) => {
      console.error('Add client error:', error)
      toast.error('שגיאה בהוספת לקוח: ' + error.message)
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...client }: Partial<Client> & { id: string }) => {
      if (!orgId) throw new Error('Missing orgId')

      // на всякий случай запрещаем обновлять org_id
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { org_id, ...safeClient } = client as any

      const { data, error } = await supabase
        .from('clients')
        .update(safeClient)
        .eq('org_id', orgId) // <-- важно
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      toast.success('הלקוח עודכן בהצלחה')
    },
    onError: (error: any) => {
      toast.error('שגיאה בעדכון לקוח: ' + error.message)
    },
  })
}
