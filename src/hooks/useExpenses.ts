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

// ── Query key factory ─────────────────────────────────────────────────────────

export const expensesKeys = {
  all:   () => ['expenses'] as const,
  list:  (month?: string, category?: string) =>
           ['expenses', month, category] as const,
  stats: (month?: string) =>
           ['expenses-stats', month] as const,
}

// ── useExpenses ───────────────────────────────────────────────────────────────

export function useExpenses(month?: string, category?: string) {
  const { activeOrgId } = useBranch()
  const queryClient = useQueryClient()

  useRealtimeSync({
    table: 'expenses',
    orgId: activeOrgId,
    queryKey: ['expenses'],
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.stats() })
    },
  })

  return useQuery<Expense[]>({
    queryKey: expensesKeys.list(month, category),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (category && category !== 'all') params.set('category', category)
      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to fetch expenses')
      const data = await res.json()
      return data.expenses ?? []
    },
    staleTime:       30_000,
    placeholderData: (prev: any) => prev, // нет мигания при смене фильтров
  })
}

// ── useExpensesStats ──────────────────────────────────────────────────────────

export function useExpensesStats(month?: string) {
  return useQuery<ExpensesStats>({
    queryKey: expensesKeys.stats(month),
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
      expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + (e.amount ?? 0)
      })
      return { total, count: expenses.length, byCategory }
    },
    staleTime: 30_000,
  })
}

// ── useUpdateExpense — OPTIMISTIC ─────────────────────────────────────────────

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

    onMutate: async (updated) => {
      await qc.cancelQueries({ queryKey: expensesKeys.all() })

      const snapshot = qc.getQueriesData<Expense[]>({
        queryKey: expensesKeys.all(),
      })

      // Обновляем поля расхода во всех активных кэшах
      qc.setQueriesData<Expense[]>(
        { queryKey: expensesKeys.all() },
        (old) => old?.map(e =>
          e.id === updated.id ? { ...e, ...updated } : e
        )
      )

      return { snapshot }
    },

    onError: (err: any, _vars, context) => {
      context?.snapshot?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data)
      })
      toast.error(err.message || 'Ошибка обновления расхода')
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: expensesKeys.all() })
      qc.invalidateQueries({ queryKey: expensesKeys.stats() })
    },
  })
}

// ── useDeleteExpense — OPTIMISTIC ─────────────────────────────────────────────

export function useDeleteExpense() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete expense')
      return res.json()
    },

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: expensesKeys.all() })

      const snapshot = qc.getQueriesData<Expense[]>({
        queryKey: expensesKeys.all(),
      })

      // Убираем расход из кэша немедленно
      qc.setQueriesData<Expense[]>(
        { queryKey: expensesKeys.all() },
        (old) => old?.filter(e => e.id !== id)
      )

      return { snapshot }
    },

    onError: (err: any, _vars, context) => {
      context?.snapshot?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data)
      })
      toast.error(err.message || 'Ошибка удаления расхода')
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: expensesKeys.all() })
      qc.invalidateQueries({ queryKey: expensesKeys.stats() })
    },
  })
}
