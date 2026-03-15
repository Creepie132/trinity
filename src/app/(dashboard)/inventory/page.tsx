'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProducts } from '@/hooks/useProducts'
import { useFeatures } from '@/hooks/useFeatures'
import { useEffect } from 'react'
import {
  Package, Plus, Camera, Search, Trash2, LayoutGrid, List,
  AlertTriangle, TrendingUp, Archive, PackagePlus, Minus, X, Check
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { CreateProductDialog } from '@/components/inventory/CreateProductDialog'
import { BarcodeScanner } from '@/components/inventory/BarcodeScannerLazy'
import { useModalStore } from '@/store/useModalStore'
import { useBranch } from '@/contexts/BranchContext'
import type { Product } from '@/types/inventory'

// ─── Quick Receive Modal ──────────────────────────────────────────────────────
interface QuickReceiveProps {
  products: Product[]
  locale: string
  onClose: () => void
  onSave: (items: { id: string; qty: number }[]) => Promise<void>
}

function QuickReceiveModal({ products, locale, onClose, onSave }: QuickReceiveProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const l = locale === 'he'

  const filtered = search.length >= 1
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const setQty = (id: string, delta: number) => {
    setQuantities(prev => {
      const cur = prev[id] || 0
      const next = Math.max(0, cur + delta)
      if (next === 0) { const n = { ...prev }; delete n[id]; return n }
      return { ...prev, [id]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0)

  const handleSave = async () => {
    const items = Object.entries(quantities).map(([id, qty]) => ({ id, qty }))
    if (!items.length) return
    setSaving(true)
    await onSave(items)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <PackagePlus size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-base">{l ? 'קבלת סחורה' : 'Быстрый приход'}</h2>
              <p className="text-xs text-slate-400">{l ? 'הוסף כמות לכל מוצר' : 'Добавь количество к товарам'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pb-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={l ? 'חיפוש מוצר...' : 'Поиск товара...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {filtered.map(p => {
            const qty = quantities[p.id] || 0
            return (
              <div key={p.id} className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-all ${qty > 0 ? 'bg-emerald-50 border border-emerald-200' : 'border border-transparent'}`}>
                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <Package size={16} className="text-slate-300 m-auto mt-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{l ? 'במלאי' : 'На складе'}: {p.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(p.id, -1)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition">
                    <Minus size={14} />
                  </button>
                  <span className={`w-8 text-center text-sm font-bold ${qty > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {qty > 0 ? `+${qty}` : '0'}
                  </span>
                  <button onClick={() => setQty(p.id, 1)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={totalItems === 0 || saving}
            className={`w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              totalItems > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {l ? `קבל ${totalItems > 0 ? `+${totalItems} יחידות` : ''}` : `Принять${totalItems > 0 ? ` +${totalItems} ед.` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Card (Grid view) ─────────────────────────────────────────────────
function ProductCard({ product, locale, onDelete, onClick }: {
  product: Product; locale: string; onDelete: (e: React.MouseEvent, id: string) => void; onClick: () => void
}) {
  const l = locale === 'he'
  const stockPercent = product.min_quantity > 0
    ? Math.min(100, Math.round((product.quantity / product.min_quantity) * 100))
    : product.quantity > 0 ? 100 : 0
  const stockColor = product.quantity === 0 ? 'bg-red-500' : stockPercent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
  const isLow = product.quantity > 0 && product.min_quantity > 0 && product.quantity <= product.min_quantity

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex flex-col items-center cursor-pointer
        hover:shadow-xl hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 relative overflow-hidden"
    >
      {/* Low stock badge */}
      {isLow && (
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
          <AlertTriangle size={9} /> {l ? 'נמוך' : 'Мало'}
        </span>
      )}

      {/* Image */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex items-center justify-center mb-4 shadow-inner">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <Package size={32} className="text-slate-300" />}
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-center mb-1 line-clamp-2 min-h-[2.5rem] text-slate-800">{product.name}</h3>

      {/* Category */}
      {product.category && (
        <span className="text-[11px] text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full mb-3">{product.category}</span>
      )}

      {/* Stock bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all duration-500 ${stockColor}`} style={{ width: `${stockPercent}%` }} />
      </div>

      {/* Price + qty */}
      <div className="w-full flex items-center justify-between mb-4">
        <span className="text-lg font-black text-slate-800">₪{product.sell_price || product.purchase_price || 0}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
          product.quantity === 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {product.quantity === 0 ? (l ? 'אזל' : 'Нет') : `${product.quantity} ${l ? 'יח' : 'шт'}`}
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => onDelete(e, product.id)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
      >
        <Trash2 size={12} /> {l ? 'מחק' : 'Удалить'}
      </button>
    </div>
  )
}

// ─── Product Row (List view) ──────────────────────────────────────────────────
function ProductRow({ product, locale, onDelete, onClick }: {
  product: Product; locale: string; onDelete: (e: React.MouseEvent, id: string) => void; onClick: () => void
}) {
  const l = locale === 'he'
  const isLow = product.quantity > 0 && product.min_quantity > 0 && product.quantity <= product.min_quantity

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 cursor-pointer
        hover:shadow-md hover:border-slate-200 transition-all duration-200"
    >
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
        <button
          onClick={(e) => onDelete(e, product.id)}
          className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors"
        >
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
  const { activeOrgId } = useBranch()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'out_of_stock' | 'in_stock'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [quickReceiveOpen, setQuickReceiveOpen] = useState(false)

  const { openModal } = useModalStore()
  const { data: products = [], isLoading, refetch } = useProducts()

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

  async function handleDeleteProduct(e: React.MouseEvent, productId: string) {
    e.stopPropagation()
    if (!confirm(l ? 'למחוק את המוצר?' : 'Удалить товар?')) return
    await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    refetch()
  }

  const handleProductClick = (product: Product) => openModal('product-details', { product, locale })

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) handleProductClick(product)
    else setCreateDialogOpen(true)
    setScannerOpen(false)
  }

  const handleQuickReceiveSave = async (items: { id: string; qty: number }[]) => {
    await Promise.all(items.map(({ id, qty }) =>
      fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(activeOrgId ? { 'X-Branch-Org-Id': activeOrgId } : {}) },
        body: JSON.stringify({ quantity: (products.find(p => p.id === id)?.quantity || 0) + qty }),
      })
    ))
    refetch()
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]
  const totalValue = products.reduce((s, p: any) => s + (p.sell_price || 0) * (p.quantity || 0), 0)
  const outOfStockCount = products.filter((p: any) => (p.quantity || 0) === 0).length
  const activeCount = products.filter((p: any) => (p.quantity || 0) > 0).length
  const lowStockCount = products.filter((p: any) => p.quantity > 0 && p.min_quantity > 0 && p.quantity <= p.min_quantity).length

  if (isLoading) return <LoadingScreen />

  return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-6">

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
          <button onClick={() => setCreateDialogOpen(true)}
            className="px-3 py-2 rounded-2xl bg-blue-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all">
            <Plus size={16} />
            <span className="hidden sm:inline">{l ? 'הוסף' : 'Добавить'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {/* Total value */}
        <button onClick={() => { setStockFilter('all'); setCategoryFilter('all') }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-4 text-start text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-2 mb-2">
            <Archive size={14} className="opacity-70" />
            <p className="text-[11px] opacity-80">{l ? 'שווי מלאי' : 'Стоимость'}</p>
          </div>
          <p className="text-xl font-black">₪{totalValue.toLocaleString()}</p>
        </button>

        {/* Low stock */}
        <button onClick={() => {}}
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            lowStockCount > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200' : 'bg-white border border-slate-100 text-slate-700'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={lowStockCount > 0 ? 'opacity-70' : 'text-slate-400'} />
            <p className={`text-[11px] ${lowStockCount > 0 ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'מלאי נמוך' : 'Заканчивается'}</p>
          </div>
          <p className={`text-xl font-black ${lowStockCount > 0 ? '' : 'text-amber-500'}`}>{lowStockCount}</p>
        </button>

        {/* Out of stock */}
        <button onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            stockFilter === 'out_of_stock' ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200' : 'bg-white border border-slate-100'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <X size={14} className={stockFilter === 'out_of_stock' ? 'opacity-70' : 'text-slate-400'} />
            <p className={`text-[11px] ${stockFilter === 'out_of_stock' ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'אזל' : 'Нет в наличии'}</p>
          </div>
          <p className={`text-xl font-black ${stockFilter === 'out_of_stock' ? '' : 'text-red-500'}`}>{outOfStockCount}</p>
        </button>

        {/* Active */}
        <button onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
          className={`rounded-3xl p-4 text-start shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${
            stockFilter === 'in_stock' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200' : 'bg-white border border-slate-100'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className={stockFilter === 'in_stock' ? 'opacity-70' : 'text-slate-400'} />
            <p className={`text-[11px] ${stockFilter === 'in_stock' ? 'opacity-80' : 'text-slate-400'}`}>{l ? 'פעילים' : 'Активных'}</p>
          </div>
          <p className={`text-xl font-black ${stockFilter === 'in_stock' ? '' : ''}`}>{activeCount}</p>
        </button>
      </div>

      {/* ── Search + View Toggle ── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={l ? 'חיפוש...' : 'Поиск...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              {l ? 'תו נוסף...' : 'Ещё символ...'}
            </span>
          )}
        </div>
        {/* View mode toggle */}
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
              <ProductCard
                product={product}
                locale={locale}
                onDelete={handleDeleteProduct}
                onClick={() => handleProductClick(product)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product: any, i: number) => (
            <div key={product.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in">
              <ProductRow
                product={product}
                locale={locale}
                onDelete={handleDeleteProduct}
                onClick={() => handleProductClick(product)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <CreateProductDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScanned} />

      {quickReceiveOpen && (
        <QuickReceiveModal
          products={products as Product[]}
          locale={locale}
          onClose={() => setQuickReceiveOpen(false)}
          onSave={handleQuickReceiveSave}
        />
      )}
    </div>
  )
}
