import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  InventoryTransaction,
  CreateInventoryTransactionDTO 
} from '@/types/inventory'
import { supabase } from '@/lib/supabase'

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transaction: CreateInventoryTransactionDTO) => {
      // Start a Supabase transaction
      const { data: { user } } = await supabase.auth.getUser()
      const org_id = user?.user_metadata?.org_id

      // 1. Create the transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          ...transaction,
          org_id
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // 2. Update product quantity
      const quantityDelta = (['sale', 'write_off'].includes(transaction.type) ? -1 : 1) * 
                           (transaction.type === 'adjustment' ? 0 : transaction.quantity)
      
      const { error: productError } = await supabase.rpc('update_product_quantity', {
        p_product_id: transaction.product_id,
        p_quantity_delta: quantityDelta
      })

      if (productError) throw productError

      return transactionData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}

export const useInventory = () => {
  const queryClient = useQueryClient()

  // Products queries
  const getProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  }

  const products = useQuery({
    queryKey: ['products'],
    queryFn: getProducts
  })

  // Transactions queries
  const getTransactions = async (): Promise<InventoryTransaction[]> => {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        products (*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  const transactions = useQuery({
    queryKey: ['inventory_transactions'],
    queryFn: getTransactions
  })

  // Product mutations
  const createProduct = useMutation({
    mutationFn: async (product: CreateProductDTO) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          quantity: product.quantity ?? 0,
          min_quantity: product.min_quantity ?? 0,
          unit: product.unit ?? 'шт.'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: UpdateProductDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })

  return {
    // Products
    products: products.data ?? [],
    isLoadingProducts: products.isLoading,
    isErrorProducts: products.isError,
    errorProducts: products.error,
    createProduct: createProduct.mutate,
    updateProduct: updateProduct.mutate,
    deleteProduct: deleteProduct.mutate,
    
    // Transactions
    transactions: transactions.data ?? [],
    isLoadingTransactions: transactions.isLoading,
    isErrorTransactions: transactions.isError,
    errorTransactions: transactions.error,
    createTransaction: useCreateTransaction().mutate,

    // Combined loading states
    isPending: createProduct.isPending || 
              updateProduct.isPending || 
              deleteProduct.isPending
  }
}