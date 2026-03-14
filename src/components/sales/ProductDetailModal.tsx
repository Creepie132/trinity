'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, ZoomIn, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useLanguage } from '@/contexts/LanguageContext'

interface Product {
  id: string
  name: string
  sell_price: number
  price?: number
  brand?: string
  unit_volume?: string
  unit?: string
  description?: string
  image_url?: string
  quantity?: number
  stock_quantity?: number
}

interface Props {
  isOpen: boolean
  product: Product
  onAdd: (product: Product) => void
  onBack: () => void
}

export default function ProductDetailModal({ isOpen, product, onAdd, onBack }: Props) {
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const [zoomed, setZoomed] = useState(false)

  const price = product.sell_price ?? product.price ?? 0
  const stock = product.quantity ?? product.stock_quantity

  const l = {
    he: { back: 'חזרה לקטלוג', unitPrice: 'מחיר יחידה', brand: 'מותג', size: 'נפח / גודל', stock: 'במלאי', unit: 'יח׳', desc: 'תיאור', add: 'הוסף לעסקה', cancel: 'ביטול' },
    ru: { back: 'Назад к каталогу', unitPrice: 'Цена за единицу', brand: 'Бренд', size: 'Объём / Размер', stock: 'В наличии', unit: 'шт', desc: 'Описание', add: 'Добавить в сделку', cancel: 'Отмена' },
  }
  const t = l[language as 'he' | 'ru'] || l.ru

  return (
    <>
      <Modal open={isOpen} onClose={onBack} title={product.name} width="520px" dir={isRTL ? 'rtl' : 'ltr'}>
        <button onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 mb-4 transition-colors">
          {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t.back}
        </button>

        {product.image_url ? (
          <div className="relative mb-4 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 group cursor-zoom-in" onClick={() => setZoomed(true)}>
            <img src={product.image_url} alt={product.name} className="w-full h-52 object-contain" />
            <div className="absolute top-2 left-2 bg-white/80 backdrop-blur rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        ) : (
          <div className="w-full h-32 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4">
            <span className="text-5xl">📦</span>
          </div>
        )}

        <div className="space-y-2 mb-6">
          <div className="flex items-baseline justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <span className="text-sm text-gray-500">{t.unitPrice}</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₪{price.toFixed(2)}</span>
          </div>

          {[
            { label: t.brand, value: product.brand },
            { label: t.size, value: product.unit_volume || product.unit },
            { label: t.stock, value: stock !== undefined ? `${stock} ${t.unit}` : undefined },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="flex justify-between items-center py-2 px-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-400">{f.label}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.value}</span>
            </div>
          ))}

          {product.description && (
            <div className="pt-2 px-1">
              <p className="text-xs text-gray-400 mb-1">{t.desc}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => onAdd(product)}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2">
            ➕ {t.add}
          </button>
          <button onClick={onBack}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
            {t.cancel}
          </button>
        </div>
      </Modal>

      {zoomed && product.image_url && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button onClick={() => setZoomed(false)} className="absolute top-4 left-4 text-white/70 hover:text-white">
            <X className="w-8 h-8" />
          </button>
          <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}
