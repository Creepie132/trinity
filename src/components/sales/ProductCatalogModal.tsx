'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useLanguage } from '@/contexts/LanguageContext'
import ProductDetailModal from './ProductDetailModal'

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
  onClose: () => void
  products: Product[]
  onAddProduct: (product: Product) => void
}

export default function ProductCatalogModal({ isOpen, onClose, products, onAddProduct }: Props) {
  const { language } = useLanguage()
  const isRTL = language === 'he'
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)

  const l = {
    he: { title: 'קטלוג מוצרים', search: '...חיפוש לפי שם, מותג, תיאור', empty: 'לא נמצאו מוצרים', stock: 'במלאי', tap: 'לחץ על מוצר לפרטים', products: 'מוצרים' },
    ru: { title: 'Каталог товаров', search: 'Поиск по названию, бренду...', empty: 'Товары не найдены', stock: 'В наличии', tap: 'Нажмите на товар для деталей', products: 'товаров' },
  }
  const t = l[language as 'he' | 'ru'] || l.ru

  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  )

  // Normalize price field
  const getPrice = (p: Product) => p.sell_price ?? p.price ?? 0
  const getStock = (p: Product) => p.quantity ?? p.stock_quantity

  return (
    <>
      <Modal
        open={isOpen && !selected}
        onClose={onClose}
        title={t.title}
        width="640px"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="relative mb-4">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">{t.empty}</p>
          ) : filtered.map(product => (
            <button
              key={product.id}
              onClick={() => setSelected(product)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-xl">📦</div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{product.name}</p>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0">
                    ₪{getPrice(product).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                  {(product.unit_volume || product.unit) && (
                    <span className="text-xs text-gray-400">· {product.unit_volume || product.unit}</span>
                  )}
                  {getStock(product) !== undefined && (
                    <span className={`text-xs ${getStock(product)! > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                      · {t.stock}: {getStock(product)}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{product.description}</p>
                )}
              </div>

              {isRTL ? <ChevronLeft className="w-4 h-4 text-gray-300 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          {filtered.length} {t.products} · {t.tap}
        </p>
      </Modal>

      {selected && (
        <ProductDetailModal
          isOpen
          product={selected}
          onAdd={(p) => { onAddProduct(p); setSelected(null); onClose() }}
          onBack={() => setSelected(null)}
        />
      )}
    </>
  )
}
