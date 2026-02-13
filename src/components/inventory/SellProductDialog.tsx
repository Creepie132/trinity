'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateTransaction } from '@/hooks/useInventory'
import { useClients } from '@/hooks/useClients'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Product } from '@/types/inventory'

interface SellProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function SellProductDialog({ open, onClose, product }: SellProductDialogProps) {
  const { t } = useLanguage()
  const createTransaction = useCreateTransaction()
  const { data: clients } = useClients()

  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [clientId, setClientId] = useState<string>('')

  useEffect(() => {
    if (product && open) {
      setPrice(product.sell_price)
      setQuantity(1)
      setClientId('')
    }
  }, [product, open])

  const total = quantity * price

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product) return

    if (quantity <= 0) {
      toast.error('כמות חייבת להיות גדולה מאפס')
      return
    }

    if (quantity > product.quantity) {
      toast.error(`אין מספיק מלאי. זמין: ${product.quantity}`)
      return
    }

    try {
      await createTransaction.mutateAsync({
        product_id: product.id,
        type: 'sale',
        quantity,
        price_per_unit: price,
        total_price: total,
      })

      toast.success(t('common.success'))
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inventory.sellDialog.title')}</DialogTitle>
        </DialogHeader>

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
              {t('inventory.sellDialog.quantity')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Price per Unit */}
          <div>
            <Label htmlFor="price">
              {t('inventory.sellDialog.price')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              required
              className="bg-white dark:bg-gray-800"
            />
          </div>

          {/* Client (Optional) */}
          <div>
            <Label htmlFor="client">{t('inventory.sellDialog.client')}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-white dark:bg-gray-800">
                <SelectValue placeholder={t('inventory.sellDialog.client')} />
              </SelectTrigger>
              <SelectContent>
                {clients?.data?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('inventory.sellDialog.total')}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₪{total.toFixed(2)}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending
                ? t('common.saving')
                : t('inventory.sellDialog.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
