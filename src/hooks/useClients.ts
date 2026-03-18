import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId: authOrgId } = useAuth()
  const { activeOrgId, mainOrgId, isOrgResolved } = useBranch()
  const orgId = activeOrgId || mainOrgId || authOrgId

  // ── Realtime sync ────────────────────────────────────────────────────────
  // Clients are shared at mainOrgId level — use mainOrgId as the filter.
  // Any INSERT/UPDATE/DELETE on clients → invalidate the clients list cache.
  useRealtimeSync({
    table: 'clients',
    orgId: mainOrgId,    // clients are shared across branches
    queryKey: ['clients'],
    enabled: !!mainOrgId && isOrgResolved,
  })

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
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }

      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !session) {
        throw new Error('לא נמצא ארגון למשתמש הנוכחי. אנא פנה לתמיכה.')
      }

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

      return response.json()
    },
    onSuccess: async () => {
      // Realtime will also invalidate, but we invalidate immediately here
      // so the user sees the new client even before the WebSocket event arrives
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.refetchQueries({ queryKey: ['clients'], type: 'active' })
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

      // Запрещаем обновлять org_id
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
