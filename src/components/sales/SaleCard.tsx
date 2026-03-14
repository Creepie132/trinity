'use client'

import { Sale } from '@/hooks/useSales'
import { useToggleReceipt } from '@/hooks/useSales'
import { FileText } from 'lucide-react'

interface SaleCardProps {
  sale: Sale
  locale: 'he' | 'ru'
  index: number
  onClick: (sale: Sale) => void
}

const AVATAR_COLORS = [
  ['bg-violet-100 text-violet-700', '#7c3aed'],
  ['bg-emerald-100 text-emerald-700', '#059669'],
  ['bg-orange-100 text-orange-700', '#c2410c'],
  ['bg-blue-100 text-blue-700', '#1d4ed8'],
  ['bg-pink-100 text-pink-700', '#be185d'],
  ['bg-teal-100 text-teal-700', '#0f766e'],
]

function clientInitials(sale: Sale) {
  const f = sale.clients?.first_name || ''
  const l = sale.clients?.last_name || ''
  return `${f[0] || ''}${l[0] || ''}`.toUpperCase() || '?'
}

function clientName(sale: Sale, locale: 'he' | 'ru') {
  if (sale.clients) {
    return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  }
  return locale === 'he' ? 'לקוח לא ידוע' : 'Клиент не найден'
}

function avatarColor(sale: Sale) {
  const code = (sale.clients?.first_name?.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[code][0]
}

const STATUS_LABELS = {
  he: { paid: 'שולם', partial: 'חלקי', new: 'חדש', refunded: 'הוחזר', cancelled: 'בוטל' },
  ru: { paid: 'Оплачено', partial: 'Частично', new: 'Новая', refunded: 'Возврат', cancelled: 'Отменено' },
}
const STATUS_CLASS = {
  paid:      'bg-emerald-50 text-emerald-700',
  partial:   'bg-amber-50 text-amber-700',
  new:       'bg-violet-50 text-violet-700',
  refunded:  'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
}
const BORDER_COLOR = {
  paid: 'border-l-emerald-500', partial: 'border-l-amber-400',
  new: 'border-l-violet-500', refunded: 'border-l-gray-300', cancelled: 'border-l-gray-200',
}
const METHOD_LABELS = {
  he: { cash: 'מזומן', card: 'כרטיס', bit: 'ביט', bank_transfer: 'העברה', credit_card: 'כרטיס' },
  ru: { cash: 'Наличные', card: 'Карта', bit: 'Bit', bank_transfer: 'Перевод', credit_card: 'Карта' },
}

export function SaleCard({ sale, locale, index, onClick }: SaleCardProps) {
  const toggle = useToggleReceipt()
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const sl = STATUS_LABELS[locale]
  const ml = METHOD_LABELS[locale] as Record<string, string>
  const pct = sale.total_amount > 0
    ? Math.round((Number(sale.paid_amount) / Number(sale.total_amount)) * 100) : 0

  const animDelay = `${index * 0.05}s`

  return (
    <div
      dir={dir}
      className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
        border-l-4 ${BORDER_COLOR[sale.status] || 'border-l-gray-200'}
        rounded-xl p-3 cursor-pointer transition-transform duration-200
        hover:translate-x-1 active:scale-[0.98]`}
      style={{ animation: `fadeInUp 0.35s ${animDelay} ease both` }}
      onClick={() => onClick(sale)}
    >
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center
          text-xs font-medium flex-shrink-0 ${avatarColor(sale)}`}>
          {clientInitials(sale)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {clientName(sale, locale)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {sale.sale_date}
            {sale.staff_name && (
              <span className="ms-2 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                {sale.staff_name}
              </span>
            )}
          </p>
        </div>
        <div className="text-end flex-shrink-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            ₪{Number(sale.total_amount).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {sale.sale_items?.length || 0} {locale === 'he' ? 'פריטים' : 'поз.'}
          </p>
        </div>
      </div>

      {/* Items pills */}
      {sale.sale_items && sale.sale_items.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-700">
          {sale.sale_items.map(item => (
            <span key={item.id}
              className="text-xs bg-gray-50 dark:bg-gray-700 border border-gray-100
                dark:border-gray-600 rounded-md px-2 py-0.5 text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {item.quantity}×
              </span>{' '}{item.product_name}
              <span className="text-gray-400 ms-1">₪{item.unit_price}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2 gap-2">
        {/* Method */}
        <span className="text-xs bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-md
          text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-600">
          {(sale as any).payment_method
            ? ml[(sale as any).payment_method] || (sale as any).payment_method
            : locale === 'he' ? 'מזומן' : 'Наличные'}
        </span>

        <div className="flex items-center gap-2">
          {/* חשבונית receipt toggle */}
          <button
            onClick={e => {
              e.stopPropagation()
              toggle.mutate({ id: sale.id, receipt_sent: !sale.receipt_sent })
            }}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium
              transition-all duration-200 border
              ${sale.receipt_sent
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600'}`}
            title={sale.receipt_sent
              ? (locale === 'he' ? 'חשבונית נשלחה' : 'Чек отправлен')
              : (locale === 'he' ? 'חשבונית לא נשלחה' : 'Чек не выбит')}
          >
            <FileText size={10} />
            <span>{locale === 'he' ? 'חשבונית' : 'Чек'}</span>
            <span>{sale.receipt_sent ? '✓' : '—'}</span>
          </button>

          {/* Status badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${STATUS_CLASS[sale.status] || 'bg-gray-100 text-gray-500'}`}>
            {sl[sale.status] || sale.status}
          </span>
        </div>
      </div>

      {/* Progress bar for partial */}
      {sale.status === 'partial' && (
        <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
