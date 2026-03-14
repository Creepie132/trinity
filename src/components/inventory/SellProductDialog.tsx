'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
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
import { ShoppingCart, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
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
      onClose()
      setTimeout(() => {
        setShowPaymentLinkModal(true)
      }, 150)
    } catch (error) {
      console.error('Payment link creation error:', error)
      toast.error(language === 'ru' ? 'Ошибка создания ссылки на оплату' : 'שגיאה ביצירת קישור לתשלום')
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

    if (paymentMethod === 'credit') {
      await createPaymentLink()
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t('inventory.sellDialog.title')}
          </div>
        }
        width="480px"
        dir={language === 'he' ? 'rtl' : 'ltr'}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={createTransaction.isPending || isCreatingLink || !paymentMethod}
              className="flex-[1.5] min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {(isCreatingLink || createTransaction.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isCreatingLink
                ? (language === 'ru' ? 'Создание...' : 'יוצר...')
                : paymentMethod === 'credit'
                ? (language === 'ru' ? 'Создать ссылку' : 'צור קישור')
                : createTransaction.isPending
                ? t('common.saving')
                : t('inventory.sellDialog.confirm')}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
          {/* Product Name */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('inventory.quantity')}: {product.quantity} {product.unit}
            </p>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {t('inventory.sellDialog.quantity')} <span className="text-red-500">*</span>
            </Label>
            <input
              type="number"
              min="1"
              max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
              className={inputClass}
              dir="ltr"
            />
          </div>

          {/* Price per Unit */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {t('inventory.sellDialog.price')} <span className="text-red-500">*</span>
            </Label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              required
              className={inputClass}
              dir="ltr"
            />
          </div>

          {/* Client Search */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
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
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null)
                    setClientId('')
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <TrinityMobileSearch
                data={clients?.data || []}
                searchKeys={['first_name', 'last_name', 'phone']}
                minChars={2}
                placeholder={language === 'ru' ? 'Поиск клиента...' : 'חיפוש לקוח...'}
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
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    )}
                  </div>
                )}
                locale={language === 'ru' ? 'ru' : 'he'}
                dropDirection="up"
              />
            )}
            {paymentMethod === 'credit' && !clientId && (
              <p className="text-xs text-red-500 mt-1">
                {language === 'ru' ? 'Выберите клиента для создания ссылки' : 'בחר לקוח ליצירת קישור'}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {language === 'he' ? 'אמצעי תשלום' : 'Способ оплаты'} <span className="text-red-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder={language === 'he' ? 'בחר אמצעי תשלום' : 'Выберите способ оплаты'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 {language === 'he' ? 'מזומן' : 'Наличные'}</SelectItem>
                <SelectItem value="bit">📱 {language === 'he' ? 'ביט' : 'Bit'}</SelectItem>
                <SelectItem value="credit">💳 {language === 'he' ? 'אשראי' : 'Карта'}</SelectItem>
                <SelectItem value="bank_transfer">🏦 {language === 'he' ? 'העברה' : 'Перевод'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('inventory.sellDialog.total')}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₪{total.toFixed(2)}
            </p>
          </div>
        </form>
      </Modal>
    
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
        clientName={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : undefined}
      />
    </>
  )
}
