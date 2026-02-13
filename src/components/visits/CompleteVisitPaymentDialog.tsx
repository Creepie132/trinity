'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useProducts } from '@/hooks/useProducts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Check, Plus, Trash2, Camera, Package } from 'lucide-react'
import { Banknote, Smartphone, CreditCard, Building2, Phone, Zap } from 'lucide-react'
import { Visit } from '@/types/visits'
import { Product } from '@/types/inventory'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'

interface CompleteVisitPaymentDialogProps {
  visit: Visit | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SelectedProduct {
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
  { value: 'stripe', icon: Zap, labelKey: 'visits.paymentMethod.stripe', emoji: '🟣' },
]

export function CompleteVisitPaymentDialog({ visit, open, onOpenChange }: CompleteVisitPaymentDialogProps) {
  const { t } = useLanguage()
  const { orgId } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { data: products } = useProducts()

  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const totalProductsPrice = selectedProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalAmount = (visit?.price || 0) + totalProductsPrice

  const handleAddProduct = () => {
    if (!selectedProductId) return

    const product = products?.find((p) => p.id === selectedProductId)
    if (!product) return

    // Check if already added
    const existing = selectedProducts.find((sp) => sp.product.id === product.id)
    if (existing) {
      toast.error('המוצר כבר נוסף')
      return
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        product,
        quantity: 1,
        price: product.sell_price,
      },
    ])
    setSelectedProductId('')
  }

  const handleBarcodeScanned = (barcode: string) => {
    const product = products?.find((p) => p.barcode === barcode)
    if (product) {
      const existing = selectedProducts.find((sp) => sp.product.id === product.id)
      if (existing) {
        toast.error('המוצר כבר נוסף')
      } else {
        setSelectedProducts([
          ...selectedProducts,
          {
            product,
            quantity: 1,
            price: product.sell_price,
          },
        ])
      }
    } else {
      toast.error('מוצר לא נמצא')
    }
    setScannerOpen(false)
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((sp) => sp.product.id !== productId))
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedProducts(
      selectedProducts.map((sp) =>
        sp.product.id === productId ? { ...sp, quantity } : sp
      )
    )
  }

  const handleCompleteWithoutPayment = async () => {
    if (!visit || !orgId) return

    setIsProcessing(true)
    try {
      // Update visit status to completed
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'completed' })
        .eq('id', visit.id)

      if (visitError) throw visitError

      // Create inventory transactions for products (if any)
      if (selectedProducts.length > 0) {
        for (const item of selectedProducts) {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: item.product.id,
              type: 'sale',
              quantity: item.quantity,
              price_per_unit: item.price,
              total_price: item.price * item.quantity,
              related_visit_id: visit.id,
            }),
          })
        }
      }

      toast.success(t('common.success'))
      onOpenChange(false)
      setSelectedProducts([])
      router.refresh()
    } catch (error) {
      console.error('Error completing visit:', error)
      toast.error(t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompleteWithPayment = async () => {
    if (!visit || !orgId) return

    setIsProcessing(true)
    try {
      // For credit card (Tranzilla) or Stripe - create payment link
      if (paymentMethod === 'credit') {
        // Create Tranzilla payment link
        const response = await fetch('/api/payments/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: visit.client_id,
            amount: totalAmount,
            description: `${t(getServiceLabelKey(visit.service_type || visit.service || 'other'))} - ${visit.clients?.first_name} ${visit.clients?.last_name}`,
          }),
        })

        if (!response.ok) throw new Error('Failed to create payment link')

        const { payment_url } = await response.json()

        // Update visit status
        await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', visit.id)

        // Create inventory transactions
        if (selectedProducts.length > 0) {
          for (const item of selectedProducts) {
            await fetch('/api/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: item.product.id,
                type: 'sale',
                quantity: item.quantity,
                price_per_unit: item.price,
                total_price: item.price * item.quantity,
                related_visit_id: visit.id,
              }),
            })
          }
        }

        // Open payment link
        window.open(payment_url, '_blank')
        toast.success(t('payments.successMessage'))
        onOpenChange(false)
        setSelectedProducts([])
        router.refresh()
        return
      }

      if (paymentMethod === 'stripe') {
        // Create Stripe checkout
        const response = await fetch('/api/payments/stripe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: visit.client_id,
            amount: totalAmount,
            clientName: `${visit.clients?.first_name} ${visit.clients?.last_name}`,
            clientEmail: visit.clients?.email || '',
            orgId,
          }),
        })

        if (!response.ok) throw new Error('Failed to create Stripe checkout')

        const { url } = await response.json()

        // Update visit status
        await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', visit.id)

        // Create inventory transactions
        if (selectedProducts.length > 0) {
          for (const item of selectedProducts) {
            await fetch('/api/inventory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: item.product.id,
                type: 'sale',
                quantity: item.quantity,
                price_per_unit: item.price,
                total_price: item.price * item.quantity,
                related_visit_id: visit.id,
              }),
            })
          }
        }

        // Open Stripe checkout
        window.open(url, '_blank')
        toast.success(t('payments.successMessage'))
        onOpenChange(false)
        setSelectedProducts([])
        router.refresh()
        return
      }

      // For other methods (cash, bit, bank transfer, phone credit) - create payment record directly
      const paymentMethodMap: Record<string, string> = {
        cash: 'cash',
        bit: 'bit',
        bankTransfer: 'bank_transfer',
        phoneCredit: 'phone_credit',
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          client_id: visit.client_id,
          org_id: orgId,
          amount: totalAmount,
          payment_method: paymentMethodMap[paymentMethod],
          status: 'completed',
          description: `${t(getServiceLabelKey(visit.service_type || visit.service || 'other'))} - ${visit.clients?.first_name} ${visit.clients?.last_name}`,
        })

      if (paymentError) throw paymentError

      // Update visit status
      const { error: visitError } = await supabase
        .from('visits')
        .update({ status: 'completed' })
        .eq('id', visit.id)

      if (visitError) throw visitError

      // Create inventory transactions
      if (selectedProducts.length > 0) {
        for (const item of selectedProducts) {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: item.product.id,
              type: 'sale',
              quantity: item.quantity,
              price_per_unit: item.price,
              total_price: item.price * item.quantity,
              related_visit_id: visit.id,
            }),
          })
        }
      }

      toast.success(t('common.success'))
      onOpenChange(false)
      setSelectedProducts([])
      router.refresh()
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error(t('common.error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const getServiceLabelKey = (service: string): string => {
    const serviceMap: Record<string, string> = {
      haircut: 'service.haircut',
      coloring: 'service.coloring',
      smoothing: 'service.smoothing',
      facial: 'service.facial',
      manicure: 'service.manicure',
      pedicure: 'service.pedicure',
      haircutColoring: 'service.haircutColoring',
      hairTreatment: 'service.hairTreatment',
      consultation: 'service.consultation',
      meeting: 'service.meeting',
      advertising: 'service.advertising',
      other: 'service.other',
    }
    return serviceMap[service] || 'service.other'
  }

  if (!visit) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md md:max-h-[90vh] h-full md:h-auto bg-white dark:bg-gray-800 p-0 md:p-6">
          <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 md:p-0 border-b md:border-b-0 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl text-gray-900 dark:text-gray-100">{t('visits.completeTitle')}</DialogTitle>
              <DialogDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                {t('visits.paymentDetails')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex flex-col h-full md:h-auto">
            <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-4">
            {/* Visit details */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
              {/* Large price on top for mobile */}
              <div className="text-center md:hidden">
                <div className="text-4xl font-bold text-theme-primary mb-1">₪{visit.price || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('payments.amount')}</div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.client')}:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {visit.clients?.first_name} {visit.clients?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('visits.service')}:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t(getServiceLabelKey(visit.service_type || visit.service || 'other'))}
                </span>
              </div>
              
              {/* Desktop price */}
              <div className="hidden md:flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('payments.amount')}:</span>
                <span className="text-lg font-bold text-theme-primary">₪{visit.price || 0}</span>
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('inventory.title')}
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="h-8"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              {/* Add Product */}
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-700">
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
                <Button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!selectedProductId}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  {selectedProducts.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        className="w-16 h-8 text-center bg-white dark:bg-gray-600"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveProduct(item.product.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Products Total */}
                  <div className="flex justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      {t('inventory.title')}:
                    </span>
                    <span className="text-sm font-bold text-green-800 dark:text-green-300">
                      ₪{totalProductsPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Total Amount */}
              {selectedProducts.length > 0 && (
                <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-2 border-blue-300 dark:border-blue-700">
                  <span className="text-base font-bold text-blue-900 dark:text-blue-100">
                    {t('inventory.sellDialog.total')}:
                  </span>
                  <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    ₪{totalAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Payment method selection */}
            <div className="space-y-3">
              <Label className="text-gray-900 dark:text-gray-100">{t('visits.selectPaymentMethod')}</Label>
              
              {/* Mobile: 2 columns grid with big cards */}
              <div className="grid grid-cols-2 md:hidden gap-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.value}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[100px] ${
                      paymentMethod === method.value
                        ? 'border-theme-primary bg-theme-primary bg-opacity-10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <span className="text-3xl mb-2">{method.emoji}</span>
                    <span className="text-xs text-center text-gray-900 dark:text-gray-100 font-medium">
                      {t(method.labelKey)}
                    </span>
                    {paymentMethod === method.value && (
                      <Check className="w-4 h-4 text-theme-primary mt-1" />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Desktop: stacked list */}
              <div className="hidden md:block space-y-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <div
                      key={method.value}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        paymentMethod === method.value
                          ? 'border-theme-primary bg-theme-primary bg-opacity-5'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.emoji}</span>
                        <span className="cursor-pointer text-gray-900 dark:text-gray-100">
                          {t(method.labelKey)}
                        </span>
                      </div>
                      {paymentMethod === method.value && (
                        <Check className="w-5 h-5 text-theme-primary" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Note for credit and stripe */}
            {(paymentMethod === 'credit' || paymentMethod === 'stripe') && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 {t('payments.sendLinkToClient')}
                </p>
              </div>
            )}
            </div>

            {/* Actions - Fixed at bottom on mobile */}
            <div className="sticky md:static bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 md:p-0 border-t border-gray-200 dark:border-gray-700 mt-4 md:pt-4 flex flex-col gap-2">
              <Button
                onClick={handleCompleteWithPayment}
                disabled={isProcessing}
                className="w-full h-11 md:h-10 bg-theme-primary text-white hover:opacity-90"
              >
                {isProcessing ? t('visits.processing') : t('visits.completeAndPay')}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCompleteWithoutPayment}
                disabled={isProcessing}
                className="w-full h-11 md:h-10 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('visits.completeWithoutPayment')}
              </Button>

              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="w-full h-11 md:h-10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
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
