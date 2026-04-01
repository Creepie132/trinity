'use client'
/**
 * SiteOrdersPanel — история заказов с сайта.
 * Рендерится внутри страницы /sales когда у орг есть интеграция с сайтом.
 * Пагинация: 20 заказов на страницу на десктопе, бесконечная прокрутка на мобиле.
 */
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { OrderDetailModal } from '@/components/sales/OrderDetailModal'
import { useSiteOrders, SiteOrder } from '@/hooks/useSiteOrders'
import { useLanguage } from '@/contexts/LanguageContext'
import { ShoppingBag, Package, Phone, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'

const T = {
  ru: {
    title: 'Заказы с сайта', empty: 'Нет заказов', emptyDesc: 'Заказы с вашего сайта появятся здесь',
    all: 'Все', new: 'Новые', confirmed: 'Подтверждены', shipped: 'Отправлены', delivered: 'Доставлены', cancelled: 'Отменены',
    total: 'Итого', from: 'от', prev: 'Назад', next: 'Вперёд', page: 'стр.',
    statuses: { new: 'Новый', confirmed: 'Подтверждён', shipped: 'Отправлен', delivered: 'Доставлен', cancelled: 'Отменён' },
  },
  he: {
    title: 'הזמנות מהאתר', empty: 'אין הזמנות', emptyDesc: 'הזמנות מהאתר שלך יופיעו כאן',
    all: 'הכל', new: 'חדש', confirmed: 'אושר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל',
    total: 'סה״כ', from: 'מ-', prev: 'הקודם', next: 'הבא', page: 'עמ׳',
    statuses: { new: 'חדש', confirmed: 'אושר', shipped: 'נשלח', delivered: 'נמסר', cancelled: 'בוטל' },
  },
}

const STATUS_CFG: Record<string, { icon: any; dot: string; badge: string }> = {
  new:       { icon: Clock,        dot: '#8b5cf6', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  confirmed: { icon: CheckCircle2, dot: '#3b82f6', badge: 'bg-blue-50 text-blue-700 border-blue-200'       },
  shipped:   { icon: Loader2,      dot: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-200'    },
  delivered: { icon: CheckCircle2, dot: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { icon: XCircle,      dot: '#ef4444', badge: 'bg-red-50 text-red-600 border-red-200'          },
}

function OrderRow({ order, locale, onClick }: { order: SiteOrder; locale: string; onClick: () => void }) {
  const cfg = STATUS_CFG[order.status] || STATUS_CFG.new
  const t   = T[locale as 'ru'] || T.ru
  const Icon = cfg.icon
  const firstItem = order.items?.[0]

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors active:bg-gray-100"
      style={{ borderInlineStart: `2.5px solid ${cfg.dot}` }}>
      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
        <ShoppingBag className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-gray-900">{order.customer_name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {firstItem ? `${firstItem.quantity}× ${firstItem.product_name}` : ''}
          {(order.items?.length || 0) > 1 ? ` +${(order.items.length) - 1}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-gray-900">₪{Number(order.total_amount).toFixed(0)}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border whitespace-nowrap inline-flex items-center gap-1 ${cfg.badge}`}>
          <Icon size={9} className={order.status === 'shipped' ? 'animate-pulse' : ''} />
          {t.statuses[order.status]}
        </span>
      </div>
    </div>
  )
}

interface SiteOrdersPanelProps {
  locale: string
}

export function SiteOrdersPanel({ locale }: SiteOrdersPanelProps) {
  const t   = T[locale as 'ru'] || T.ru
  const isHe = locale === 'he'
  const dir  = isHe ? 'rtl' : 'ltr'

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useSiteOrders(page, statusFilter)
  const orders   = data?.orders ?? []
  const total    = data?.total ?? 0
  const pageSize = data?.pageSize ?? 20
  const pages    = Math.ceil(total / pageSize) || 1

  const tabs = [
    { key: 'all',       label: t.all },
    { key: 'new',       label: t.new },
    { key: 'confirmed', label: t.confirmed },
    { key: 'shipped',   label: t.shipped },
    { key: 'delivered', label: t.delivered },
    { key: 'cancelled', label: t.cancelled },
  ]

  return (
    <div dir={dir} className="flex flex-col h-full">
      {/* Хедер с табами */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0 gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-500" />{t.title}
          {total > 0 && <span className="text-xs font-normal text-gray-400">({total})</span>}
        </h2>
        <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Фильтр-табы */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(0) }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all border ${
              statusFilter === tab.key
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Список */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-sm font-medium">{t.empty}</p>
            <p className="text-xs text-gray-300">{t.emptyDesc}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mx-3 mb-3">
            {orders.map(order => (
              <OrderRow key={order.id} order={order} locale={locale} onClick={() => setSelectedOrderId(order.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            {isHe ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}{t.prev}
          </button>
          <span className="text-xs text-gray-400">{t.page} {page + 1} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            {t.next}{isHe ? <ChevronLeft size={12}/> : <ChevronRight size={12}/>}
          </button>
        </div>
      )}

      {/* OrderDetailModal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}
