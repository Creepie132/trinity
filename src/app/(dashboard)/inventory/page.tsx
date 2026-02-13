'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useProducts } from '@/hooks/useProducts'
import { useFeatures } from '@/hooks/useFeatures'
import { Package, Plus, Camera, Search } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { CreateProductDialog } from '@/components/inventory/CreateProductDialog'
import { ProductDetailSheet } from '@/components/inventory/ProductDetailSheet'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import type { Product } from '@/types/inventory'

type StockFilter = 'all' | 'low' | 'out'

export default function InventoryPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const features = useFeatures()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const { data: products, isLoading } = useProducts(searchQuery)

  // Feature check
  useEffect(() => {
    if (!features.isLoading && !features.hasInventory && !features.isActive) {
      router.push('/dashboard')
    }
  }, [features.hasInventory, features.isActive, features.isLoading, router])

  // Filter products
  const filteredProducts = products?.filter((product) => {
    // Category filter
    if (categoryFilter && product.category !== categoryFilter) {
      return false
    }

    // Stock filter
    if (stockFilter === 'low' && product.quantity > product.min_quantity) {
      return false
    }
    if (stockFilter === 'out' && product.quantity !== 0) {
      return false
    }

    return true
  })

  const categories = Array.from(
    new Set(products?.map((p) => p.category).filter(Boolean))
  )

  const getQuantityBadgeColor = (product: Product) => {
    if (product.quantity === 0) {
      return 'bg-red-500 text-white'
    }
    if (product.quantity <= product.min_quantity) {
      return 'bg-yellow-500 text-white'
    }
    return 'bg-green-500 text-white'
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setDetailSheetOpen(true)
  }

  const handleBarcodeScanned = (barcode: string) => {
    // Search for product by barcode
    const product = products?.find((p) => p.barcode === barcode)
    if (product) {
      handleProductClick(product)
    } else {
      // If not found, open create dialog with barcode prefilled
      // TODO: Pass barcode to CreateProductDialog
      setCreateDialogOpen(true)
    }
    setScannerOpen(false)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-8 h-8" />
            {t('inventory.title')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('inventory.newProduct')}</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
          <Button
            onClick={() => setScannerOpen(true)}
            variant="outline"
            className="gap-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{t('inventory.scanBarcode')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('inventory.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-700"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 bg-white dark:bg-gray-700">
                <SelectValue placeholder={t('inventory.filterCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{t('inventory.filterCategory')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Filter */}
            <Select
              value={stockFilter}
              onValueChange={(v) => setStockFilter(v as StockFilter)}
            >
              <SelectTrigger className="w-full md:w-40 bg-white dark:bg-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.filterAll')}</SelectItem>
                <SelectItem value="low">{t('inventory.filterLowStock')}</SelectItem>
                <SelectItem value="out">{t('inventory.filterOutOfStock')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {!filteredProducts || filteredProducts.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('inventory.emptyState')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t('inventory.emptyState.desc')}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.newProduct')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('inventory.name')}</TableHead>
                      <TableHead>{t('inventory.barcode')}</TableHead>
                      <TableHead>{t('inventory.category')}</TableHead>
                      <TableHead className="text-right">
                        {t('inventory.sellPrice')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('inventory.quantity')}
                      </TableHead>
                      <TableHead>{t('inventory.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => handleProductClick(product)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm text-gray-600 dark:text-gray-300">
                            {product.barcode || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">
                          ₪{product.sell_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getQuantityBadgeColor(product)}>
                            {product.quantity} {product.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.quantity === 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {t('inventory.outOfStock')}
                            </span>
                          ) : product.quantity <= product.min_quantity ? (
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                              {t('inventory.lowStock')}
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {t('inventory.inStock')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                onClick={() => handleProductClick(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {product.name}
                      </h3>
                      {product.category && (
                        <Badge variant="outline" className="mt-1">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        ₪{product.sell_price.toFixed(2)}
                      </p>
                      <Badge className={`mt-1 ${getQuantityBadgeColor(product)}`}>
                        {product.quantity} {product.unit}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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

      <ProductDetailSheet
        open={detailSheetOpen}
        onClose={() => {
          setDetailSheetOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
      />
    </div>
  )
}
