'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, ZoomIn, X, Package } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
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
      <Modal open={isOpen} onClose={onBack} darkHeader showCloseButton={false} width="700px" dir={isRTL ? 'rtl' : 'ltr'}>
        <TrinityModalShell
          open={isOpen}
          onClose={onBack}
          icon={<Package />}
          title={product.name}
          subtitle={`₪${price.toFixed(2)}`}
          dir={isRTL ? 'rtl' : 'ltr'}
          sidebarExtra={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Фото товара в сайдбаре */}
              {product.image_url ? (
                <div
                  onClick={() => setZoomed(true)}
                  style={{
                    borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in',
                    background: 'rgba(255,255,255,0.06)', marginBottom: 4,
                  }}
                >
                  <img src={product.image_url} alt={product.name}
                    style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{
                  height: 80, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, marginBottom: 4,
                }}>📦</div>
              )}
              {/* Кнопка добавить */}
              <button
                onClick={() => onAdd(product)}
                style={{
                  padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'var(--trinity-accent, #4a6fa5)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                }}
              >
                ➕ {t.add}
              </button>
              <button
                onClick={onBack}
                style={{
                  padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                  border: '0.5px solid rgba(255,255,255,0.2)',
                  background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 12,
                }}
              >
                {isRTL ? '→' : '←'} {t.back}
              </button>
            </div>
          }
        >

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
        </TrinityModalShell>
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
