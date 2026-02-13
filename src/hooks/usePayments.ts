import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Payment } from '@/types/database'
import { toast } from 'sonner'
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
}

export function usePayments(clientId?: string, filters?: PaymentsFilters) {
  return useQuery({
    queryKey: ['payments', clientId, filters],
    staleTime: 30000, // 30 seconds - reduce unnecessary refetches
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          clients:client_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
  })
}

export function usePaymentsStats() {
  return useQuery({
    queryKey: ['payments-stats'],
    queryFn: async () => {
      // Get current month dates
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString())

      if (error) throw error

      const completedPayments = payments.filter((p) => p.status === 'completed')
      const totalAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const count = completedPayments.length
      const avgAmount = count > 0 ? totalAmount / count : 0

      return {
        totalAmount,
        count,
        avgAmount,
      }
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
      toast.success('קישור התשלום נוצר בהצלחה')
    },
    onError: (error: any) => {
      toast.error('שגיאה ביצירת קישור תשלום: ' + error.message)
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
