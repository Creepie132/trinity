// ================================================
// TRINITY CRM - Products Hooks
// React Query hooks for products CRUD
// Version: 2.24.0 - Local search optimization
// ================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product, CreateProductDTO, UpdateProductDTO } from '@/types/inventory'
import { useBranch } from '@/contexts/BranchContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'

/**
 * useProducts - Fetch all products (search is done locally in component)
 */
export function useProducts(searchQuery?: string) {
  const { activeOrgId } = useBranch()
  // NOTE: useRealtimeSync removed from here.
  // Having it inside useProducts caused "mismatch between server and client bindings"
  // because useProducts is called from 8+ components simultaneously — creating
  // duplicate Supabase Realtime channels on the same (table, org_id) pair.
  // The single RT subscription for 'products' lives in DashboardShell instead.

  return useQuery({
    queryKey: ['products', activeOrgId],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch('/api/products', { headers })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch products')
      }

      const data = await response.json()
      return data.products as Product[]
    },
    staleTime: 0, // ✅ 0ms — данные сразу устаревают после invalidateQueries → мгновенный рефетч
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
 * useCreateProduct — Create new product with Optimistic UI
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (product: CreateProductDTO) => {
      const data = await apiFetch<{ product: Product }>('/api/products', {
        method: 'POST',
        json: product,
      })
      return data.product
    },

    // ─── OPTIMISTIC UPDATE ─────────────────────────────────────────────────
    onMutate: async (newProduct: CreateProductDTO) => {
      await queryClient.cancelQueries({ queryKey: ['products', activeOrgId] })

      const previousProducts = queryClient.getQueryData<Product[]>(['products', activeOrgId])

      const optimistic: Product = {
        id: `optimistic-${Date.now()}`,
        org_id: activeOrgId || '',
        name: newProduct.name,
        sku: newProduct.sku,
        description: newProduct.description,
        barcode: newProduct.barcode,
        category: newProduct.category,
        purchase_price: newProduct.purchase_price,
        sell_price: newProduct.sell_price ?? 0,
        quantity: newProduct.quantity ?? 0,
        min_quantity: newProduct.min_quantity ?? 0,
        unit: newProduct.unit || '',
        image_url: newProduct.image_url,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Product[]>(
        ['products', activeOrgId],
        (old) => (old ? [optimistic, ...old] : [optimistic])
      )

      return { previousProducts }
    },

    onSuccess: () => {
      // optimistic запись уже в UI — просто показываем тост
    },

    onError: (error: any, _vars, context) => {
      if (context?.previousProducts !== undefined) {
        queryClient.setQueryData(['products', activeOrgId], context.previousProducts)
      }
      toast.error('שגיאה ביצירת מוצר: ' + error.message)
    },

    onSettled: () => {
      // Инвалидируем и точный ключ (с orgId) и общий префикс — двойная гарантия
      queryClient.invalidateQueries({ queryKey: ['products', activeOrgId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * useUpdateProduct - Update existing product — OPTIMISTIC
 */
export function useUpdateProduct() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductDTO }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product')
      }

      const result = await response.json()
      return result.product as Product
    },

    // ── 1. onMutate: обновить товар в кэше мгновенно ─────────────────────────
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['products', activeOrgId] })

      const previousProducts = qc.getQueryData<Product[]>(['products', activeOrgId])

      qc.setQueryData<Product[]>(
        ['products', activeOrgId],
        (old) => old?.map(p =>
          p.id === id
            ? { ...p, ...data, updated_at: new Date().toISOString() }
            : p
        )
      )

      return { previousProducts }
    },

    // ── 2. onError: откат ─────────────────────────────────────────────────────
    onError: (error: any, _vars, context) => {
      if (context?.previousProducts !== undefined) {
        qc.setQueryData(['products', activeOrgId], context.previousProducts)
      }
      toast.error('שגיאה בעדכון מוצר: ' + error.message)
    },

    // ── 3. onSettled: фоновая сверка ──────────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['products', activeOrgId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * useDeleteProduct - Soft delete product (set is_active = false) — OPTIMISTIC
 */
export function useDeleteProduct() {
  const qc = useQueryClient()
  const { activeOrgId } = useBranch()

  return useMutation({
    mutationFn: async (id: string) => {
      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
      }

      const data = await response.json()
      return data.product as Product
    },

    // ── 1. onMutate: скрыть товар мгновенно (soft delete = is_active: false) ────
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['products', activeOrgId] })

      const previousProducts = qc.getQueryData<Product[]>(['products', activeOrgId])

      // Софт дилит — скрываем из UI, но не удаляем из БД
      qc.setQueryData<Product[]>(
        ['products', activeOrgId],
        (old) => old?.filter(p => p.id !== id)
      )

      return { previousProducts }
    },

    // ── 2. onError: откат ────────────────────────────────────────────────────
    onError: (error: any, _vars, context) => {
      if (context?.previousProducts !== undefined) {
        qc.setQueryData(['products', activeOrgId], context.previousProducts)
      }
      toast.error('שגיאה במחיקת מוצר: ' + error.message)
    },

    // ── 3. onSettled: фоновая сверка ─────────────────────────────────────────
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['products', activeOrgId] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * useLowStockProducts - Fetch products where quantity <= min_quantity
 */
export function useLowStockProducts() {
  const { activeOrgId } = useBranch()

  return useQuery({
    queryKey: ['products', 'low-stock', activeOrgId],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (activeOrgId) headers['X-Branch-Org-Id'] = activeOrgId

      const response = await fetch('/api/products', { headers })
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
