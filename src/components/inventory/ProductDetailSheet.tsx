'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInventoryTransactions } from '@/hooks/useInventory'
import { useDeleteProduct } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Package, Edit, Trash, ShoppingCart, Plus, Clock, ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { format } from 'date-fns'
import type { Product } from '@/types/inventory'
import { SellProductDialog } from './SellProductDialog'
import { AddStockDialog } from './AddStockDialog'

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

  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)

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
    if (!confirm(`האם למחוק את ${product.name}?`)) return

    try {
      await deleteProduct.mutateAsync(product.id)
      toast.success(t('common.success'))
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '📦'
      case 'sale':
        return '💰'
      case 'return':
        return '↩️'
      case 'adjustment':
        return '⚙️'
      case 'write_off':
        return '❌'
      default:
        return '📝'
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

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto bg-white dark:bg-gray-900"
        >
          <SheetHeader className="relative">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-11 w-11 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t('common.back')}
            >
              {language === 'he' ? (
                <ArrowRight className="h-6 w-6" />
              ) : (
                <ArrowLeft className="h-6 w-6" />
              )}
            </Button>
            <SheetTitle className="flex items-center gap-2 pr-12">
              <Package className="w-5 h-5" />
              {t('inventory.details')}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('inventory.quantity')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {product.quantity} {product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('inventory.minQuantity')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {product.min_quantity} {product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('inventory.sellPrice')}
                  </p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    ₪{product.sell_price.toFixed(2)}
                  </p>
                </div>
                {product.purchase_price && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('inventory.purchasePrice')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ₪{product.purchase_price.toFixed(2)}
                    </p>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('inventory.barcode')}
                    </p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {product.barcode}
                    </p>
                  </div>
                )}
                {product.sku && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('inventory.sku')}
                    </p>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {product.sku}
                    </p>
                  </div>
                )}
                {product.category && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('inventory.category')}
                    </p>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setSellDialogOpen(true)}
                variant="default"
                className="w-full"
                disabled={product.quantity === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t('inventory.sell')}
              </Button>
              <Button
                onClick={() => setAddStockDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('inventory.addStock')}
              </Button>
              {onEdit && (
                <Button
                  onClick={() => {
                    onEdit(product)
                    onClose()
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('inventory.edit')}
                </Button>
              )}
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full"
                disabled={deleteProduct.isPending}
              >
                <Trash className="w-4 h-4 mr-2" />
                {t('inventory.delete')}
              </Button>
            </div>

            {/* Transaction History */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Clock className="w-5 h-5" />
                {t('inventory.transactions')}
              </h4>

              {!transactions || transactions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {t('inventory.noTransactions')}
                </p>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 20).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getTransactionIcon(transaction.type)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {t(`inventory.transaction.${transaction.type}`)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${getTransactionColor(transaction.type)}`}
                        >
                          {transaction.type === 'purchase' || transaction.type === 'return'
                            ? '+'
                            : '-'}
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
        </SheetContent>
      </Sheet>

      <SellProductDialog
        open={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        product={product}
      />

      <AddStockDialog
        open={addStockDialogOpen}
        onClose={() => setAddStockDialogOpen(false)}
        product={product}
      />
    </>
  )
}
