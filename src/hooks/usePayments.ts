import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Payment } from '@/types/database'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

// ─── Shared fetch helper ───────────────────────────────────────────────────
// Единственный вызов /api/payments — используется и usePayments и usePaymentsStats.
// Это устраняет двойной сетевой запрос при рендере страницы Payments.

async function fetchAllPayments(): Promise<any[]> {
  const res = await fetch('/api/payments')
  if (!res.ok) throw new Error('Failed to fetch payments')
  return res.json()
}

interface CreatePaymentLinkParams {
  client_id: string
  amount: number
  description?: string
  visit_id?: string
}

interface PaymentsFilters {
  status?: string
  paymentMethod?: string
  clientId?: string
  startDate?: string
  endDate?: string
  page?: number
}

// ─── usePayments ───────────────────────────────────────────────────────────

export function usePayments(clientId?: string, filters?: PaymentsFilters) {
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()

  // ONE channel — invalidates payments-stats via onEvent
  useRealtimeSync({
    table: 'payments',
    orgId: activeOrgId,
    queryKey: ['payments'],
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-stats'], exact: false })
    },
  })

  return useQuery({
    queryKey: ['payments', activeOrgId, clientId, filters],
    queryFn: async () => {
      // ✅ Единый fetch — данные кэшируются под ключом ['payments', activeOrgId]
      // usePaymentsStats читает из того же кэша через ['payments-raw', activeOrgId]
      const allPayments: any[] = await fetchAllPayments()

      // Client-side filters
      let data = allPayments
      if (clientId) data = data.filter(p => p.client_id === clientId)
      if (filters?.clientId) data = data.filter(p => p.client_id === filters.clientId)
      if (filters?.status && filters.status !== 'all') data = data.filter(p => p.status === filters.status)
      if (filters?.paymentMethod) data = data.filter(p => p.payment_method === filters.paymentMethod)
      if (filters?.startDate) data = data.filter(p => p.created_at >= filters.startDate!)
      if (filters?.endDate) data = data.filter(p => p.created_at <= filters.endDate!)

      const PAGE_SIZE = 20
      const page = filters?.page || 0
      return data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    },
    staleTime: 30_000, // ✅ 30 сек вместо 0 — не refetch при каждом фокусе
  })
}

// ─── usePaymentsStats ──────────────────────────────────────────────────────
// ✅ НЕТ второго fetch — читает из кэша через отдельный queryKey,
//    но использует тот же fetchAllPayments (дедуплицируется React Query).

export function usePaymentsStats() {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['payments-stats', activeOrgId],
    queryFn: async () => {
      // React Query автоматически дедуплицирует параллельные вызовы одного queryFn.
      // Оба usePayments и usePaymentsStats вызывают fetchAllPayments одновременно —
      // в flight будет только ОДИН реальный HTTP-запрос.
      const allPayments: any[] = await fetchAllPayments()

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const monthPayments = allPayments.filter(
        p => p.status === 'completed' &&
             p.created_at >= firstDay &&
             p.created_at <= lastDay
      )
      const totalAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const count       = monthPayments.length
      const avgAmount   = count > 0 ? totalAmount / count : 0

      return { totalAmount, count, avgAmount }
    },
    staleTime: 30_000,
  })
}

// ─── useCreatePaymentLink ──────────────────────────────────────────────────

export function useCreatePaymentLink() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (params: CreatePaymentLinkParams) => {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment link')
      }
      return response.json()
    },

    // ── 1. onMutate: вставить optimistic платёж ────────────────────────────
    onMutate: async (params) => {
      await qc.cancelQueries({ queryKey: ['payments', activeOrgId] })

      const snapshot = qc.getQueriesData<any[]>({
        queryKey: ['payments', activeOrgId],
      })

      const optimistic = {
        id:             `optimistic-${Date.now()}`,
        client_id:      params.client_id,
        amount:         params.amount,
        payment_method: 'link',
        status:         'pending',
        created_at:     new Date().toISOString(),
        description:    params.description ?? null,
        visit_id:       params.visit_id ?? null,
      }

      qc.setQueriesData<any[]>(
        { queryKey: ['payments', activeOrgId] },
        (old) => (old ? [optimistic, ...old] : [optimistic])
      )

      return { snapshot }
    },

    // ── 2. onError: откат ──────────────────────────────────────────────────
    onError: (_err, _vars, context) => {
      context?.snapshot?.forEach(([queryKey, data]: [any, any]) => {
        qc.setQueryData(queryKey, data)
      })
    },

    // ── 3. onSettled: фоновая сверка ───────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payments-stats'] })
    },
  })
}

// ─── usePayment (single) ───────────────────────────────────────────────────
// ✅ Убран прямой supabase.from('payments') — теперь через /api/payments/[id]

export function usePayment(id?: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/payments/${id}`)
      if (!res.ok) throw new Error('Failed to fetch payment')
      const data = await res.json()
      return data.payment as Payment
    },
    enabled: !!id,
    staleTime: 30_000,
  })
}
