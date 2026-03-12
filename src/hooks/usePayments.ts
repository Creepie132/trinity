import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Payment } from '@/types/database'
import { toast } from 'sonner'
import { useBranch } from '@/contexts/BranchContext'
const supabase = createSupabaseBrowserClient()

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

export function usePayments(clientId?: string, filters?: PaymentsFilters) {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['payments', activeOrgId, clientId, filters],
    queryFn: async () => {
      const page = filters?.page || 0
      const pageSize = 20

      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const res = await fetch('/api/payments', { headers })
      if (!res.ok) throw new Error('Failed to fetch payments')
      const allPayments: any[] = await res.json()

      // Client-side filters
      let data = allPayments
      if (clientId) data = data.filter(p => p.client_id === clientId)
      if (filters?.clientId) data = data.filter(p => p.client_id === filters.clientId)
      if (filters?.status && filters.status !== 'all') data = data.filter(p => p.status === filters.status)
      if (filters?.paymentMethod) data = data.filter(p => p.payment_method === filters.paymentMethod)
      if (filters?.startDate) data = data.filter(p => p.created_at >= filters.startDate!)
      if (filters?.endDate) data = data.filter(p => p.created_at <= filters.endDate!)

      const start = page * pageSize
      return data.slice(start, start + pageSize)
    },
  })
}

export function usePaymentsStats() {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['payments-stats', activeOrgId],
    queryFn: async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const res = await fetch('/api/payments', { headers })
      if (!res.ok) throw new Error('Failed to fetch payments stats')
      const allPayments: any[] = await res.json()

      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const monthPayments = allPayments.filter(
        p => p.status === 'completed' && p.created_at >= firstDay && p.created_at <= lastDay
      )
      const totalAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const count = monthPayments.length
      const avgAmount = count > 0 ? totalAmount / count : 0

      return { totalAmount, count, avgAmount }
    },
  })
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient()

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['payments-stats'] })
    },
  })
}

export function usePayment(id?: string) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Payment
    },
    enabled: !!id,
  })
}
