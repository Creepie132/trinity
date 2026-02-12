import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export function useClients(searchQuery?: string) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['clients', orgId, searchQuery],
    enabled: !!orgId,
    queryFn: async () => {
      console.log('[useClients] Fetching clients for orgId:', orgId)
      console.log('[useClients] Search query:', searchQuery)
      
      // Try client_summary first, fallback to clients if view doesn't exist
      let query = supabase
        .from('client_summary')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query
      
      console.log('[useClients] Response - data:', data)
      console.log('[useClients] Response - error:', error)
      
      // If client_summary view doesn't exist, try clients table directly
      if (error && error.message?.includes('relation "client_summary" does not exist')) {
        console.warn('[useClients] client_summary view not found, using clients table')
        
        let clientsQuery = supabase
          .from('clients')
          .select('*, total_visits:visits(count), total_revenue:payments(amount)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
        
        if (searchQuery && searchQuery.trim()) {
          clientsQuery = clientsQuery.or(
            `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
          )
        }
        
        const { data: clientsData, error: clientsError } = await clientsQuery
        console.log('[useClients] Fallback - data:', clientsData)
        console.log('[useClients] Fallback - error:', clientsError)
        
        if (clientsError) throw clientsError
        return clientsData as any[]
      }
      
      if (error) throw error
      return data as ClientSummary[]
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
