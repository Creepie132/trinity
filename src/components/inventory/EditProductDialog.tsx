'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { useUpdateProduct } from '@/hooks/useProducts'
import { toast } from 'sonner'
import { Camera, ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { BarcodeScanner } from './BarcodeScanner'
import ModalWrapper from '@/components/ModalWrapper'
import type { Product } from '@/types/inventory'

interface EditProductDialogProps {
  open: boolean
  onClose: () => void
  product: Product | null
}

export function EditProductDialog({ open, onClose, product }: EditProductDialogProps) {
  const { t, language } = useLanguage()
  const updateProduct = useUpdateProduct()
  const [scannerOpen, setScannerOpen] = useState(false)

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
      })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

  if (!product) return null

  return (
    <>
      <ModalWrapper isOpen={open} onClose={onClose}>
        <div className="w-full max-w-2xl p-6">
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
            <h2 className="text-2xl font-bold pr-12">{t('inventory.edit')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">
                {t('inventory.name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('inventory.name')}
                required
                className="bg-white dark:bg-gray-800"
              />
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
                  className="bg-white dark:bg-gray-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* SKU */}
            <div>
              <Label htmlFor="sku">{t('inventory.sku')}</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={t('inventory.sku')}
                className="bg-white dark:bg-gray-800"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">{t('inventory.category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800">
                  <SelectValue placeholder={t('inventory.category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
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
                rows={3}
                className="bg-white dark:bg-gray-800"
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchase_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="sell_price">
                  {t('inventory.sellPrice')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sell_price"
                  type="number"
                  step="0.01"
                  value={formData.sell_price}
                  onChange={(e) =>
                    setFormData({ ...formData, sell_price: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  required
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">
                  {t('inventory.quantity')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  required
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="min_quantity">{t('inventory.minQuantity')}</Label>
                <Input
                  id="min_quantity"
                  type="number"
                  value={formData.min_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="unit">{t('inventory.unit')}</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  )
}
