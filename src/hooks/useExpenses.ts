'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export interface Expense {
  id: string
  org_id: string
  created_by: string | null
  vendor: string | null
  amount: number | null
  currency: string
  expense_date: string | null
  category: string
  description: string | null
  receipt_url: string | null
  receipt_storage_path: string | null
  parsed_raw: Record<string, unknown> | null
  confidence: number | null
  verified: boolean
  created_at: string
  updated_at: string
  // Extended fields
  vendor_phone: string | null
  vendor_website: string | null
  order_number: string | null
  notes: string | null
  vat_amount: number | null
  items: Array<{ name: string; qty: number; unit_price: number; is_gift?: boolean }> | null
}

export interface ExpensesStats {
  total: number
  count: number
  byCategory: Record<string, number>
}

export function useExpenses(month?: string, category?: string) {
  const { activeOrgId } = useBranch()
  useRealtimeSync({ table: 'expenses', orgId: activeOrgId, queryKey: ['expenses'] })
  return useQuery<Expense[]>({
    queryKey: ['expenses', month, category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (category && category !== 'all') params.set('category', category)
      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to fetch expenses')
      const data = await res.json()
      return data.expenses ?? []
    },
    staleTime: 30_000,
  })
}

export function useExpensesStats(month?: string) {
  const { activeOrgId } = useBranch()
  // NOTE: useExpenses already subscribes to expenses table.
  // This hook uses a separate channel (unique name via queryKey) — no conflict.
  useRealtimeSync({ table: 'expenses', orgId: activeOrgId, queryKey: ['expenses-stats'] })
  return useQuery<ExpensesStats>({
    queryKey: ['expenses-stats', month],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      params.set('limit', '500')
      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to fetch expenses stats')
      const data = await res.json()
      const expenses: Expense[] = data.expenses ?? []
      const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
      const byCategory: Record<string, number> = {}
      expenses.forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + (e.amount ?? 0)
      })
      return { total, count: expenses.length, byCategory }
    },
    staleTime: 30_000,
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Expense> & { id: string }) => {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update expense')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expenses-stats'] }) },
    onError: () => toast.error('שגיאה בעדכון הוצאה'),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete expense')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['expenses-stats'] }) },
    onError: () => toast.error('שגיאה במחיקת הוצאה'),
  })
}
