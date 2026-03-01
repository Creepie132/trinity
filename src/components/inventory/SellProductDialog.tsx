'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
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
import { TrinityMobileSearch } from '@/components/ui/TrinitySearch'
import { useCreateTransaction } from '@/hooks/useInventory'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import ModalWrapper from '@/components/ModalWrapper'
import { PaymentLinkResultModal } from '@/components/modals/products/PaymentLinkResultModal'
import type { Product } from '@/types/inventory'
import type { ClientSummary } from '@/types/database'

interface SellProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function SellProductDialog({ open, onClose, product }: SellProductDialogProps) {
  const { t, language } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const createTransaction = useCreateTransaction()
  const { data: clients } = useClients()

  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [clientId, setClientId] = useState<string>('')
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentLink, setPaymentLink] = useState<string | null>(null)
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false)
  const [isCreatingLink, setIsCreatingLink] = useState(false)

  useEffect(() => {
    if (product && open) {
      setPrice(product.sell_price)
      setQuantity(1)
      setClientId('')
      setSelectedClient(null)
      setPaymentMethod('')
      // Don't reset payment link state here - it needs to persist after closing
      // setPaymentLink(null)
      // setShowPaymentLinkModal(false)
      setIsCreatingLink(false)
    }
  }, [product, open])

  const total = quantity * price

  const createPaymentLink = async () => {
    if (!clientId) {
      toast.error(language === 'ru' ? 'Выберите клиента для создания ссылки' : 'בחר לקוח ליצירת קישור')
      return
    }

    setIsCreatingLink(true)

    try {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          amount: total,
          description: `${product?.name} - ${quantity} ${product?.unit}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment link')
      }

      const data = await response.json()
      setPaymentLink(data.payment_link)
      // Close current modal before opening payment link modal
      onClose()
      // Wait for animation to complete
      setTimeout(() => {
        setShowPaymentLinkModal(true)
      }, 150)
    } catch (error) {
      console.error('Payment link creation error:', error)
      toast.error(
        language === 'ru'
          ? 'Ошибка создания ссылки на оплату'
          : 'שגיאה ביצירת קישור לתשלום'
      )
    } finally {
      setIsCreatingLink(false)
    }
  }

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

    // If payment method is credit, create payment link instead
    if (paymentMethod === 'credit') {
      await createPaymentLink()
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
    <>
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
          <h2 className="text-2xl font-bold pr-12">{t('inventory.sellDialog.title')}</h2>
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

          {/* Client Search */}
          <div>
            <Label htmlFor="client">
              {t('inventory.sellDialog.client')}
              {paymentMethod === 'credit' && <span className="text-red-500"> *</span>}
            </Label>
            {selectedClient ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </p>
                  {selectedClient.phone && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedClient.phone}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null)
                    setClientId('')
                  }}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <TrinityMobileSearch
                data={clients?.data || []}
                searchKeys={['first_name', 'last_name', 'phone']}
                minChars={2}
                placeholder={
                  language === 'ru'
                    ? 'Поиск клиента...'
                    : 'חיפוש לקוח...'
                }
                onSelect={(client) => {
                  setSelectedClient(client)
                  setClientId(client.id)
                }}
                renderItem={(client) => (
                  <div>
                    <p className="font-medium text-sm">
                      {client.first_name} {client.last_name}
                    </p>
                    {client.phone && (
                      <p className="text-xs text-muted-foreground">
                        {client.phone}
                      </p>
                    )}
                  </div>
                )}
                locale={language === 'ru' ? 'ru' : 'he'}
                dropDirection="up"
              />
            )}
            {paymentMethod === 'credit' && !clientId && (
              <p className="text-xs text-red-500 mt-1">
                {language === 'ru'
                  ? 'Выберите клиента для создания ссылки'
                  : 'בחר לקוח ליצירת קישור'}
              </p>
            )}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createTransaction.isPending || isCreatingLink}
            >
              {isCreatingLink
                ? language === 'ru'
                  ? 'Создание...'
                  : 'יוצר...'
                : paymentMethod === 'credit'
                ? language === 'ru'
                  ? 'Создать ссылку на оплату'
                  : 'צור קישור לתשלום'
                : createTransaction.isPending
                ? t('common.saving')
                : t('inventory.sellDialog.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
    
    <PaymentLinkResultModal
      open={showPaymentLinkModal}
      onClose={() => {
        setShowPaymentLinkModal(false)
        setPaymentLink(null)
        setClientId('')
        setSelectedClient(null)
        setPaymentMethod('')
      }}
      paymentLink={paymentLink || ''}
      amount={total}
      clientPhone={selectedClient?.phone}
      clientName={
        selectedClient
          ? `${selectedClient.first_name} ${selectedClient.last_name}`
          : undefined
      }
    />
    </>
  )
}
