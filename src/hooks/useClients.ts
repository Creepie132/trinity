import { useQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Client, ClientSummary } from '@/types/database'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api-fetch'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync, RealtimePayload } from '@/hooks/useRealtimeSync'

export function useClients(
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 25,
  onClientInsert?: () => void,   // optional callback — used by Kira animation
) {
  const { orgId: authOrgId } = useAuth()
  const { activeOrgId, mainOrgId, isOrgResolved } = useBranch()
  const orgId = activeOrgId || mainOrgId || authOrgId

  // ── Realtime sync ────────────────────────────────────────────────────────
  // Single subscription per (table, org) — prevents Supabase "mismatch
  // between server and client bindings" when multiple components subscribe
  // to the same table+filter with different channel names.
  // Kira animation piggybacks via onClientInsert callback.
  useRealtimeSync({
    table: 'clients',
    orgId: mainOrgId,
    queryKey: ['clients'],
    enabled: !!mainOrgId && isOrgResolved,
    onEvent: (payload: RealtimePayload) => {
      if (payload.eventType === 'INSERT') {
        onClientInsert?.()
      }
    },
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

// Тип для clientInput — то же что принимает mutationFn
type AddClientInput = Pick<Client, 'first_name' | 'last_name' | 'phone'> &
  Partial<Omit<Client, 'id' | 'created_at' | 'updated_at' | 'org_id'>>

export function useAddClient() {
  const queryClient = useQueryClient()
  const { isLoading, orgId } = useAuth()
  const { mainOrgId, activeOrgId } = useBranch()
  const resolvedOrgId = mainOrgId || activeOrgId || orgId

  return useMutation({
    mutationFn: async (client: AddClientInput) => {
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }
      return apiFetch('/api/clients', {
        method: 'POST',
        json: client,
      })
    },

    // ─── OPTIMISTIC UPDATE ────────────────────────────────────────────────
    // Немедленно добавляем запись в кэш — пользователь видит клиента
    // в списке до ответа сервера. Модалка закрывается мгновенно.
    onMutate: async (newClient: AddClientInput) => {
      // 1. Отменяем любые исходящие рефетчи чтобы не перезаписать наш optimistic
      await queryClient.cancelQueries({ queryKey: ['clients'] })

      // 2. Снэпшот предыдущего состояния для rollback
      const previousData = queryClient.getQueriesData<{ data: ClientSummary[]; count: number }>({
        queryKey: ['clients'],
      })

      // 3. Создаём optimistic-запись с временным ID
      const optimisticClient: ClientSummary = {
        id: `optimistic-${Date.now()}`,
        org_id: resolvedOrgId || '',
        first_name: newClient.first_name,
        last_name: newClient.last_name,
        phone: newClient.phone,
        email: (newClient as any).email || null,
        notes: (newClient as any).notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0,
        last_visit_date: null,
      } as any

      // 4. Вставляем в начало всех активных страниц/запросов клиентов
      queryClient.setQueriesData<{ data: ClientSummary[]; count: number }>(
        { queryKey: ['clients'] },
        (old) => {
          if (!old) return old
          return {
            data: [optimisticClient, ...old.data],
            count: old.count + 1,
          }
        }
      )

      // 5. Возвращаем контекст для rollback
      return { previousData }
    },

    // ─── SUCCESS ───────────────────────────────────────────────────────────
    onSuccess: () => {
      toast.success('הלקוח נוסף בהצלחה')
    },

    // ─── ERROR → ROLLBACK ──────────────────────────────────────────────────
    onError: (error: any, _newClient, context) => {
      console.error('Add client error:', error)
      // Откатываем кэш к состоянию до мутации
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error('שגיאה בהוספת לקוח: ' + error.message)
    },

    // ─── SETTLED → фоновая инвалидация ────────────────────────────────────
    // Подтягиваем реальные ID и данные с сервера незаметно для пользователя.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
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
