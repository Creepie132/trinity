// ================================================
// TRINITY CRM - Products Hooks
// React Query hooks for products CRUD
// Version: 2.24.0 - Local search optimization
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product, CreateProductDTO, UpdateProductDTO } from '@/types/inventory'

/**
 * useProducts - Fetch all products (search is done locally in component)
 */
export function useProducts(searchQuery?: string) {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }

      const data = await response.json()
      return data.products as Product[]
    },
  })
}

/**
 * useProduct - Fetch single product by ID
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch product')
      }

      const data = await response.json()
      return data.product as Product
    },
    enabled: !!id,
  })
}

/**
 * useCreateProduct - Create new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product: CreateProductDTO) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create product')
      }

      const data = await response.json()
      return data.product as Product
    },
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * useUpdateProduct - Update existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductDTO }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product')
      }

      const result = await response.json()
      return result.product as Product
    },
    onSuccess: (updatedProduct) => {
      // Invalidate both list and single product queries
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', updatedProduct.id] })
    },
  })
}

/**
 * useDeleteProduct - Soft delete product (set is_active = false)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
      }

      const data = await response.json()
      return data.product as Product
    },
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * useLowStockProducts - Fetch products where quantity <= min_quantity
 */
export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const response = await fetch('/api/products')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }

      const data = await response.json()
      const products = data.products as Product[]

      // Filter client-side for low stock
      return products.filter((p) => p.quantity <= p.min_quantity)
    },
  })
}
