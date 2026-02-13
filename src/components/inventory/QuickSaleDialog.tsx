'use client'

import { useQueryClient } from '@tanstack/react-query'

import { useState } from 'react'
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
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { Camera, Plus, Trash2, ShoppingCart, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { BarcodeScanner } from './BarcodeScanner'
import type { Product } from '@/types/inventory'
import { Banknote, Smartphone, CreditCard, Building2, Phone, Zap } from 'lucide-react'

interface QuickSaleDialogProps {
  open: boolean
  onClose: () => void
}

interface CartItem {
  product: Product
  quantity: number
  price: number
}

const paymentMethods = [
  { value: 'cash', icon: Banknote, labelKey: 'visits.paymentMethod.cash', emoji: '💵' },
  { value: 'bit', icon: Smartphone, labelKey: 'visits.paymentMethod.bit', emoji: '📱' },
  { value: 'credit', icon: CreditCard, labelKey: 'visits.paymentMethod.credit', emoji: '💳' },
  { value: 'bankTransfer', icon: Building2, labelKey: 'visits.paymentMethod.bankTransfer', emoji: '🏦' },
  { value: 'phoneCredit', icon: Phone, labelKey: 'visits.paymentMethod.phoneCredit', emoji: '📞' },
]

export function QuickSaleDialog({ open, onClose }: QuickSaleDialogProps) {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const { data: products } = useProducts()
  const { data: clients } = useClients()
  const createTransaction = useCreateTransaction()

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleAddProduct = () => {
    if (!selectedProductId) return

    const product = products?.find((p) => p.id === selectedProductId)
    if (!product) return

    const existing = cart.find((item) => item.product.id === product.id)
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([...cart, { product, quantity: 1, price: product.sell_price }])
    }
    setSelectedProductId('')
  }

  const handleBarcodeScanned = (barcode: string) => {
    const product = products?.find((p) => p.barcode === barcode)
    if (product) {
      const existing = cart.find((item) => item.product.id === product.id)
      if (existing) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        )
      } else {
        setCart([...cart, { product, quantity: 1, price: product.sell_price }])
      }
    } else {
      toast.error('מוצר לא נמצא')
    }
    setScannerOpen(false)
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('העגלה ריקה')
      return
    }

    if (!orgId) {
      toast.error('Organization not found')
      return
    }

    setIsProcessing(true)
    try {
      // Create inventory transactions
      for (const item of cart) {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.product.id,
            type: 'sale',
            quantity: item.quantity,
            price_per_unit: item.price,
            total_price: item.price * item.quantity,
          }),
        })
      }

      // Create payment record
      const paymentMethodMap: Record<string, string> = {
        cash: 'cash',
        bit: 'bit',
        credit: 'credit_card',
        bankTransfer: 'bank_transfer',
        phoneCredit: 'phone_credit',
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          client_id: selectedClientId || null,
          org_id: orgId,
          amount: total,
          payment_method: paymentMethodMap[paymentMethod],
          status: 'completed',
          description: 'מכירה מהירה - ' + cart.map((i) => i.product.name).join(', '),
        })

      if (paymentError) throw paymentError

      toast.success(t('common.success'))
      setCart([])
      setSelectedClientId('')
      setPaymentMethod('cash')
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('inventory.quickSale.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Product */}
            <div>
              <Label>{t('inventory.quickSale.addProduct')}</Label>
              <div className="flex gap-2 mt-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={t('inventory.search')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      ?.filter((p) => p.quantity > 0)
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₪{product.sell_price.toFixed(2)} ({product.quantity} {product.unit})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddProduct} disabled={!selectedProductId}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Cart */}
            <div>
              <Label>{t('inventory.quickSale.cart')}</Label>
              {cart.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg mt-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">{t('inventory.quickSale.empty')}</p>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ₪{item.price.toFixed(2)} × {item.quantity} = ₪{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max={item.product.quantity}
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.product.id, parseInt(e.target.value) || 1)
                        }
                        className="w-20 text-center bg-white dark:bg-gray-700"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border-2 border-green-300 dark:border-green-700">
                    <span className="font-bold text-green-800 dark:text-green-300">
                      {t('inventory.sellDialog.total')}:
                    </span>
                    <span className="text-xl font-bold text-green-800 dark:text-green-300">
                      ₪{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Client Selection (Optional) */}
            <div>
              <Label>{t('inventory.sellDialog.client')}</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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

            {/* Payment Method */}
            <div>
              <Label>{t('visits.selectPaymentMethod')}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === method.value
                        ? 'border-theme-primary bg-theme-primary bg-opacity-10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <span className="text-2xl">{method.emoji}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t(method.labelKey)}
                    </span>
                    {paymentMethod === method.value && (
                      <Check className="w-4 h-4 text-theme-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCompleteSale}
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? t('common.saving') : t('inventory.quickSale.complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  )
}
