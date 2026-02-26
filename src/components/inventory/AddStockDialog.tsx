'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTransaction } from '@/hooks/useInventory'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import ModalWrapper from '@/components/ModalWrapper'
import type { Product } from '@/types/inventory'

interface AddStockDialogProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function AddStockDialog({ open, onClose, product }: AddStockDialogProps) {
  const { t, language } = useLanguage()
  const createTransaction = useCreateTransaction()

  const [quantity, setQuantity] = useState(1)
  const [purchasePrice, setPurchasePrice] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (product && open) {
      setQuantity(1)
      setPurchasePrice(product.purchase_price)
      setNotes('')
    }
  }, [product, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product) return

    if (quantity <= 0) {
      toast.error('כמות חייבת להיות גדולה מאפס')
      return
    }

    try {
      await createTransaction.mutateAsync({
        product_id: product.id,
        type: 'purchase',
        quantity,
        price_per_unit: purchasePrice,
        total_price: purchasePrice ? purchasePrice * quantity : undefined,
        notes: notes || undefined,
      })

      toast.success(t('common.success'))
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  if (!product) return null

  return (
    <ModalWrapper isOpen={open} onClose={onClose}>
      <div className="w-full max-w-md p-6">
        <div className="relative mb-6">
          <Button
            type="button"
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-11 w-11 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('common.back')}
          >
            {language === 'he' ? (
              <ArrowRight className="h-6 w-6" />
            ) : (
              <ArrowLeft className="h-6 w-6" />
            )}
          </Button>
          <h2 className="text-2xl font-bold pr-12">{t('inventory.addStockDialog.title')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('inventory.quantity')}: {product.quantity} {product.unit}
            </p>
          </div>

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">
              {t('inventory.addStockDialog.quantity')} <span className="text-red-500">*</span>
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

          {/* Purchase Price (Optional) */}
          <div>
            <Label htmlFor="purchasePrice">
              {t('inventory.addStockDialog.purchasePrice')}
            </Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice || ''}
              onChange={(e) =>
                setPurchasePrice(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="0.00"
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{t('inventory.addStockDialog.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('inventory.addStockDialog.notes')}
              rows={3}
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* New Quantity Preview */}
          {quantity > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('inventory.quantity')} אחרי הוספה:
              </p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {product.quantity + quantity} {product.unit}
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
                : t('inventory.addStockDialog.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  )
}
