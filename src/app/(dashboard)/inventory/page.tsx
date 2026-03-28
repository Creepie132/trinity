'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import { useFeatures } from '@/hooks/useFeatures'
import { useEffect, useRef, useCallback } from 'react'
import {
  Package, Plus, Camera, Search, Trash2, LayoutGrid, List,
  AlertTriangle, TrendingUp, Archive, PackagePlus, X,
  Edit, ShoppingCart
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { UnifiedProductDialog } from '@/components/inventory/UnifiedProductDialog'
import { QuickReceiveModal } from '@/components/inventory/QuickReceiveModal'
import { BarcodeScanner } from '@/components/inventory/BarcodeScannerLazy'
import { useModalStore } from '@/store/useModalStore'
import type { Product } from '@/types/inventory'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoSectionBanner } from '@/components/demo/DemoSectionBanner'
import { DemoLimitModal } from '@/components/demo/DemoLimitModal'
import { ProductDetailSheet } from '@/components/inventory/ProductDetailSheet'
import { toast } from 'sonner'

// ─── Swipe Row (мобиль) ──────────────────────────────────────────────────────
function SwipeProductRow({ product, locale, onEdit, onDelete, onQuickReceive, onClick }: {
  product: Product; locale: string
  onEdit: () => void; onDelete: () => void; onQuickReceive: () => void; onClick: () => void
}) {
  const l = locale === 'he'
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const ACTIONS_WIDTH = 168 // 3 кнопки × 56px
  const isLow = product.quantity > 0 && product.min_quantity > 0 && product.quantity <= product.min_quantity

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; setDragging(true) }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const dx = startX.current - e.touches[0].clientX
    setOffset(Math.min(ACTIONS_WIDTH, Math.max(0, dx)))
  }
  const onTouchEnd = () => {
    setDragging(false)
    setOffset(offset > ACTIONS_WIDTH / 2 ? ACTIONS_WIDTH : 0)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2" style={{ touchAction: 'pan-y' }}>
      {/* Action buttons revealed on swipe */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
        <button onClick={onQuickReceive}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-emerald-500 text-white text-[10px] font-bold">
          <PackagePlus size={15} />
          {l ? 'קבל' : 'Приход'}
        </button>
        <button onClick={onEdit}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-indigo-500 text-white text-[10px] font-bold">
          <Edit size={15} />
          {l ? 'ערוך' : 'Ред.'}
        </button>
        <button onClick={onDelete}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-red-500 text-white text-[10px] font-bold">
          <Trash2 size={15} />
          {l ? 'מחק' : 'Удалить'}
        </button>
      </div>

      {/* Main row — slides left to reveal actions */}
      <div
        onClick={() => { if (offset > 10) { setOffset(0); return } onClick() }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        className="relative bg-white border border-slate-100 px-4 py-3 flex items-center gap-3 cursor-pointer transition-transform"
        style={{ transform: `translateX(-${offset}px)`, transition: dragging ? 'none' : 'transform 0.25s ease' }}>
        <div className="w-11 h-11 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            : <Package size={18} className="text-slate-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate text-slate-800">{product.name}</p>
            {isLow && <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 truncate">{product.category || '—'}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-xl ${
            product.quantity === 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {product.quantity === 0 ? (l ? 'אזל' : 'Нет') : `${product.quantity}`}
          </span>
          <span className="text-sm font-bold text-slate-700 w-14 text-right">₪{product.sell_price || 0}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Product Card (Grid view) ─────────────────────────────────────────────────
function ProductCard({ product, locale, onDelete, onClick }: {
  product: Product; locale: string; onDelete: (e: React.MouseEvent) => void; onClick: () => void
}) {
  const l = locale === 'he'
  const stockPercent = product.min_quantity > 0
    ? Math.min(100, Math.round((product.quantity / product.min_quantity) * 100))
    : product.quantity > 0 ? 100 : 0
  const stockColor = product.quantity === 0 ? 'bg-red-500' : stockPercent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
  const isLow = product.quantity > 0 && product.min_quantity > 0 && product.quantity <= product.min_quantity

  return (
    <div onClick={onClick}
      className="group bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col items-center cursor-pointer
        hover:shadow-xl hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 relative overflow-hidden">
      {isLow && (
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <AlertTriangle size={9} />{l ? 'נמוך' : 'Мало'}
        </span>
      )}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex items-center justify-center mb-4 shadow-inner">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <Package size={32} className="text-slate-300" />}
      </div>
      <h3 className="text-sm font-bold text-center mb-1 line-clamp-2 min-h-[2.5rem] text-slate-800">{product.name}</h3>
      {product.category && (
        <span className="text-[11px] text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full mb-3">{product.category}</span>
      )}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${stockColor}`} style={{ width: `${stockPercent}%` }} />
      </div>
      <div className="w-full flex items-center justify-between mb-4">
        <span className="text-lg font-black text-slate-800">₪{product.sell_price || product.purchase_price || 0}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
          product.quantity === 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {product.quantity === 0 ? (l ? 'אזל' : 'Нет') : `${product.quantity} ${l ? 'יח' : 'шт'}`}
        </span>
      </div>
      <button onClick={onDelete}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 text-xs font-medium transition-colors">
        <Trash2 size={12} />{l ? 'מחק' : 'Удалить'}
      </button>
    </div>
  )
}

// ─── Product Row (Desktop list view) ─────────────────────────────────────────
function ProductRow({ product, locale, onDelete, onClick }: {
  product: Product; locale: string; onDelete: (e: React.MouseEvent) => void; onClick: () => void
}) {
  const l = locale === 'he'
  const isLow = product.quantity > 0 && product.min_quantity > 0 && product.quantity <= product.min_quantity

  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 cursor-pointer
        hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <div className="w-11 h-11 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <Package size={18} className="text-slate-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate text-slate-800">{product.name}</p>
          {isLow && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-slate-400 truncate">{product.category || '—'}</p>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
          product.quantity === 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {product.quantity === 0 ? (l ? 'אזל' : 'Нет') : `${product.quantity} ${l ? 'יח' : 'шт'}`}
        </span>
        <span className="text-sm font-bold text-slate-700 w-16 text-right">₪{product.sell_price || product.purchase_price || 0}</span>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const l = locale === 'he'
  const router = useRouter()
  const features = useFeatures()
  const deleteProduct = useDeleteProduct()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'out_of_stock' | 'in_stock'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [quickReceiveOpen, setQuickReceiveOpen] = useState(false)
  const [quickReceiveProduct, setQuickReceiveProduct] = useState<Product | null>(null)
  const { isDemo } = useDemoMode()
  const [demoLimitOpen, setDemoLimitOpen] = useState(false)

  const { openModal } = useModalStore()
  const { data: products = [], isLoading } = useProducts()

  useEffect(() => {
    if (!features.isLoading && !features.hasInventory && !features.isActive) {
      router.push('/dashboard')
    }
  }, [features.hasInventory, features.isActive, features.isLoading, router])

  const filteredProducts = useMemo(() => {
    let result = products
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      )
    }
    if (categoryFilter !== 'all') result = result.filter(p => p.category === categoryFilter)
    if (stockFilter === 'out_of_stock') result = result.filter(p => (p.quantity || 0) === 0)
    else if (stockFilter === 'in_stock') result = result.filter(p => (p.quantity || 0) > 0)
    return result
  }, [products, searchQuery, categoryFilter, stockFilter])

  // ✅ useDeleteProduct hook — optimistic update + invalidation встроены в хук
  const handleDeleteProduct = useCallback(async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    if (!confirm(l ? 'למחוק את המוצר?' : 'Удалить товар?')) return
    try {
      await deleteProduct.mutateAsync(productId)
      toast.success(l ? 'המוצר נמחק' : 'Товар удалён')
    } catch (err: any) {
      toast.error(err.message || (l ? 'שגיאה' : 'Ошибка'))
    }
  }, [deleteProduct, l])

  const handleProductClick = useCallback((product: Product) => {
    setDetailProduct(product)
  }, [])

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) handleProductClick(product)
    else setCreateDialogOpen(true)
    setScannerOpen(false)
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
  const totalValue = products.reduce((s, p: any) => s + (p.sell_price || 0) * (p.quantity || 0), 0)
  const outOfStockCount = products.filter((p: any) => (p.quantity || 0) === 0).length
  const activeCount = products.filter((p: any) => (p.quantity || 0) > 0).length
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.min_quantity > 0 && p.quantity <= p.min_quantity).length

  if (isLoading) return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-24 bg-gray-200 rounded-xl" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-200 rounded-2xl" />
          <div className="h-10 w-28 bg-gray-200 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-6">

      {isDemo && <DemoSectionBanner section="inventory" used={products.length} />}
      <DemoLimitModal open={demoLimitOpen} onClose={() => setDemoLimitOpen(false)} section="inventory" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Package className="w-6 h-6 text-blue-600" />
          {l ? 'מלאי' : 'Склад'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setScannerOpen(true)} className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:shadow-md transition-all">
            <Camera size={18} className="text-slate-600" />
          </button>
          <button onClick={() => setQuickReceiveOpen(true)}
            className="px-3 py-2 rounded-2xl bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all">
            <PackagePlus size={16} />
            <span className="hidden sm:inline">{l ? 'קבל' : 'Приход'}</span>
          </button>
          <button
            onClick={() => {
              if (isDemo && products.length >= 5) { setDemoLimitOpen(true); return }
              setCreateDialogOpen(true)
            }}
            className="px-3 py-2 rounded-2xl bg-blue-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all">
            <Plus size={16} />
            <span className="hidden sm:inline">{l ? 'הוסף' : 'Добавить'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <button onClick={() => { setStockFilter('all'); setCategoryFilter('all') }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-4 text-start text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-2 mb-2"><Archive size={14} className="opacity-70" /><p className="text-[11px] opacity-80">{l ? 'שווי מלאי' : 'Стоимость'}</p></div>
          <p className="text-xl font-black">₪{totalValue.toLocaleString()}</p>
        </button>
        <button
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            lowStockCount > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200' : 'bg-white border border-slate-100 text-slate-700'
          }`}>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={14} className={lowStockCount > 0 ? 'opacity-70' : 'text-slate-400'} /><p className={`text-[11px] ${lowStockCount > 0 ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'מלאי נמוך' : 'Заканчивается'}</p></div>
          <p className={`text-xl font-black ${lowStockCount > 0 ? '' : 'text-amber-500'}`}>{lowStockCount}</p>
        </button>
        <button onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            stockFilter === 'out_of_stock' ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200' : 'bg-white border border-slate-100'
          }`}>
          <div className="flex items-center gap-2 mb-2"><X size={14} className={stockFilter === 'out_of_stock' ? 'opacity-70' : 'text-slate-400'} /><p className={`text-[11px] ${stockFilter === 'out_of_stock' ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'אזל' : 'Нет в наличии'}</p></div>
          <p className={`text-xl font-black ${stockFilter === 'out_of_stock' ? '' : 'text-red-500'}`}>{outOfStockCount}</p>
        </button>
        <button onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            stockFilter === 'in_stock' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200' : 'bg-white border border-slate-100'
          }`}>
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className={stockFilter === 'in_stock' ? 'opacity-70' : 'text-slate-400'} /><p className={`text-[11px] ${stockFilter === 'in_stock' ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'פעילים' : 'Активных'}</p></div>
          <p className="text-xl font-black">{activeCount}</p>
        </button>
      </div>

      {/* ── Search + View Toggle ── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder={l ? 'חיפוש...' : 'Поиск...'} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{l ? 'תו נוסף...' : 'Ещё символ...'}</span>
          )}
        </div>
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          <button onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        <button onClick={() => setCategoryFilter('all')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}>
          {l ? 'הכל' : 'Все'}
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── Products ── */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <Package size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">
            {searchQuery.length >= 2 ? (l ? 'לא נמצאו תוצאות' : 'Ничего не найдено') : (l ? 'אין מוצרים' : 'Нет товаров')}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product: any, i: number) => (
            <div key={product.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-fade-in">
              <ProductCard product={product} locale={locale}
                onDelete={(e) => handleDeleteProduct(e, product.id)}
                onClick={() => handleProductClick(product)} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Мобиль — свайп-ряды, десктоп — обычные ряды */}
          <p className="md:hidden text-[10px] text-slate-400 text-center mb-2">{l ? 'החלק שמאלה לפעולות' : 'Свайп влево — действия'}</p>
          <div className="md:hidden space-y-0">
            {filteredProducts.map((product: any) => (
              <SwipeProductRow
                key={product.id}
                product={product}
                locale={locale}
                onClick={() => handleProductClick(product)}
                onEdit={() => { setEditProduct(product); setDetailProduct(null) }}
                onDelete={() => handleDeleteProduct({ stopPropagation: () => {} } as any, product.id)}
                onQuickReceive={() => { setQuickReceiveProduct(product); setQuickReceiveOpen(true) }}
              />
            ))}
          </div>
          <div className="hidden md:block space-y-2">
            {filteredProducts.map((product: any, i: number) => (
              <div key={product.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in">
                <ProductRow product={product} locale={locale}
                  onDelete={(e) => handleDeleteProduct(e, product.id)}
                  onClick={() => handleProductClick(product)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <UnifiedProductDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        mode="create"
      />
      <UnifiedProductDialog
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        mode="edit"
        product={editProduct}
      />
      <ProductDetailSheet
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        product={detailProduct}
        onEdit={(p) => { setDetailProduct(null); setEditProduct(p) }}
      />
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />
      {quickReceiveOpen && (
        <QuickReceiveModal
          products={quickReceiveProduct ? [quickReceiveProduct, ...products.filter(p => p.id !== quickReceiveProduct.id)] : (products as Product[])}
          locale={locale}
          onClose={() => { setQuickReceiveOpen(false); setQuickReceiveProduct(null) }}
        />
      )}
    </div>
  )
}
