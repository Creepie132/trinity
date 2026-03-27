'use client'

/**
 * SellProductModal — Trinity Standard.
 * Заменяет SellProductDialog (который делал прямой supabase.from('payments').insert() на клиенте).
 * Теперь продажа идёт через POST /api/inventory/sell (Zero Trust).
 *
 * ✅ isSubmittingRef  — anti-race condition lock
 * ✅ /api/inventory/sell — server-side, orgId из JWT
 * ✅ queryClient.invalidateQueries() — не refetch(), не reload()
 */

import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShoppingCart, Loader2, X, User } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { useClients } from '@/hooks/useClients'
import { TrinityMobileSearch } from '@/components/ui/TrinitySearch'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import type { ClientSummary } from '@/types/database'

const PAYMENT_METHODS = [
  { value: 'cash',          emoji: '💵', labelHe: 'מזומן',  labelRu: 'Наличные', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
  { value: 'bit',           emoji: '📱', labelHe: 'ביט',    labelRu: 'Bit',      color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  { value: 'credit',        emoji: '💳', labelHe: 'אשראי',  labelRu: 'Карта',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
  { value: 'bank_transfer', emoji: '🏦', labelHe: 'העברה',  labelRu: 'Перевод',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.3)' },
]

export function SellProductModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const { language } = useLanguage()
  const queryClient = useQueryClient()
  const { data: clients } = useClients()

  const isOpen = isModalOpen('product-sell')
  const data   = getModalData('product-sell')
  const product = data?.product ?? null

  const isHe = language === 'he'
  const dir   = isHe ? 'rtl' : 'ltr'

  const [quantity,       setQuantity]       = useState(1)
  const [price,          setPrice]          = useState(0)
  const [paymentMethod,  setPaymentMethod]  = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [isPending,      setIsPending]      = useState(false)

  // ✅ Anti-race condition lock
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (product && isOpen) {
      setQuantity(1)
      setPrice(product.sell_price)
      setPaymentMethod('')
      setSelectedClient(null)
      isSubmittingRef.current = false
    }
  }, [product, isOpen])

  if (!product) return null

  const total = Math.round(quantity * price * 100) / 100
  const canSubmit = !!paymentMethod && !isPending
  const activeMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod)

  const handleClose = () => closeModal('product-sell')

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return
    if (!paymentMethod) { toast.error(isHe ? 'נא לבחור אמצעי תשלום' : 'Выберите способ оплаты'); return }
    if (quantity <= 0)  { toast.error(isHe ? 'כמות חייבת להיות גדולה מאפס' : 'Количество должно быть > 0'); return }
    if (quantity > product.quantity) {
      toast.error(`${isHe ? 'אין מספיק מלאי. זמין:' : 'Недостаточно. Доступно:'} ${product.quantity}`)
      return
    }

    isSubmittingRef.current = true
    setIsPending(true)
    try {
      // ✅ Zero Trust: продажа через защищённый серверный API
      const res = await fetch('/api/inventory/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id:     product.id,
          quantity,
          price_per_unit: price,
          payment_method: paymentMethod,
          client_id:      selectedClient?.id ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || (isHe ? 'שגיאה' : 'Ошибка'))
      }
      toast.success(isHe ? 'המוצר נמכר בהצלחה' : 'Товар продан')
      // ✅ React Query invalidate
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      handleClose()
    } catch (err: any) {
      toast.error(err.message || (isHe ? 'שגיאה' : 'Ошибка'))
    } finally {
      setIsPending(false)
      isSubmittingRef.current = false
    }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {product.image_url ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img src={product.image_url} alt={product.name}
            style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={24} color="#fff" />
          </div>
        </div>
      )}

      {/* Total */}
      <div style={{ background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#34d399', lineHeight: 1 }}>₪{total.toFixed(2)}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>
          {quantity} × ₪{price.toFixed(2)}
        </div>
      </div>

      {/* Stock */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isHe ? 'במלאי' : 'В наличии'}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: product.quantity > 0 ? '#34d399' : '#ef4444' }}>{product.quantity} {product.unit}</div>
      </div>

      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />

      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', width: '100%',
          background: canSubmit ? (activeMethod ? `linear-gradient(135deg,${activeMethod.color},${activeMethod.color}cc)` : 'linear-gradient(135deg,#4f46e5,#7c3aed)') : 'rgba(255,255,255,0.06)',
          color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700, marginBottom: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShoppingCart size={14} />}
        {isPending ? (isHe ? 'שומר...' : 'Сохранение...') : (isHe ? 'מכור' : 'Продать')}
      </button>
      <button onClick={handleClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
        {isHe ? 'ביטול' : 'Отмена'}
      </button>
    </div>
  )

  return (
    <Modal open={isOpen} onClose={handleClose} darkHeader showCloseButton={false} width="680px" dir={dir} contentClassName="!p-0">
      <TrinityModalShell open={isOpen} onClose={handleClose}
        icon={<ShoppingCart />}
        title={isHe ? 'מכירת מוצר' : 'Продажа товара'}
        subtitle={product.name}
        dir={dir} sidebarExtra={sidebar}>
        <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

          {/* Product info */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e40af', margin: 0 }}>{product.name}</p>
              <p style={{ fontSize: 11, color: '#3b82f6', margin: '2px 0 0' }}>{isHe ? 'כמות במלאי:' : 'В наличии:'} <strong>{product.quantity} {product.unit}</strong></p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8' }}>₪{product.sell_price.toFixed(2)}</div>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 14px' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                {isHe ? 'כמות' : 'Количество'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="number" min="1" max={product.quantity} value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)} dir="ltr"
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 18, fontWeight: 800, color: '#1d4ed8', outline: 'none' }} />
            </div>
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                {isHe ? 'מחיר' : 'Цена'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input type="number" step="0.01" min="0" value={price}
                onChange={e => setPrice(parseFloat(e.target.value) || 0)} dir="ltr"
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 18, fontWeight: 800, color: '#16a34a', outline: 'none' }} />
            </div>
          </div>

          {/* Client search */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
            <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {isHe ? 'לקוח (אופציונלי)' : 'Клиент (необязательно)'}
            </label>
            {selectedClient ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={15} color="#3b82f6" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', margin: 0 }}>{selectedClient.first_name} {selectedClient.last_name}</p>
                  {selectedClient.phone && <p style={{ fontSize: 11, color: '#3b82f6', margin: 0 }}>{selectedClient.phone}</p>}
                </div>
                <button type="button" onClick={() => setSelectedClient(null)}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={12} color="#6366f1" />
                </button>
              </div>
            ) : (
              <TrinityMobileSearch
                data={clients?.data || []}
                searchKeys={['first_name', 'last_name', 'phone']}
                minChars={2}
                placeholder={isHe ? 'חיפוש לקוח...' : 'Поиск клиента...'}
                onSelect={c => setSelectedClient(c)}
                renderItem={c => (
                  <div>
                    <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                )}
                locale={isHe ? 'he' : 'ru'}
                dropDirection="up"
              />
            )}
          </div>

          {/* Payment methods */}
          <div>
            <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              {isHe ? 'אמצעי תשלום' : 'Способ оплаты'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => {
                const active = paymentMethod === m.value
                return (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12,
                      border: `1.5px solid ${active ? m.border : '#e8edf4'}`,
                      background: active ? m.bg : '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? m.color : '#64748b' }}>
                      {isHe ? m.labelHe : m.labelRu}
                    </span>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Total */}
          <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{isHe ? 'סה"כ' : 'Итого'}</p>
              <p style={{ fontSize: 11, color: '#22c55e', margin: '2px 0 0' }}>{quantity} {isHe ? 'יח׳' : 'шт'} × ₪{price.toFixed(2)}</p>
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', margin: 0 }}>₪{total.toFixed(2)}</p>
          </div>

        </div>
      </TrinityModalShell>
    </Modal>
  )
}
