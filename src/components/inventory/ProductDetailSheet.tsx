'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/badge'
import { useInventoryTransactions } from '@/hooks/useInventory'
import { useDeleteProduct } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Package, Edit, Trash2, ShoppingCart, Plus, Clock, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { format } from 'date-fns'
import type { Product } from '@/types/inventory'
import { AddStockDialog } from './AddStockDialog'
import { useModalStore } from '@/store/useModalStore'

interface ProductDetailSheetProps {
  open: boolean
  onClose: () => void
  product: Product | null
  onEdit?: (product: Product) => void
}

export function ProductDetailSheet({
  open,
  onClose,
  product,
  onEdit,
}: ProductDetailSheetProps) {
  const { t, language } = useLanguage()
  const { data: transactions } = useInventoryTransactions(product?.id)
  const deleteProduct = useDeleteProduct()
  const { openModal } = useModalStore()

  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!product) return null

  const getStatusColor = () => {
    if (product.quantity === 0) return 'bg-red-500'
    if (product.quantity <= product.min_quantity) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (product.quantity === 0) return t('inventory.outOfStock')
    if (product.quantity <= product.min_quantity) return t('inventory.lowStock')
    return t('inventory.inStock')
  }

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(product.id)
      toast.success(t('common.success'))
      setShowDeleteConfirm(false)
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '📦'
      case 'sale': return '💰'
      case 'return': return '↩️'
      case 'adjustment': return '⚙️'
      case 'write_off': return '❌'
      default: return '📝'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'return':
        return 'text-green-600 dark:text-green-400'
      case 'sale':
      case 'write_off':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={language === 'he' ? 'מחיקת מוצר' : 'Удаление товара'}
        width="400px"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteProduct.isPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {deleteProduct.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t('inventory.delete')}
                </>
              )}
            </button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          {language === 'he' ? `האם למחוק את ${product.name}?` : `Удалить ${product.name}?`}
        </p>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {t('inventory.details')}
          </div>
        }
        width="520px"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose()
                openModal('client-sale', {
                  preloadedProduct: product,
                  locale: language === 'he' ? 'he' : 'ru',
                })
              }}
              disabled={product.quantity === 0}
              className="py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('inventory.sell')}
            </button>
            <button
              onClick={() => setAddStockDialogOpen(true)}
              className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('inventory.addStock')}
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(product)
                  onClose()
                }}
                className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Edit className="w-4 h-4" />
                {t('inventory.edit')}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2 whitespace-nowrap border border-red-100 dark:border-red-800"
            >
              <Trash2 className="w-4 h-4" />
              {t('inventory.delete')}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Product Image/Icon */}
          <div className="flex justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-24 h-24 object-cover rounded-2xl"
              />
            ) : (
              <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-600" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                {product.description}
              </p>
            )}
            {/* Status Badge */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getStatusText()}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('inventory.quantity')}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {product.quantity} {product.unit}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('inventory.minQuantity')}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {product.min_quantity} {product.unit}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('inventory.sellPrice')}
              </p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ₪{product.sell_price.toFixed(2)}
              </p>
            </div>
            {product.purchase_price && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('inventory.purchasePrice')}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ₪{product.purchase_price.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            {product.barcode && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('inventory.barcode')}</span>
                <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{product.barcode}</span>
              </div>
            )}
            {product.sku && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('inventory.sku')}</span>
                <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{product.sku}</span>
              </div>
            )}
            {product.category && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('inventory.category')}</span>
                <Badge variant="outline">{product.category}</Badge>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4" />
              {t('inventory.transactions')}
            </h4>

            {!transactions || transactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
                {t('inventory.noTransactions')}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transactions.slice(0, 10).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t(`inventory.transaction.${transaction.type}`)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'purchase' || transaction.type === 'return' ? '+' : '-'}
                        {transaction.quantity}
                      </p>
                      {transaction.total_price && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ₪{transaction.total_price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <AddStockDialog
        open={addStockDialogOpen}
        onClose={() => setAddStockDialogOpen(false)}
        product={product}
      />
    </>
  )
}
