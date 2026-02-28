'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProducts, useLowStockProducts } from '@/hooks/useProducts'
import { useFeatures } from '@/hooks/useFeatures'
import { Package, Plus, Camera, Search } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { CreateProductDialog } from '@/components/inventory/CreateProductDialog'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { useModalStore } from '@/store/useModalStore'
import type { Product } from '@/types/inventory'

export default function InventoryPage() {
  const { language, t } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const router = useRouter()
  const features = useFeatures()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const { openModal } = useModalStore()

  // Fetch all products without search - only once
  const { data: products = [], isLoading, refetch } = useProducts()
  const { data: lowStockProducts = [] } = useLowStockProducts()

  // Feature check
  useEffect(() => {
    if (!features.isLoading && !features.hasInventory && !features.isActive) {
      router.push('/dashboard')
    }
  }, [features.hasInventory, features.isActive, features.isLoading, router])

  // Local filtering - only when 2+ characters
  const filteredProducts = useMemo(() => {
    let result = products

    // Search filter (local, starting from 2 characters)
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase()
      result = result.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query)) ||
        (product.category && product.category.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((product) => product.category === categoryFilter)
    }

    return result
  }, [products, searchQuery, categoryFilter])

  // Categories
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  )

  // KPI calculations
  const totalValue = products.reduce((sum: number, p: any) => 
    sum + (p.sell_price || 0) * (p.quantity || 0), 0
  )
  const outOfStockCount = products.filter((p: any) => (p.quantity || 0) === 0).length
  const activeCount = products.filter((p: any) => (p.quantity || 0) > 0).length

  // Low stock products
  const lowStock = products.filter((p: any) => 
    p.quantity > 0 && p.min_quantity && p.quantity <= p.min_quantity
  )

  const handleProductClick = (product: Product) => {
    openModal('product-details', { product, locale })
  }

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      handleProductClick(product)
    } else {
      setCreateDialogOpen(true)
    }
    setScannerOpen(false)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" />
          {locale === 'he' ? 'מלאי' : 'Склад'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white shadow-card border border-card flex items-center justify-center hover:shadow-card-hover transition"
          >
            <Camera size={18} />
          </button>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            {locale === 'he' ? 'הוסף' : 'Добавить'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-card border border-card p-4">
          <p className="text-xs text-slate-400">
            {locale === 'he' ? 'שווי מלאי' : 'Стоимость склада'}
          </p>
          <p className="text-2xl font-bold mt-1">₪{totalValue.toLocaleString()}</p>
        </div>

        <button
          onClick={() => setCategoryFilter('all')}
          className="bg-white rounded-2xl shadow-card border border-card p-4 text-start hover:shadow-card-hover transition-shadow"
        >
          <p className="text-xs text-slate-400">
            {locale === 'he' ? 'אזל מהמלאי' : 'Нет в наличии'}
          </p>
          <p className="text-2xl font-bold mt-1 text-red-500">{outOfStockCount}</p>
        </button>

        <div className="bg-white rounded-2xl shadow-card border border-card p-4">
          <p className="text-xs text-slate-400">
            {locale === 'he' ? 'פריטים פעילים' : 'Активных товаров'}
          </p>
          <p className="text-2xl font-bold mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-card p-3 mb-6 flex items-center gap-3 overflow-x-auto">
          <span className="flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            ⚠️ {locale === 'he' ? 'מלאי נמוך' : 'Мало'}: {lowStock.length}
          </span>
          {lowStock.slice(0, 8).map((p: any) => (
            <div
              key={p.id}
              className="flex-shrink-0 w-10 h-10 rounded-xl border-2 border-red-400 animate-pulse overflow-hidden bg-slate-100 flex items-center justify-center"
              title={p.name}
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={16} className="text-slate-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder={locale === 'he' ? 'חיפוש...' : 'Поиск...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-card bg-white shadow-card focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {locale === 'he' ? 'הקלד עוד תו אחד...' : 'Введите ещё символ...'}
          </div>
        )}
      </div>

      {/* Category Filter - Horizontal Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-card text-slate-600'
          }`}
        >
          {locale === 'he' ? 'הכל' : 'Все'}
        </button>
        {categories.filter((cat): cat is string => !!cat).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-card text-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white rounded-[24px] shadow-md p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">
              {searchQuery.length >= 2
                ? locale === 'he'
                  ? 'לא נמצאו תוצאות'
                  : 'Ничего не найдено'
                : locale === 'he'
                ? 'אין מוצרים'
                : 'Нет товаров'}
            </p>
          </div>
        ) : (
          filteredProducts.map((product: any) => {
            const stockPercent = product.min_quantity
              ? Math.min(100, Math.round((product.quantity / product.min_quantity) * 100))
              : 100
            const stockColor =
              stockPercent <= 25
                ? 'bg-red-500'
                : stockPercent <= 50
                ? 'bg-amber-500'
                : 'bg-emerald-500'

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white rounded-[24px] shadow-md p-6 flex flex-col items-center cursor-pointer hover:shadow-lg transition-shadow"
              >
                {/* Иконка товара */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center mb-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={32} className="text-slate-300" />
                  )}
                </div>

                {/* Название */}
                <h3 className="text-base font-bold text-center mb-1 line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h3>

                {/* Категория */}
                <p className="text-xs text-slate-400 mb-3 text-center">
                  {product.category || (locale === 'he' ? 'ללא קטגוריה' : 'Без категории')}
                </p>

                {/* Прогресс-бар количества */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all ${stockColor}`}
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>

                {/* Цена */}
                <div className="w-full text-center mb-2">
                  <p className="text-lg font-bold text-slate-700">
                    ₪{product.sell_price || product.purchase_price || 0}
                  </p>
                </div>

                {/* Количество */}
                <div className="w-full text-center">
                  <p
                    className={`text-sm font-semibold ${
                      product.quantity === 0 ? 'text-red-500' : 'text-slate-600'
                    }`}
                  >
                    {locale === 'he' ? 'במלאי' : 'В наличии'}: {product.quantity}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Dialogs */}
      <CreateProductDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  )
}
