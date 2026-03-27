'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { Badge } from '@/components/ui/badge'
import { useInventoryTransactions } from '@/hooks/useInventory'
import { useDeleteProduct } from '@/hooks/useProducts'
import { useBranches } from '@/hooks/useBranches'
import { toast } from 'sonner'
import { Package, Edit, Trash2, ShoppingCart, Plus, Clock, Loader2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { format } from 'date-fns'
import type { Product } from '@/types/inventory'
import { AddStockDialog } from './AddStockDialog'
import { TransferRequestDialog } from './TransferRequestDialog'
import { useModalStore } from '@/store/useModalStore'
import { useDemoMode } from '@/hooks/useDemoMode'

interface ProductDetailSheetProps {
  open: boolean
  onClose: () => void
  product: Product | null
  onEdit?: (product: Product) => void
}

export function ProductDetailSheet({ open, onClose, product, onEdit }: ProductDetailSheetProps) {
  const { t, language } = useLanguage()
  const { isDemo } = useDemoMode()
  const { data: transactions } = useInventoryTransactions(product?.id)
  const deleteProduct = useDeleteProduct()
  const { openModal } = useModalStore()
  const { data: branches = [] } = useBranches()
  const hasActiveBranches = branches.some((b) => b.is_active)
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)

  if (!product) return null
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const stockStatus = product.quantity === 0
    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: t('inventory.outOfStock') }
    : product.quantity <= product.min_quantity
    ? { color: '#f59e0b', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', label: t('inventory.lowStock') }
    : { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: t('inventory.inStock') }

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(product.id)
      toast.success(t('common.success'))
      setShowDeleteConfirm(false)
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  const getTransactionColor = (type: string) =>
    (type === 'purchase' || type === 'return') ? '#22c55e' : '#ef4444'
  const getTransactionSign = (type: string) =>
    (type === 'purchase' || type === 'return') ? '+' : '-'

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Product image or icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
        ) : (
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(245,158,11,0.4)' }}>
            <Package size={24} color="#fff" />
          </div>
        )}
      </div>
      {/* Stock count */}
      <div style={{ background: stockStatus.bg, border: `0.5px solid ${stockStatus.border}`, borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: stockStatus.color, letterSpacing: '-1px', lineHeight: 1 }}>{product.quantity}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: stockStatus.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{stockStatus.label}</div>
      </div>
      {/* Price */}
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>₪{product.sell_price.toFixed(2)}</div>
        <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{isHe ? 'מחיר מכירה' : 'Цена продажи'}</div>
      </div>
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', marginBottom: 10 }} />
      {/* Actions */}
      <button onClick={() => { if (isDemo) return; onClose(); openModal('sale-unified', { preloadedProduct: product }) }}
        disabled={product.quantity === 0 || isDemo}
        style={{ padding: '9px 10px', borderRadius: 9, border: 'none', background: (product.quantity === 0 || isDemo) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: (product.quantity === 0 || isDemo) ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 11, fontWeight: 600, cursor: (product.quantity === 0 || isDemo) ? 'not-allowed' : 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <ShoppingCart size={13} />{t('inventory.sell')}
      </button>
      <button onClick={() => setAddStockDialogOpen(true)}
        style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#34d399', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Plus size={13} />{t('inventory.addStock')}
      </button>
      {hasActiveBranches && (
        <button onClick={() => setTransferDialogOpen(true)}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <ArrowRightLeft size={13} />{isHe ? 'העברה' : 'Перевод'}
        </button>
      )}
      {onEdit && (
        <button onClick={() => { onEdit(product); onClose() }}
          style={{ padding: '9px 10px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Edit size={13} />{t('inventory.edit')}
        </button>
      )}
      <button onClick={() => setShowDeleteConfirm(true)}
        style={{ padding: '8px 10px', borderRadius: 9, border: '0.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Trash2 size={13} />{t('inventory.delete')}
      </button>
      <button onClick={onClose}
        style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
        {isHe ? 'סגור' : 'Закрыть'}
      </button>
    </div>
  )

  // Delete confirm
  if (showDeleteConfirm) {
    return (
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        title={isHe ? 'מחיקת מוצר' : 'Удаление товара'} width="400px"
        footer={
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteProduct.isPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button onClick={handleDelete} disabled={deleteProduct.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50">
              {deleteProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleteProduct.isPending ? t('common.deleting') : t('inventory.delete')}
            </button>
          </div>
        }>
        <p className="text-gray-600">{isHe ? `האם למחוק את ${product.name}?` : `Удалить ${product.name}?`}</p>
      </Modal>
    )
  }

  return (
    <>
      <Modal open={open} onClose={onClose} darkHeader showCloseButton={false} width="720px" dir={dir} contentClassName="!p-0">
        <TrinityModalShell open={open} onClose={onClose} icon={<Package />}
          title={product.name} subtitle={product.category || t('inventory.details')}
          dir={dir} sidebarExtra={sidebar}>
          <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

            {/* Description */}
            {product.description && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 }}>{product.description}</p>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('inventory.quantity')}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: stockStatus.color, margin: 0 }}>{product.quantity} <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{product.unit}</span></p>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{isHe ? 'מינ׳:' : 'Мин:'} {product.min_quantity}</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t('inventory.sellPrice')}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', margin: 0 }}>₪{product.sell_price.toFixed(2)}</p>
                {product.purchase_price && (
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{isHe ? 'קנייה:' : 'Закуп:'} ₪{product.purchase_price.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Meta info */}
            <div className="space-y-2">
              {product.barcode && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t('inventory.barcode')}</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155' }}>{product.barcode}</span>
                </div>
              )}
              {product.sku && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t('inventory.sku')}</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155' }}>{product.sku}</span>
                </div>
              )}
              {product.category && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{t('inventory.category')}</span>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
              )}
            </div>

            {/* Transaction history */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} />{t('inventory.transactions')}
              </p>
              {!transactions || transactions.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>{t('inventory.noTransactions')}</p>
              ) : (
                <div style={{ border: '0.5px solid #e8edf4', borderRadius: 12, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                  {transactions.slice(0, 10).map((tr, i) => (
                    <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: i > 0 ? '0.5px solid #f1f5f9' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: (tr.type === 'purchase' || tr.type === 'return') ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(tr.type === 'purchase' || tr.type === 'return')
                          ? <TrendingUp size={13} color="#16a34a" />
                          : <TrendingDown size={13} color="#dc2626" />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{t(`inventory.transaction.${tr.type}`)}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>{format(new Date(tr.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: getTransactionColor(tr.type), margin: 0 }}>{getTransactionSign(tr.type)}{tr.quantity}</p>
                        {tr.total_price && <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>₪{tr.total_price.toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </TrinityModalShell>
      </Modal>

      <AddStockDialog open={addStockDialogOpen} onClose={() => setAddStockDialogOpen(false)} product={product} />
      <TransferRequestDialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} preloadedProduct={product} />
    </>
  )
}
