'use client'

import { useModalStore } from '@/store/useModalStore'
import ModalWrapper from '../ModalWrapper'
import { Package, DollarSign, Hash, FileText, X, Edit, ShoppingCart } from 'lucide-react'

export function ProductDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  
  const isOpen = isModalOpen('product-details')
  const data = getModalData('product-details')
  
  if (!data?.product) return null

  const { product, locale = 'he' } = data

  const t = {
    he: {
      productDetails: 'פרטי מוצר',
      name: 'שם',
      quantity: 'כמות',
      price: 'מחיר',
      purchasePrice: 'מחיר רכישה',
      sellPrice: 'מחיר מכירה',
      description: 'תיאור',
      barcode: 'ברקוד',
      sku: 'מק"ט',
      category: 'קטגוריה',
      unit: 'יחידה',
      minQuantity: 'כמות מינימלית',
      edit: 'ערוך',
      sell: 'מכור',
      addStock: 'הוסף מלאי',
    },
    ru: {
      productDetails: 'Детали товара',
      name: 'Название',
      quantity: 'Количество',
      price: 'Цена',
      purchasePrice: 'Цена закупки',
      sellPrice: 'Цена продажи',
      description: 'Описание',
      barcode: 'Штрихкод',
      sku: 'Артикул',
      category: 'Категория',
      unit: 'Единица',
      minQuantity: 'Мин. количество',
      edit: 'Редактировать',
      sell: 'Продать',
      addStock: 'Добавить',
    },
  }

  const text = t[locale as 'he' | 'ru'] || t.he

  const handleEditClick = () => {
    closeModal('product-details')
    openModal('product-edit', { product })
  }

  const handleSellClick = () => {
    closeModal('product-details')
    openModal('product-sell', { product })
  }

  const handleAddStockClick = () => {
    closeModal('product-details')
    openModal('product-add-stock', { product })
  }

  const getStatusColor = () => {
    if (product.quantity === 0) return 'bg-red-500'
    if (product.quantity <= product.min_quantity) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (product.quantity === 0) return locale === 'he' ? 'אזל המלאי' : 'Нет в наличии'
    if (product.quantity <= product.min_quantity) return locale === 'he' ? 'מלאי נמוך' : 'Мало'
    return locale === 'he' ? 'במלאי' : 'В наличии'
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={() => closeModal('product-details')}>
      <div className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{text.productDetails}</h2>
          <button
            onClick={() => closeModal('product-details')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white mb-3">
            <Package size={40} />
          </div>
          <h3 className="text-2xl font-bold text-center">{product.name}</h3>
          
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Количество */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Hash size={18} className="text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{text.quantity}</p>
              <p className="text-lg font-bold">
                {product.quantity} {product.unit}
              </p>
            </div>
          </div>

          {/* Цены */}
          <div className="grid grid-cols-2 gap-3">
            {product.purchase_price && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <DollarSign size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{text.purchasePrice}</p>
                  <p className="text-sm font-bold">₪{product.purchase_price.toFixed(2)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <DollarSign size={18} className="text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">{text.sellPrice}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  ₪{product.sell_price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Описание */}
          {product.description && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">{text.description}</p>
              </div>
              <p className="text-sm">{product.description}</p>
            </div>
          )}

          {/* Дополнительная информация */}
          <div className="grid grid-cols-2 gap-3">
            {product.barcode && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{text.barcode}</p>
                <p className="text-sm font-mono">{product.barcode}</p>
              </div>
            )}
            {product.sku && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{text.sku}</p>
                <p className="text-sm font-mono">{product.sku}</p>
              </div>
            )}
            {product.category && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{text.category}</p>
                <p className="text-sm">{product.category}</p>
              </div>
            )}
            {product.min_quantity > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{text.minQuantity}</p>
                <p className="text-sm font-bold">{product.min_quantity} {product.unit}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSellClick}
            disabled={product.quantity === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={18} />
            {text.sell}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddStockClick}
              className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              <Package size={18} />
              {text.addStock}
            </button>
            <button
              onClick={handleEditClick}
              className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              <Edit size={18} />
              {text.edit}
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  )
}
