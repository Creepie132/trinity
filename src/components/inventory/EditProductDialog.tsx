'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateProduct } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Camera, Upload, X, Loader2, Save, Package } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { BarcodeScanner } from './BarcodeScannerLazy'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import type { Product } from '@/types/inventory'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { compressImage } from '@/lib/compress-image'

interface EditProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function EditProductDialog({ open, onClose, product }: EditProductDialogProps) {
  const { t, language } = useLanguage()
  const updateProduct = useUpdateProduct()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    barcode: '',
    sku: '',
    category: '',
    purchase_price: undefined as number | undefined,
    sell_price: 0,
    quantity: 0,
    min_quantity: 0,
    unit: 'יחידה',
    image_url: undefined as string | undefined,
  })

  useEffect(() => {
    if (product && open) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        category: product.category || '',
        purchase_price: product.purchase_price,
        sell_price: product.sell_price || 0,
        quantity: product.quantity || 0,
        min_quantity: product.min_quantity || 0,
        unit: product.unit || 'יחידה',
        image_url: product.image_url,
      })
      setImagePreview(null)
    }
  }, [product, open])

  const categories = [
    { value: 'beauty', label: t('inventory.category.beauty') },
    { value: 'hair', label: t('inventory.category.hair') },
    { value: 'nails', label: t('inventory.category.nails') },
    { value: 'equipment', label: t('inventory.category.equipment') },
    { value: 'other', label: t('inventory.category.other') },
  ]

  const units = [
    { value: 'יחידה', label: t('inventory.unit.piece') },
    { value: 'קילוגרם', label: t('inventory.unit.kg') },
    { value: 'ליטר', label: t('inventory.unit.liter') },
    { value: 'אריזה', label: t('inventory.unit.package') },
  ]

  const handleSubmit = async () => {
    if (!product) return

    if (!formData.name || !formData.sell_price) {
      toast.error(t('common.fillRequired'))
      return
    }

    try {
      await updateProduct.mutateAsync({ id: product.id, data: formData })
      toast.success(t('common.success'))
      onClose()
    } catch (error: any) {
      toast.error(error.message || t('common.error'))
    }
  }

  const handleBarcodeScanned = (barcode: string) => {
    setFormData({ ...formData, barcode })
    setScannerOpen(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'he' ? 'יש להעלות קובץ תמונה' : 'Загрузите файл изображения')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'he' ? 'גודל התמונה חורג מ-5MB' : 'Размер изображения превышает 5MB')
      return
    }

    try {
      setUploading(true)
      const compressed = await compressImage(file, 1200, 0.82)
      const supabase = createSupabaseBrowserClient()

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      const filePath = `inventory/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(filePath, compressed, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('inventory').getPublicUrl(filePath)

      setFormData({ ...formData, image_url: data.publicUrl })
      setImagePreview(URL.createObjectURL(compressed))
      toast.success(language === 'he' ? 'התמונה הועלתה בהצלחה' : 'Изображение загружено')
    } catch (error: any) {
      toast.error(error.message || (language === 'he' ? 'שגיאה בהעלאת התמונה' : 'Ошибка загрузки изображения'))
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: undefined })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!product) return null

  const isHe = language === 'he'

  return (
    <>
      <Modal open={open} onClose={onClose} darkHeader showCloseButton={false} width="780px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0" size="xl">
        <TrinityModalShell open={open} onClose={onClose} icon={<Package />}
          title={t('inventory.edit')} subtitle={formData.name || product.name}
          dir={isHe ? 'rtl' : 'ltr'}
          sidebarExtra={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(imagePreview || formData.image_url) && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <img src={imagePreview || formData.image_url} alt="" style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }} />
                </div>
              )}
              {formData.sell_price > 0 && (
                <div style={{ background: 'rgba(34,197,94,0.12)', border: '0.5px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>₪{formData.sell_price.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{isHe ? 'מחיר מכירה' : 'Цена продажи'}</div>
                </div>
              )}
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
              <button onClick={handleSubmit} disabled={updateProduct.isPending}
                style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: updateProduct.isPending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {updateProduct.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                {updateProduct.isPending ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
            </div>
          }>
          <div style={{ padding: '20px 18px 24px' }} className="space-y-4">

            {/* Name */}
            <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                {t('inventory.name')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('inventory.name')} required
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 600, color: '#1e293b', outline: 'none', boxShadow: 'none' }} />
            </div>

            {/* Image Upload */}
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14, padding: '12px 14px' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
                {isHe ? 'תמונה' : 'Фотография'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {imagePreview || formData.image_url ? (
                  <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', flexShrink: 0 }}>
                    <img src={imagePreview || formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={handleRemoveImage}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 12, border: '2px dashed #cbd5e1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={20} color="#94a3b8" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ width: '100%', padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Upload size={13} />
                    {uploading ? (isHe ? 'מעלה...' : 'Загрузка...') : (isHe ? 'העלה תמונה' : 'Загрузить фото')}
                  </button>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0' }}>{isHe ? 'עד 5MB, JPG, PNG, GIF' : 'До 5MB, JPG, PNG, GIF'}</p>
                </div>
              </div>
            </div>

            {/* Barcode + SKU */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.barcode')}</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder={t('inventory.barcode')}
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13, fontWeight: 500, color: '#334155', outline: 'none' }} />
                  <button type="button" onClick={() => setScannerOpen(true)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Camera size={13} color="#64748b" />
                  </button>
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.sku')}</label>
                <input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder={t('inventory.sku')}
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 13, fontWeight: 500, color: '#334155', outline: 'none' }} />
              </div>
            </div>

            {/* Category + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1.5px solid #ddd6fe', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.category')}</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 13, fontWeight: 600, color: '#5b21b6', boxShadow: 'none', height: 'auto' }}>
                    <SelectValue placeholder={t('inventory.category')} />
                  </SelectTrigger>
                  <SelectContent>{categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.unit')}</label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 13, fontWeight: 600, color: '#16a34a', boxShadow: 'none', height: 'auto' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.description')}</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('inventory.description')} rows={2}
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 13, color: '#78350f', resize: 'none', outline: 'none', boxShadow: 'none' }} />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.purchasePrice')}</label>
                <input type="number" step="0.01" value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0.00" dir="ltr"
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 700, color: '#475569', outline: 'none' }} />
              </div>
              <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  {t('inventory.sellPrice')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="number" step="0.01" value={formData.sell_price || ''}
                  onChange={(e) => setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00" required dir="ltr"
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 700, color: '#16a34a', outline: 'none' }} />
              </div>
            </div>

            {/* Quantity + Min */}
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  {t('inventory.quantity')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input type="number" value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0" required dir="ltr"
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 700, color: '#1d4ed8', outline: 'none' }} />
              </div>
              <div style={{ background: 'linear-gradient(135deg,#fefce8,#fef9c3)', border: '1.5px solid #fde68a', borderRadius: 14, padding: '12px 14px' }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('inventory.minQuantity')}</label>
                <input type="number" value={formData.min_quantity || ''}
                  onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="0" dir="ltr"
                  style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 700, color: '#d97706', outline: 'none' }} />
              </div>
            </div>

          </div>
          </TrinityModalShell>
        </Modal>
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />
    </>
  )
}
