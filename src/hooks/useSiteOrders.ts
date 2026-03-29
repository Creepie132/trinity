'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface SiteOrderItem {
  product_id:   string
  product_name: string
  quantity:     number
  unit_price:   number
}

export interface SiteOrder {
  id:             string
  org_id:         string
  customer_name:  string
  customer_phone: string | null
  customer_email: string | null
  items:          SiteOrderItem[]
  total_amount:   number
  status:         'new' | 'processing' | 'completed' | 'cancelled'
  notes:          string | null
  source:         string
  sale_id:        string | null
  client_id:      string | null
  created_at:     string
  // populated by GET /api/site-orders/[id]
  matched_client?: { id: string; first_name: string; last_name: string; phone: string } | null
}

export interface SiteOrdersPage {
  orders:   SiteOrder[]
  total:    number
  page:     number
  pageSize: number
}

export function useSiteOrders(page = 0, status?: string) {
  return useQuery<SiteOrdersPage>({
    queryKey: ['site-orders', page, status ?? 'all'],
    queryFn:  async () => {
      const p = new URLSearchParams({ page: String(page) })
      if (status && status !== 'all') p.set('status', status)
      const res = await fetch(`/api/site-orders?${p}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
    staleTime: 0,
  })
}

export function useSiteOrder(id: string | null) {
  return useQuery<SiteOrder>({
    queryKey: ['site-order', id],
    queryFn:  async () => {
      const res = await fetch(`/api/site-orders/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    enabled: !!id,
    staleTime: 0,
  })
}

export function useNewOrdersCount() {
  return useQuery<number>({
    queryKey: ['site-orders-new-count'],
    queryFn:  async () => {
      const res = await fetch('/api/site-orders?status=new&page=0')
      if (!res.ok) return 0
      const data: SiteOrdersPage = await res.json()
      return data.total
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
