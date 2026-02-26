'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTransaction } from '@/hooks/useInventory'
import { useProducts } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Camera, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { BarcodeScanner } from './BarcodeScanner'
import ModalWrapper from '@/components/ModalWrapper'
import type { Product } from '@/types/inventory'

interface ReturnProductDialogProps {
  open: boolean
  onClose: () => void
}

export function ReturnProductDialog({ open, onClose }: ReturnProductDialogProps) {
  const { t } = useLanguage()
  const { data: products } = useProducts()
  const createTransaction = useCreateTransaction()

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const selectedProduct = products?.find((p) => p.id === selectedProductId)

  const handleBarcodeScanned = (barcode: string) => {
    const product = products?.find((p) => p.barcode === barcode)
    if (product) {
      setSelectedProductId(product.id)
    } else {
      toast.error('מוצר לא נמצא')
    }
    setScannerOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProductId) {
      toast.error('בחר מוצר')
      return
    }

    if (quantity < 1) {
      toast.error('כמות חייבת להיות גדולה מאפס')
      return
    }

    try {
      await createTransaction.mutateAsync({
        product_id: selectedProductId,
        type: 'return',
        quantity,
        notes: reason || undefined,
      })

      toast.success(t('common.success'))
      onClose()
      setSelectedProductId('')
      setQuantity(1)
      setReason('')
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  return (
    <>
      <ModalWrapper isOpen={open} onClose={onClose}>
        <div className="w-full max-w-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <RotateCcw className="w-6 h-6" />
              {t('inventory.return.title')}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Selection */}
            <div>
              <Label htmlFor="product">
                {t('inventory.return.product')} <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t('inventory.search')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ₪{product.sell_price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Product Info */}
            {selectedProduct && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-gray-900 dark:text-gray-100">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('inventory.quantity')}: {selectedProduct.quantity} {selectedProduct.unit}
                </p>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">
                {t('inventory.return.quantity')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
                className="bg-white dark:bg-gray-800"
              />
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">{t('inventory.return.reason')}</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('inventory.return.reason')}
                rows={3}
                className="bg-white dark:bg-gray-800"
              />
            </div>

            {/* New Quantity Preview */}
            {selectedProduct && quantity > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('inventory.quantity')} אחרי החזרה:
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {selectedProduct.quantity + quantity} {selectedProduct.unit}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createTransaction.isPending}>
                {createTransaction.isPending
                  ? t('common.saving')
                  : t('inventory.return.confirm')}
              </Button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  )
}
