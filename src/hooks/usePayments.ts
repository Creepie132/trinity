import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Payment } from '@/types/database'
import { useBranch } from '@/contexts/BranchContext'

// NOTE: useRealtimeSync removed — centralised in GlobalRealtimeSync (ClientProviders.tsx)

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
  sale_id?: string   // ← привязка платёж-ссылки к сделке
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

  // RT subscription centralised in GlobalRealtimeSync — no duplicate channels

  return useQuery({
    queryKey: ['payments', activeOrgId, clientId, filters],
    queryFn: async () => {
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
    staleTime:       30_000,
    placeholderData: (prev: any) => prev,
  })
}

// ─── usePaymentsStats ──────────────────────────────────────────────────────

export function usePaymentsStats() {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['payments-stats', activeOrgId],
    queryFn: async () => {
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

    // ── onSettled: фоновая сверка после реального ответа ──────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payments-stats'] })
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

// ─── usePayment (single) ───────────────────────────────────────────────────

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
