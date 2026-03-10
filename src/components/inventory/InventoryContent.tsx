import { useState } from 'react'
import { useInventory } from '@/hooks/useInventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Tag } from 'lucide-react'
import ProductActions from './ProductActions'
import { Product } from '@/types/inventory'
import { cn } from '@/lib/utils'
import AddProductSheet from './AddProductSheet'

export default function InventoryContent() {
  const [search, setSearch] = useState('')
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const { products, isLoadingProducts } = useInventory()

  const filteredProducts = products.filter(product => 
    product.is_active && (
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase())
    )
  )

  const getQuantityColor = (product: Product) => {
    if (product.quantity <= 0) return 'text-red-500'
    if (product.quantity <= product.min_quantity) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Склад</h1>
        <Button onClick={() => setIsAddingProduct(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Поиск по названию, штрихкоду..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Products table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="text-right">Количество</TableHead>
              <TableHead className="text-right">Цена закупки</TableHead>
              <TableHead className="text-right">Цена продажи</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingProducts ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? 'Ничего не найдено' : 'Товары пока не добавлены'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{product.name}</span>
                      {(product.sku || product.barcode) && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {product.sku || product.barcode}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category && (
                      <Badge variant="secondary">{product.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-medium", getQuantityColor(product))}>
                      {product.quantity} {product.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.purchase_price ? `${product.purchase_price}₪` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.sell_price}₪
                  </TableCell>
                  <TableCell className="text-right">
                    <ProductActions product={product} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddProductSheet 
        open={isAddingProduct} 
        onClose={() => setIsAddingProduct(false)} 
      />
    </div>
  )
}