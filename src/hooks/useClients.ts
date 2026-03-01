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

      // Загружаем клиентов напрямую из таблицы clients (обход проблемы с view)
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data: clients, error, count } = await query
      
      if (error) {
        console.error('Error loading clients:', error)
        throw error
      }
      
      console.log('Loaded clients count:', count)
      console.log('Clients query result:', { data: clients, error, count, orgId })
      
      if (!clients || clients.length === 0) {
        return { data: [], count: 0 }
      }

      // Загружаем статистику визитов и платежей
      const clientIds = clients.map(c => c.id)
      
      const { data: visits } = await supabase
        .from('visits')
        .select('client_id, scheduled_at')
        .in('client_id', clientIds)

      const { data: payments } = await supabase
        .from('payments')
        .select('client_id, amount, status')
        .in('client_id', clientIds)
        .eq('status', 'completed')

      // Собираем данные с статистикой
      const clientsWithStats = clients.map(client => {
        const clientVisits = visits?.filter(v => v.client_id === client.id) || []
        const clientPayments = payments?.filter(p => p.client_id === client.id) || []
        
        return {
          ...client,
          last_visit: clientVisits.length > 0 
            ? clientVisits.sort((a, b) => 
                new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
              )[0].scheduled_at
            : null,
          total_visits: clientVisits.length,
          total_paid: clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        }
      })
      
      return { data: clientsWithStats as ClientSummary[], count: count || 0 }
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
      console.log('Client added successfully, ID:', data.id)
      return data
    },
    onSuccess: async (data) => {
      console.log('[useAddClient] onSuccess: invalidating clients queries')
      
      // Инвалидируем все запросы клиентов
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      
      // Принудительно рефетчим все активные запросы клиентов
      await queryClient.refetchQueries({ queryKey: ['clients'], type: 'active' })
      
      console.log('[useAddClient] Queries invalidated and refetched')
      
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
