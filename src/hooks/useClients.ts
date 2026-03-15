import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'

export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId: authOrgId } = useAuth()
  const { activeOrgId, mainOrgId, isOrgResolved } = useBranch()
  const orgId = activeOrgId || mainOrgId || authOrgId

  return useQuery({
    queryKey: ['clients', orgId, searchQuery, page, pageSize],
    enabled: !!orgId && isOrgResolved,
    placeholderData: keepPreviousData,
    staleTime: 60_000, // 1 min — не рефетчим при каждом переходе
    queryFn: async () => {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(pageSize),
      })
      if (searchQuery?.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/clients/summary?${params}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json() as Promise<{ data: ClientSummary[]; count: number }>
    },
  })
}

export function useClient(id?: string) {
  const { orgId: authOrgId } = useAuth()
  const { mainOrgId } = useBranch()
  // Clients are always shared — use mainOrgId
  const orgId = mainOrgId || authOrgId

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

      // Получаем session для токена и user для валидации
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !session) {
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
  const { orgId: authOrgId } = useAuth()
  const { mainOrgId } = useBranch()
  // Clients are always shared — use mainOrgId
  const orgId = mainOrgId || authOrgId

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
