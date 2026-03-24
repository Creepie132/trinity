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
      const supabase = createSupabaseBrowserClient()

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `inventory/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('inventory')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('inventory').getPublicUrl(filePath)

      setFormData({ ...formData, image_url: data.publicUrl })
      setImagePreview(URL.createObjectURL(file))
      toast.success(language === 'he' ? 'התמונה הועלתה בהצלחה' : 'Изображение загружено')
    } catch (error: any) {
      console.error('Error uploading image:', error)
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
  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"

  return (
    <>
      <Modal open={open} onClose={onClose} darkHeader width="780px" dir={isHe ? 'rtl' : 'ltr'} contentClassName="!p-0">
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
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{isHe ? 'מחיר מכירה' : 'Цена продажи'}</div>
                </div>
              )}
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
              <button onClick={handleSubmit} disabled={updateProduct.isPending}
                style={{ padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', background: updateProduct.isPending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {updateProduct.isPending ? <Loader2 size={14} /> : <Save size={14} />}
                {updateProduct.isPending ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
            </div>
          }>
          <div className="space-y-4" style={{ padding: '20px 18px 24px' }}>
          {/* Name */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {t('inventory.name')} <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('inventory.name')}
              required
              className={inputClass}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {language === 'he' ? 'תמונה' : 'Фотография'}
            </label>
            <div className="flex items-center gap-4">
              {imagePreview || formData.image_url ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={imagePreview || formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading
                    ? (language === 'he' ? 'מעלה...' : 'Загрузка...')
                    : (language === 'he' ? 'העלה תמונה' : 'Загрузить фото')}
                </button>
              </div>
            </div>
          </div>

          {/* Barcode with Scanner */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.barcode')}</label>
            <div className="flex gap-2">
              <input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder={t('inventory.barcode')}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-4 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SKU & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.sku')}</label>
              <input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={t('inventory.sku')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.category')}</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t('inventory.category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.description')}</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('inventory.description')}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.purchasePrice')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price || ''}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('inventory.sellPrice')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sell_price}
                onChange={(e) => setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          {/* Quantity & Min */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                {t('inventory.quantity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                required
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.minQuantity')}</label>
              <input
                type="number"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('inventory.unit')}</label>
            <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
          </TrinityModalShell>
        </Modal>
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />
    </>
  )
}
