import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export function useClients(searchQuery?: string) {
  const { orgId } = useAuth()

  const result = useQuery({
    queryKey: ['clients', orgId, searchQuery],
    enabled: !!orgId,
    staleTime: 30000, // 30 seconds - don't refetch if data is fresh
    queryFn: async () => {
      // Optimize: Load directly from clients table (fast, no JOIN)
      // Statistics will be loaded separately/lazily if needed
      let query = supabase
        .from('clients')
        .select('id, first_name, last_name, phone, email, created_at, last_visit_date, org_id')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query
      console.log('useClients data:', data, 'error:', error, 'isLoading:', result.isLoading)
      if (error) throw error
      
      // Return clients as ClientSummary-compatible (statistics can be loaded separately)
      return data as any[]
    },
  })

  console.log('useClients data:', result.data, 'error:', result.error, 'isLoading:', result.isLoading)
  return result
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
  const { orgId, isLoading } = useAuth()

  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      // Проверяем что orgId загружен и не null
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }
      
      if (!orgId || orgId === '0') {
        throw new Error('לא נמצא ארגון למשתמש הנוכחי. אנא פנה לתמיכה.')
      }

      console.log('Adding client with orgId:', orgId) // debug

      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, org_id: orgId }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
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
