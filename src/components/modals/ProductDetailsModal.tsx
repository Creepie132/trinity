'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Package, Edit, ShoppingCart, Plus, ArrowRightLeft, Hash, DollarSign, Tag, AlertTriangle } from 'lucide-react'
import { useBranches } from '@/hooks/useBranches'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'

export function ProductDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const { isDemo } = useDemoMode()
  const [demoSellOpen, setDemoSellOpen] = useState(false)
  const queryClient = useQueryClient()

  const isOpen = isModalOpen('product-details')
  const data = getModalData('product-details')

  const { data: branches = [] } = useBranches()
  const hasActiveBranches = branches.some(b => b.is_active)

  if (!data?.product) return null
  const { product, locale = 'he' } = data
  const isHe = locale === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const T = {
    productDetails: isHe ? 'פרטי מוצר' : 'Детали товара',
    quantity:       isHe ? 'כמות' : 'Количество',
    sellPrice:      isHe ? 'מחיר מכירה' : 'Цена продажи',
    minQuantity:    isHe ? 'כמות מינימלית' : 'Мин. количество',
    category:       isHe ? 'קטגוריה' : 'Категория',
    edit:           isHe ? 'ערוך' : 'Редактировать',
    sell:           isHe ? 'מכור' : 'Продать',
    addStock:       isHe ? 'הוסף מלאי' : 'Добавить',
    transfer:       isHe ? 'העברה' : 'Перевод',
    close:          isHe ? 'סגור' : 'Закрыть',
    outOfStock:     isHe ? 'אזל המלאי' : 'Нет в наличии',
    lowStock:       isHe ? 'מלאי נמוך' : 'Мало',
    inStock:        isHe ? 'במלאי' : 'В наличии',
    purchasePrice:  isHe ? 'מחיר קנייה' : 'Цена закупки',
  }

  const stockStatus =
    product.quantity === 0
      ? { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: T.outOfStock, icon: '🔴' }
      : product.quantity <= (product.min_quantity || 0)
      ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: T.lowStock, icon: '🟡' }
      : { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: T.inStock, icon: '🟢' }

  const handleEditClick    = () => { closeModal('product-details'); openModal('product-edit',     { product }) }
  const handleAddStockClick= () => { closeModal('product-details'); openModal('product-add-stock',{ product }) }
  const handleTransferClick= () => { closeModal('product-details'); openModal('product-transfer', { product, locale }) }
  const handleSellClick    = () => {
    if (isDemo) { setDemoSellOpen(true); return }
    closeModal('product-details'); openModal('product-sell', { product })
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Stock badge */}
      <div style={{ background: stockStatus.bg, border: `0.5px solid ${stockStatus.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: stockStatus.color, lineHeight: 1 }}>{product.quantity}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: stockStatus.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{stockStatus.label}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{product.unit}</div>
      </div>
      {/* Price */}
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>₪{product.sell_price.toFixed(2)}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{T.sellPrice}</div>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
      {/* Sell */}
      <button onClick={handleSellClick} disabled={product.quantity === 0 || isDemo}
        style={{ padding: '9px 10px', borderRadius: 9, border: 'none', marginBottom: 5,
          background: (product.quantity === 0 || isDemo) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          color: (product.quantity === 0 || isDemo) ? 'rgba(255,255,255,0.2)' : '#fff',
          fontSize: 11, fontWeight: 600, cursor: (product.quantity === 0 || isDemo) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <ShoppingCart size={13} />{T.sell}
      </button>
      {/* Add stock */}
      <button onClick={handleAddStockClick}
        style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Plus size={13} />{T.addStock}
      </button>
      {/* Transfer */}
      {hasActiveBranches && (
        <button onClick={handleTransferClick} disabled={product.quantity === 0}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: product.quantity === 0 ? 'not-allowed' : 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: product.quantity === 0 ? 0.4 : 1 }}>
          <ArrowRightLeft size={13} />{T.transfer}
        </button>
      )}
      {/* Edit */}
      <button onClick={handleEditClick}
        style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Edit size={13} />{T.edit}
      </button>
      {/* Close */}
      <button onClick={() => closeModal('product-details')}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
        {T.close}
      </button>
    </div>
  )

  return (
    <>
      <Modal open={isOpen} onClose={() => closeModal('product-details')} darkHeader showCloseButton={false} width="660px" dir={dir} contentClassName="!p-0">
        <TrinityModalShell open={isOpen} onClose={() => closeModal('product-details')}
          icon={<Package />}
          title={product.name}
          subtitle={product.category || T.productDetails}
          dir={dir}
          sidebarExtra={sidebar}
          footerContent={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <AdminDeleteButton type="product" id={product.id}
                onDeleted={() => { closeModal('product-details'); queryClient.invalidateQueries({ queryKey: ['products'] }) }} />
              <button onClick={() => closeModal('product-details')}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1e293b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {isHe ? 'סגור' : 'Закрыть'}
              </button>
            </div>
          }
        >
          <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

            {/* Product image (if any) */}
            {product.image_url && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <img src={product.image_url} alt={product.name}
                  style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: '2px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Quantity */}
              <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Hash size={12} color="#94a3b8" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{T.quantity}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: stockStatus.color, margin: 0 }}>
                  {product.quantity} <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{product.unit}</span>
                </p>
                {(product.min_quantity > 0) && (
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {product.quantity <= product.min_quantity && <AlertTriangle size={9} color="#f59e0b" />}
                    {isHe ? 'מינ׳:' : 'Мин:'} {product.min_quantity}
                  </p>
                )}
              </div>

              {/* Sell price */}
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <DollarSign size={12} color="#16a34a" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{T.sellPrice}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', margin: 0 }}>₪{product.sell_price.toFixed(2)}</p>
                {product.purchase_price > 0 && (
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0' }}>{T.purchasePrice}: ₪{product.purchase_price.toFixed(2)}</p>
                )}
              </div>

              {/* Min quantity */}
              <div style={{ background: 'linear-gradient(135deg,#fefce8,#fef9c3)', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Hash size={12} color="#d97706" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{T.minQuantity}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#d97706', margin: 0 }}>
                  {product.min_quantity || 0} <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{product.unit}</span>
                </p>
              </div>

              {/* Category */}
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #ddd6fe', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Tag size={12} color="#7c3aed" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{T.category}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#5b21b6', margin: 0 }}>{product.category || '—'}</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.6 }}>{product.description}</p>
              </div>
            )}

            {/* Barcode / SKU */}
            {(product.barcode || product.sku) && (
              <div className="space-y-2">
                {product.barcode && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{isHe ? 'ברקוד' : 'Штрих-код'}</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{product.barcode}</span>
                  </div>
                )}
                {product.sku && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{isHe ? 'מק"ט' : 'Артикул'}</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{product.sku}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </TrinityModalShell>
      </Modal>
      <DemoLimitModal open={demoSellOpen} onClose={() => setDemoSellOpen(false)} section="visits" />
    </>
  )
}
