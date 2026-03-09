'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateProduct } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { BarcodeScanner } from './BarcodeScanner'
import Modal from '@/components/ui/Modal'
import type { CreateProductDTO } from '@/types/inventory'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface CreateProductDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateProductDialog({ open, onClose }: CreateProductDialogProps) {
  const { t, language } = useLanguage()
  const createProduct = useCreateProduct()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<CreateProductDTO>({
    name: '',
    description: '',
    barcode: '',
    sku: '',
    category: '',
    purchase_price: undefined,
    sell_price: 0,
    quantity: 0,
    min_quantity: 0,
    unit: 'יחידה',
    image_url: undefined,
  })

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
    if (!formData.name || !formData.sell_price) {
      toast.error(t('common.fillRequired'))
      return
    }

    try {
      await createProduct.mutateAsync(formData)
      toast.success(t('common.success'))
      onClose()
      setFormData({
        name: '',
        description: '',
        barcode: '',
        sku: '',
        category: '',
        purchase_price: undefined,
        sell_price: 0,
        quantity: 0,
        min_quantity: 0,
        unit: 'יחידה',
        image_url: undefined,
      })
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
      toast.error(error.message || (language === 'he' ? 'שגיאה בהעלאת התמונה' : 'Ошибка загрузки изображения'))
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: undefined })
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('inventory.newProduct')}
        width="580px"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={createProduct.isPending}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
            >
              {createProduct.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createProduct.isPending ? t('common.saving') : t('inventory.create')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">{t('inventory.name')} <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('inventory.name')}
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label htmlFor="image">{language === 'he' ? 'תמונה' : 'Фотография'}</Label>
            <div className="flex items-center gap-4">
              {imagePreview || formData.image_url ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                  <img src={imagePreview || formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input ref={fileInputRef} id="image" type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full py-2 px-4 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? (language === 'he' ? 'מעלה...' : 'Загрузка...') : (language === 'he' ? 'העלה תמונה' : 'Загрузить фото')}
                </button>
                <p className="text-xs text-gray-500 mt-1">{language === 'he' ? 'עד 5MB, JPG, PNG, GIF' : 'До 5MB, JPG, PNG, GIF'}</p>
              </div>
            </div>
          </div>

          {/* Barcode with Scanner */}
          <div>
            <Label htmlFor="barcode">{t('inventory.barcode')}</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder={t('inventory.barcode')}
              />
              <button type="button" onClick={() => setScannerOpen(true)} className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SKU */}
          <div>
            <Label htmlFor="sku">{t('inventory.sku')}</Label>
            <Input id="sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder={t('inventory.sku')} />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">{t('inventory.category')}</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger><SelectValue placeholder={t('inventory.category')} /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">{t('inventory.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('inventory.description')}
              rows={2}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase_price">{t('inventory.purchasePrice')}</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                value={formData.purchase_price || ''}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="sell_price">{t('inventory.sellPrice')} <span className="text-red-500">*</span></Label>
              <Input
                id="sell_price"
                type="number"
                step="0.01"
                value={formData.sell_price}
                onChange={(e) => setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">{t('inventory.quantity')} <span className="text-red-500">*</span></Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="min_quantity">{t('inventory.minQuantity')}</Label>
              <Input
                id="min_quantity"
                type="number"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Unit */}
          <div>
            <Label htmlFor="unit">{t('inventory.unit')}</Label>
            <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />
    </>
  )
}
