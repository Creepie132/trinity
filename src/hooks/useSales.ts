'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBranch } from '@/contexts/BranchContext'

export interface SaleItem {
  id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Sale {
  id: string
  org_id: string
  client_id: string | null
  staff_id: string | null
  payment_id: string | null
  sale_date: string
  total_amount: number
  paid_amount: number
  status: 'new' | 'partial' | 'paid' | 'refunded' | 'cancelled'
  receipt_sent: boolean
  notes: string | null
  created_at: string
  clients?: { id: string; first_name: string; last_name: string; phone: string | null } | null
  sale_items?: SaleItem[]
  staff_name?: string | null
}

export interface SalesFilters {
  status?: string
  method?: string
  month?: string   // YYYY-MM
  search?: string
  page?: number
}

export function useSales(filters?: SalesFilters) {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['sales', activeOrgId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters?.month) params.set('month', filters.month)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.page) params.set('page', String(filters.page))

      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const res = await fetch(`/api/sales?${params.toString()}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch sales')
      return res.json() as Promise<Sale[]>
    },
    enabled: !!activeOrgId,
    staleTime: 30_000,
  })
}

export function useSaleStats(sales: Sale[]) {
  const paid = sales.filter(s => s.status === 'paid')
  const totalRevenue = paid.reduce((s, x) => s + Number(x.paid_amount), 0)
  const count = sales.length
  const avg = count > 0 ? Math.round(totalRevenue / count) : 0
  return { totalRevenue, count, avg }
}

export function useToggleReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, receipt_sent }: { id: string; receipt_sent: boolean }) => {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_sent }),
      })
      if (!res.ok) throw new Error('Failed to update receipt')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()
  return useMutation({
    mutationFn: async (body: {
      client_id?: string
      items: { product_name: string; product_id?: string; quantity: number; unit_price: number }[]
      paid_amount?: number
      payment_method?: string
      sale_date?: string
      notes?: string
    }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create sale')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
