'use client'

import { useModalStore } from '@/store/useModalStore'
import ModalWrapper from '../ui/ModalWrapper'
import { Package, DollarSign, Hash, Tag, X, Edit, ShoppingCart } from 'lucide-react'

export function ProductDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  
  const isOpen = isModalOpen('product-details')
  const data = getModalData('product-details')
  
  if (!data?.product) return null

  const { product, locale = 'he' } = data

  const t = {
    he: {
      productDetails: 'פרטי מוצר',
      quantity: 'כמות',
      sellPrice: 'מחיר מכירה',
      minQuantity: 'כמות מינימלית',
      category: 'קטגוריה',
      edit: 'ערוך',
      sell: 'מכור',
      addStock: 'הוסף מלאי',
    },
    ru: {
      productDetails: 'Детали товара',
      quantity: 'Количество',
      sellPrice: 'Цена продажи',
      minQuantity: 'Мин. количество',
      category: 'Категория',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => closeModal('product-details')}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
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
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Количество */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Hash size={16} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{text.quantity}</p>
              </div>
              <p className="text-lg font-bold">
                {product.quantity} {product.unit}
              </p>
            </div>

            {/* Цена продажи */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{text.sellPrice}</p>
              </div>
              <p className="text-lg font-bold">
                ₪{product.sell_price.toFixed(2)}
              </p>
            </div>

            {/* Мин. количество */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Hash size={16} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{text.minQuantity}</p>
              </div>
              <p className="text-lg font-bold">
                {product.min_quantity || 0} {product.unit}
              </p>
            </div>

            {/* Категория */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={16} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{text.category}</p>
              </div>
              <p className="text-lg font-bold">
                {product.category || '-'}
              </p>
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
      </div>
    </div>
  )
}
