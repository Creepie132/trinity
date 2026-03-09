'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTransaction } from '@/hooks/useInventory'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import Modal from '@/components/ui/Modal'
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

  const handleSubmit = async () => {
    if (!product) return

    if (quantity <= 0) {
      toast.error(language === 'he' ? 'כמות חייבת להיות גדולה מאפס' : 'Количество должно быть больше нуля')
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
    <Modal
      open={open}
      onClose={onClose}
      title={t('inventory.addStockDialog.title')}
      subtitle={product.name}
      width="440px"
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={createTransaction.isPending}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
          >
            {createTransaction.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {createTransaction.isPending ? t('common.saving') : t('inventory.addStockDialog.confirm')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Product Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('inventory.quantity')}: {product.quantity} {product.unit}
          </p>
        </div>

        {/* Quantity */}
        <div>
          <Label htmlFor="quantity">{t('inventory.addStockDialog.quantity')} <span className="text-red-500">*</span></Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            required
          />
        </div>

        {/* Purchase Price */}
        <div>
          <Label htmlFor="purchasePrice">{t('inventory.addStockDialog.purchasePrice')}</Label>
          <Input
            id="purchasePrice"
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice || ''}
            onChange={(e) => setPurchasePrice(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.00"
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
            rows={2}
          />
        </div>

        {/* New Quantity Preview */}
        {quantity > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'כמות אחרי הוספה:' : 'Количество после добавления:'}
            </p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {product.quantity + quantity} {product.unit}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
