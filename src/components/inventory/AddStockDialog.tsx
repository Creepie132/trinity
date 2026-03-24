'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTransaction } from '@/hooks/useInventory'
import { toast } from 'sonner'
import { Loader2, PackagePlus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
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

  const isHe = language === 'he'

  return (
    <Modal open={open} onClose={onClose} darkHeader width="680px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0">
      <TrinityModalShell open={open} onClose={onClose} icon={<PackagePlus />}
        title={t('inventory.addStockDialog.title')} subtitle={product.name}
        dir={isHe ? 'rtl' : 'ltr'}
        sidebarExtra={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Stock preview */}
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>+{quantity}</div>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{isHe ? 'כמות להוסיף' : 'Добавить'}</div>
            </div>
            {product.quantity !== undefined && (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '7px 8px', textAlign: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{product.quantity + quantity} {product.unit}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{isHe ? 'יהיה במלאי' : 'Будет на складе'}</div>
              </div>
            )}
            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
            <button onClick={handleSubmit} disabled={createTransaction.isPending}
              style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: createTransaction.isPending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {createTransaction.isPending ? <Loader2 size={14} /> : <PackagePlus size={14} />}
              {createTransaction.isPending ? t('common.saving') : t('inventory.addStockDialog.confirm')}
            </button>
            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
              {t('common.cancel')}
            </button>
          </div>
        }>
      <div className="space-y-4" style={{ padding: '20px 18px 24px' }}>
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
      </TrinityModalShell>
    </Modal>
  )
}
