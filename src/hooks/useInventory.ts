// ================================================
// TRINITY CRM - Inventory Transactions Hooks
// React Query hooks for inventory transaction history
// Version: 2.23.0
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InventoryTransaction, CreateInventoryTransactionDTO } from '@/types/inventory'
import { useBranch } from '@/contexts/BranchContext'

/**
 * useInventoryTransactions - Fetch transaction history (optional product filter)
 */
export function useInventoryTransactions(productId?: string) {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['inventory-transactions', productId, activeOrgId],
    queryFn: async () => {
      const url = productId
        ? `/api/inventory?product_id=${productId}`
        : '/api/inventory'

      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch(url, { headers })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch inventory transactions')
      }

      const data = await response.json()
      return data.transactions as InventoryTransaction[]
    },
  })
}

/**
 * useCreateTransaction - Create new inventory transaction
 * Automatically updates product quantity based on transaction type
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (transaction: CreateInventoryTransactionDTO) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers,
        body: JSON.stringify(transaction),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create transaction')
      }

      const data = await response.json()
      return {
        transaction: data.transaction as InventoryTransaction,
        newQuantity: data.newQuantity as number,
      }
    },
    onSuccess: (data) => {
      // Invalidate transaction history
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })

      // Invalidate products list (quantity changed)
      queryClient.invalidateQueries({ queryKey: ['products'] })

      // Invalidate specific product (if tracking it)
      if (data.transaction.product_id) {
        queryClient.invalidateQueries({
          queryKey: ['products', data.transaction.product_id],
        })
      }

      // Invalidate low-stock query (quantity may have crossed threshold)
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] })
    },
  })
}
