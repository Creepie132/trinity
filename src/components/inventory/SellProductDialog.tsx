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
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
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
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const createTransaction = useCreateTransaction()
  const { data: clients } = useClients()

  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [clientId, setClientId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')

  useEffect(() => {
    if (product && open) {
      setPrice(product.sell_price)
      setQuantity(1)
      setClientId('')
      setPaymentMethod('')
    }
  }, [product, open])

  const total = quantity * price

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!product || !orgId) return

    if (quantity <= 0) {
      toast.error('כמות חייבת להיות גדולה מאפס')
      return
    }

    if (quantity > product.quantity) {
      toast.error(`אין מספיק מלאי. זמין: ${product.quantity}`)
      return
    }

    if (!paymentMethod) {
      toast.error('נא לבחור אמצעי תשלום')
      return
    }

    try {
      // Create inventory transaction
      await createTransaction.mutateAsync({
        product_id: product.id,
        type: 'sale',
        quantity,
        price_per_unit: price,
        total_price: total,
      })

      // Create payment record if client is selected
      if (clientId) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            org_id: orgId,
            client_id: clientId,
            amount: total,
            status: 'completed',
            payment_method: paymentMethod,
            provider: 'cash',
            paid_at: new Date().toISOString(),
          })

        if (paymentError) {
          console.error('Payment creation error:', paymentError)
          toast.error('המוצר נמכר אך היה שגיאה ביצירת התשלום')
        }
      }

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

          {/* Payment Method (Required) */}
          <div>
            <Label htmlFor="paymentMethod">
              אמצעי תשלום <span className="text-red-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-white dark:bg-gray-800">
                <SelectValue placeholder="בחר אמצעי תשלום" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 מזומן</SelectItem>
                <SelectItem value="bit">📱 ביט</SelectItem>
                <SelectItem value="credit">💳 אשראי</SelectItem>
                <SelectItem value="bank_transfer">🏦 העברה</SelectItem>
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
