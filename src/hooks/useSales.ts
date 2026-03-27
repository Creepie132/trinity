'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { toast } from 'sonner'

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
  payment_method?: string | null
  notes: string | null
  created_at: string
  clients?: { id: string; first_name: string; last_name: string; phone: string | null } | null
  sale_items?: SaleItem[]
  staff_name?: string | null
}

export interface SalesFilters {
  status?: string
  method?: string
  month?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const salesKeys = {
  all:   (orgId: string | undefined) => ['sales', orgId] as const,
  list:  (orgId: string | undefined, filters?: SalesFilters) =>
           ['sales', orgId, filters] as const,
  chart: (orgId: string | undefined, dateFrom?: string, dateTo?: string) =>
           ['sales-chart', orgId, dateFrom, dateTo] as const,
}

// ── useSales ──────────────────────────────────────────────────────────────────

export function useSales(filters?: SalesFilters) {
  const { activeOrgId } = useBranch()
  useRealtimeSync({ table: 'sales', orgId: activeOrgId, queryKey: ['sales'] })

  return useQuery({
    queryKey: salesKeys.list(activeOrgId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters?.month)    params.set('month',    filters.month)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo)   params.set('dateTo',   filters.dateTo)
      if (filters?.search)   params.set('search',   filters.search)
      if (filters?.page)     params.set('page',     String(filters.page))

      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const res = await fetch(`/api/sales?${params.toString()}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch sales')
      return res.json() as Promise<Sale[]>
    },
    enabled:   !!activeOrgId,
    staleTime: 30_000,
  })
}

// ── Chart hook ────────────────────────────────────────────────────────────────

export interface SaleChartPoint {
  sale_date: string
  total_amount: number
  status: string
}

export function useSalesChart(opts?: { dateFrom?: string; dateTo?: string }) {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: salesKeys.chart(activeOrgId, opts?.dateFrom, opts?.dateTo),
    queryFn: async () => {
      const params = new URLSearchParams({ chart: '1' })
      if (opts?.dateFrom) params.set('dateFrom', opts.dateFrom)
      if (opts?.dateTo)   params.set('dateTo',   opts.dateTo)

      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const res = await fetch(`/api/sales?${params.toString()}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch chart data')
      return res.json() as Promise<SaleChartPoint[]>
    },
    enabled:   !!activeOrgId,
    staleTime: 60_000,
  })
}

// ── Stat helper (pure, no fetch) ──────────────────────────────────────────────

export function useSaleStats(sales: Sale[]) {
  const paid = sales.filter(s => s.status === 'paid')
  const totalRevenue = paid.reduce((s, x) => s + Number(x.paid_amount), 0)
  const count = sales.length
  const avg = count > 0 ? Math.round(totalRevenue / count) : 0
  return { totalRevenue, count, avg }
}

// ── useToggleReceipt — OPTIMISTIC ─────────────────────────────────────────────

export function useToggleReceipt() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

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

    // ── 1. onMutate: flip receipt_sent мгновенно ──────────────────────────────
    onMutate: async ({ id, receipt_sent }) => {
      await qc.cancelQueries({ queryKey: salesKeys.all(activeOrgId) })

      const snapshot = qc.getQueriesData<Sale[]>({
        queryKey: salesKeys.all(activeOrgId),
      })

      qc.setQueriesData<Sale[]>(
        { queryKey: salesKeys.all(activeOrgId) },
        (old) => old?.map(s => s.id === id ? { ...s, receipt_sent } : s)
      )

      return { snapshot }
    },

    // ── 2. onError: откат ─────────────────────────────────────────────────────
    onError: (err: any, _vars, context) => {
      context?.snapshot?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data)
      })
      toast.error(err.message || 'Ошибка обновления чека')
    },

    // ── 3. onSettled: фоновая сверка ──────────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all(activeOrgId) })
    },
  })
}

// ── useCreateSale — OPTIMISTIC ────────────────────────────────────────────────

export interface CreateSaleBody {
  client_id?: string
  items: { product_name: string; product_id?: string; quantity: number; unit_price: number }[]
  paid_amount?: number
  payment_method?: string
  sale_date?: string
  notes?: string
}

export function useCreateSale() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (body: CreateSaleBody) => {
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
      return res.json() as Promise<{ sale: Sale }>
    },

    // ── 1. onMutate: вставить временную запись в начало списка ───────────────
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: salesKeys.all(activeOrgId) })

      const snapshot = qc.getQueriesData<Sale[]>({
        queryKey: salesKeys.all(activeOrgId),
      })

      const totalAmount = body.items.reduce(
        (s, i) => s + i.quantity * i.unit_price, 0
      )
      const optimistic: Sale = {
        id:             `optimistic-${Date.now()}`,
        org_id:         activeOrgId ?? '',
        client_id:      body.client_id ?? null,
        staff_id:       null,
        payment_id:     null,
        sale_date:      body.sale_date ?? new Date().toISOString().split('T')[0],
        total_amount:   totalAmount,
        paid_amount:    body.paid_amount ?? totalAmount,
        status:         body.paid_amount != null && body.paid_amount < totalAmount
                          ? 'partial'
                          : 'paid',
        receipt_sent:   false,
        payment_method: body.payment_method ?? null,
        notes:          body.notes ?? null,
        created_at:     new Date().toISOString(),
        sale_items:     body.items.map((it, i) => ({
          id:           `opt-item-${i}`,
          product_id:   it.product_id ?? null,
          product_name: it.product_name,
          quantity:     it.quantity,
          unit_price:   it.unit_price,
          total_price:  it.quantity * it.unit_price,
        })),
      }

      // Вставляем в начало каждого активного списка продаж
      qc.setQueriesData<Sale[]>(
        { queryKey: salesKeys.all(activeOrgId) },
        (old) => (old ? [optimistic, ...old] : [optimistic])
      )

      return { snapshot, optimisticId: optimistic.id }
    },

    // ── 2. onError: откат ─────────────────────────────────────────────────────
    onError: (err: any, _vars, context) => {
      context?.snapshot?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data)
      })
      toast.error(err.message || 'Ошибка создания продажи')
    },

    // ── 3. onSettled: фоновая сверка с БД ────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all(activeOrgId) })
      qc.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
