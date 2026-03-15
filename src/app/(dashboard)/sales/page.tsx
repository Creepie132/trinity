'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Upload, Search, SlidersHorizontal, TrendingUp, ShoppingBag, Receipt, BookmarkCheck, Trash2 } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSales, useSaleStats, useToggleReceipt, Sale } from '@/hooks/useSales'
import { SaleCard } from '@/components/sales/SaleCard'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawerLazy'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'
import { format } from 'date-fns'
import NewSaleModal from '@/components/sales/NewSaleModal'
import ImportSalesModal from '@/components/sales/ImportSalesModal'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  he: {
    title: 'מכירות', total: 'סה״כ', sales: 'מכירות',
    newSale: 'מכירה חדשה', import: 'ייבוא מאקסל',
    revenue: 'הכנסות', count: 'עסקאות', avg: 'ממוצע לעסקה',
    monthlyChart: 'מכירות לפי חודש', clickHint: 'לחץ על עמודה לסינון',
    all: 'הכל', paid: 'שולם', partial: 'חלקי', newStatus: 'חדש', draft: 'שמורה',
    filterAll: 'כל השיטות', cash: 'מזומן', card: 'כרטיס', bit: 'ביט',
    search: 'חיפוש לפי לקוח, מוצר, עובד...',
    syncNote: 'כל מכירה יוצרת אוטומטית רשומה בתשלומים',
    client: 'לקוח', date: 'תאריך', staff: 'עובד', amount: 'סכום',
    items: 'פריטים', method: 'שיטה', status: 'סטטוס', receipt: 'חשבונית',
    noSales: 'אין מכירות', noSalesDesc: 'צור את המכירה הראשונה שלך',
    showing: 'מציג', active: 'פעיל',
  },
  ru: {
    title: 'Продажи', total: 'Итого', sales: 'сделок',
    newSale: 'Новая сделка', import: 'Импорт из Excel',
    revenue: 'Выручка', count: 'Сделок', avg: 'Средний чек',
    monthlyChart: 'Продажи по месяцам', clickHint: 'нажмите на столбец для фильтрации',
    all: 'Все', paid: 'Оплачено', partial: 'Частично', newStatus: 'Новая', draft: 'Сохранённые',
    filterAll: 'Все способы', cash: 'Наличные', card: 'Карта', bit: 'Bit',
    search: 'Поиск по клиенту, товару, мастеру...',
    syncNote: 'Каждая продажа автоматически создаёт запись в разделе «Платежи»',
    client: 'Клиент', date: 'Дата', staff: 'Мастер', amount: 'Сумма',
    items: 'Товары', method: 'Способ', status: 'Статус', receipt: 'Чек',
    noSales: 'Нет продаж', noSalesDesc: 'Создайте первую сделку',
    showing: 'Показано', active: 'активных',
  },
}

const MONTHS_HE = ['אוק', 'נוב', 'דצמ', 'ינו', 'פבר', 'מרץ']
const MONTHS_RU = ['Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар']
const MONTH_KEYS = ['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03']
const BAR_HEIGHTS = [45, 58, 50, 72, 64, 90]

interface DraftSale {
  clientId: string
  clientName: string
  total: number
  itemCount: number
  savedAt?: string
}

function useDraftSales(refreshKey?: number): DraftSale[] {
  const [drafts, setDrafts] = useState<DraftSale[]>([])

  useEffect(() => {
    // 1. Собираем черновики из localStorage
    const raw: { clientId: string; clientName: string; total: number; itemCount: number; savedAt?: string; needsFetch: boolean }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('draft_sale_')) continue
      const clientId = key.replace('draft_sale_', '')
      try {
        const stored = localStorage.getItem(key)
        if (!stored) continue
        const parsed = JSON.parse(stored)
        const cart: { quantity: number; price: number }[] = parsed.cart || []
        const total = cart.reduce((s, item) => s + item.price * item.quantity, 0)
        const clientName = parsed.clientName || ''
        raw.push({ clientId, clientName, total, itemCount: cart.length, savedAt: parsed.savedAt, needsFetch: !clientName })
      } catch { /* skip */ }
    }

    if (raw.length === 0) { setDrafts([]); return }

    // 2. Для черновиков без имени — подтягиваем из API
    const toFetch = raw.filter(d => d.needsFetch)
    if (toFetch.length === 0) {
      setDrafts(raw.map(({ clientId, clientName, total, itemCount, savedAt }) => ({ clientId, clientName, total, itemCount, savedAt })))
      return
    }

    Promise.all(
      toFetch.map(async d => {
        try {
          const { data } = await createSupabaseBrowserClient()
            .from('clients')
            .select('id,first_name,last_name')
            .eq('id', d.clientId)
            .maybeSingle()
          return data
        } catch { return null }
      })
    ).then(results => {
      const nameMap: Record<string, string> = {}
      toFetch.forEach((d, idx) => {
        const data = results[idx]
        if (data) {
          const first = data.first_name || ''
          const last = data.last_name || ''
          nameMap[d.clientId] = `${first} ${last}`.trim() || d.clientId
          // Обновляем localStorage — чтобы в следующий раз не fetching
          try {
            const key = `draft_sale_${d.clientId}`
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              localStorage.setItem(key, JSON.stringify({ ...parsed, clientName: nameMap[d.clientId] }))
            }
          } catch { /* skip */ }
        } else {
          nameMap[d.clientId] = d.clientId
        }
      })
      setDrafts(raw.map(({ clientId, clientName, total, itemCount, savedAt }) => ({
        clientId,
        clientName: nameMap[clientId] || clientName || clientId,
        total,
        itemCount,
        savedAt,
      })))
    })
  }, [refreshKey])

  return drafts
}

const STATUS_BADGE: Record<string, string> = {
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial:   'bg-amber-50 text-amber-700 border-amber-200',
  new:       'bg-violet-50 text-violet-700 border-violet-200',
  refunded:  'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
}
const BORDER_L: Record<string, string> = {
  paid: '#10b981', partial: '#f59e0b', new: '#8b5cf6',
  refunded: '#9ca3af', cancelled: '#e5e7eb',
}
function clientName(sale: Sale, locale: string) {
  if (sale.clients) return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  return locale === 'he' ? 'לקוח לא ידוע' : 'Клиент не найден'
}
function initials(sale: Sale) {
  const f = sale.clients?.first_name || ''; const l = sale.clients?.last_name || ''
  return `${f[0]||''}${l[0]||''}`.toUpperCase() || '?'
}
const AV = ['bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700','bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700','bg-teal-100 text-teal-700']
function avColor(sale: Sale) {
  return AV[(sale.clients?.first_name?.charCodeAt(0) || 0) % AV.length]
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir   = locale === 'he' ? 'rtl' : 'ltr'
  const t     = T[locale]
  const months = locale === 'he' ? MONTHS_HE : MONTHS_RU
  const { openModal } = useModalStore()

  const [statusFilter, setStatusFilter]   = useState('all')
  const [methodFilter, setMethodFilter]   = useState('all')
  const [search, setSearch]               = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen]     = useState(false)
  const [newSaleOpen, setNewSaleOpen]     = useState(false)
  const [importOpen, setImportOpen]       = useState(false)
  const [draftRefreshKey, setDraftRefreshKey] = useState(0)

  const { data: sales = [], isLoading } = useSales({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    month: selectedMonth || undefined,
    search: search.length >= 2 ? search : undefined,
  })

  const stats = useSaleStats(sales)
  const toggleReceipt = useToggleReceipt()
  const draftSales = useDraftSales(draftRefreshKey)

  const deleteDraft = useCallback((clientId: string) => {
    localStorage.removeItem(`draft_sale_${clientId}`)
    setDraftRefreshKey(k => k + 1)
  }, [])

  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0)
    + (selectedMonth ? 1 : 0) + (search.length >= 2 ? 1 : 0)

  const filteredSales = useMemo(() => {
    if (methodFilter === 'all') return sales
    return sales.filter((s: any) => s.payment_method === methodFilter)
  }, [sales, methodFilter])

  const handleBarClick = useCallback((key: string) => {
    setSelectedMonth(prev => prev === key ? null : key)
  }, [])

  const handleSaleClick = useCallback((sale: Sale) => {
    // TODO: open detail drawer/panel
  }, [])

  return (
    <div dir={dir} className="space-y-5 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ animation: 'fadeInUp 0.4s ease both' }}>
        <div className={locale === 'he' ? 'text-center md:text-right' : 'text-center md:text-left'}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t.total}: {filteredSales.length} {t.sales}
          </p>
        </div>
        <div className="flex gap-2 justify-center md:justify-end">
          <Button variant="outline"
            className="border-amber-400 text-amber-600 hover:bg-amber-50 text-sm"
            onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 me-2" />{t.import}
          </Button>
          <Button className="bg-theme-primary text-white hover:opacity-90 text-sm"
            style={{ animation: 'pulseRing 2.5s ease-in-out infinite' }}
            onClick={() => setNewSaleOpen(true)}>
            <Plus className="w-4 h-4 me-2" />{t.newSale}
          </Button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <ShoppingBag className="w-4 h-4" />, bg: 'bg-amber-100 dark:bg-amber-900/30',
            ic: 'text-amber-600 dark:text-amber-400', val: `₪${stats.totalRevenue.toLocaleString()}`,
            label: t.revenue, delay: '0s' },
          { icon: <TrendingUp className="w-4 h-4" />, bg: 'bg-violet-100 dark:bg-violet-900/30',
            ic: 'text-violet-600 dark:text-violet-400', val: `${stats.count}`,
            label: t.count, delay: '0.07s' },
          { icon: <Receipt className="w-4 h-4" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            ic: 'text-emerald-600 dark:text-emerald-400', val: `₪${stats.avg}`,
            label: t.avg, delay: '0.14s' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100
            dark:border-gray-700 p-3 md:p-5 transition-transform hover:-translate-y-0.5"
            style={{ animation: `fadeInScale 0.4s ${c.delay} ease both` }}>
            <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center mb-2 ${c.bg}`}>
              <span className={c.ic}>{c.icon}</span>
            </div>
            <div className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-gray-100">{c.val}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Clickable bar chart ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100
        dark:border-gray-700 p-4"
        style={{ animation: 'fadeInUp 0.4s 0.1s ease both' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.monthlyChart}</span>
          <span className="text-xs text-gray-400">{t.clickHint}</span>
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {months.map((m, i) => {
            const key = MONTH_KEYS[i]
            const active = selectedMonth === key
            const h = BAR_HEIGHTS[i]
            return (
              <div key={key} className="flex flex-col items-center gap-1 flex-1 cursor-pointer group"
                onClick={() => handleBarClick(key)}>
                <div className="w-full rounded-t-sm transition-all duration-200"
                  style={{
                    height: `${h}%`,
                    background: active ? '#f59e0b' : '#fde68a',
                    opacity: selectedMonth && !active ? 0.4 : 1,
                    transform: active ? 'scaleY(1.08)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                  }} />
                <span className={`text-[9px] transition-colors ${active
                  ? 'text-amber-600 font-semibold' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {m}
                </span>
              </div>
            )
          })}
        </div>
        {selectedMonth && (
          <p className="text-xs text-amber-600 font-medium mt-2" style={{ animation: 'fadeInUp 0.2s ease both' }}>
            {locale === 'he' ? `מסנן לפי: ${months[MONTH_KEYS.indexOf(selectedMonth)]}` 
              : `Фильтр: ${months[MONTH_KEYS.indexOf(selectedMonth)]}`}
            <button className="ms-2 underline opacity-70" onClick={() => setSelectedMonth(null)}>
              {locale === 'he' ? 'נקה' : 'сбросить'}
            </button>
          </p>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5"
        style={{ animation: 'fadeInUp 0.4s 0.12s ease both' }}>
        {(['all','paid','partial','new','draft'] as const).map(s => (
          <button key={s}
            className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-1
              ${statusFilter === s
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'draft' && <BookmarkCheck size={11} />}
            {s === 'all' ? t.all : s === 'paid' ? t.paid : s === 'partial' ? t.partial : s === 'new' ? t.newStatus : t.draft}
            {s === 'draft' && draftSales.length > 0 && (
              <span className="bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {draftSales.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        <button onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100
            dark:bg-gray-800 text-sm font-medium w-full justify-center">
          <SlidersHorizontal size={15} />
          {locale === 'he' ? 'סינון' : 'Фильтры'}
          {activeFilters > 0 && (
            <span className="bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      <div className="hidden md:flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl
        border border-gray-100 dark:border-gray-700 p-3"
        style={{ animation: 'fadeInUp 0.4s 0.14s ease both' }}>
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="ps-9 bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-sm" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36 text-sm bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filterAll}</SelectItem>
            <SelectItem value="cash">{t.cash}</SelectItem>
            <SelectItem value="card">{t.card}</SelectItem>
            <SelectItem value="bit">{t.bit}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Sync note ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500
        bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        {t.syncNote}
      </div>

      {/* ── Draft sales ────────────────────────────────────────────── */}
      {statusFilter === 'draft' && (
        <div className="space-y-2">
          {draftSales.length === 0 ? (
            <EmptyState
              icon={<BookmarkCheck size={28} />}
              title={locale === 'he' ? 'אין עסקאות שמורות' : 'Нет сохранённых сделок'}
              description={locale === 'he' ? 'שמור עסקה מכרטיס לקוח' : 'Сохраните сделку из карточки клиента'}
            />
          ) : draftSales.map((d, i) => {
            const av = AV[d.clientName.charCodeAt(0) % AV.length]
            const ini = d.clientName.split(' ').map((w:string) => w[0]?.toUpperCase() || '').join('').slice(0,2) || '?'
            return (
              <div key={d.clientId}
                className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-3"
                style={{ animation: `fadeInUp 0.3s ${i * 0.04}s ease both`, borderLeft: '3px solid #f59e0b' }}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${av}`}>
                  {ini}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{d.clientName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {d.itemCount} {locale === 'he' ? 'פריטים' : 'позиций'} · ₪{d.total.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                    {locale === 'he' ? 'שמורה' : 'Сохранена'}
                  </span>
                  <button
                    onClick={() => openModal('client-sale', {
                      client: { id: d.clientId, first_name: d.clientName },
                      locale,
                    })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 active:scale-95 transition-all">
                    {locale === 'he' ? 'פתח' : 'Открыть'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(locale === 'he' ? 'למחוק את העסקה השמורה?' : 'Удалить сохранённую сделку?')) {
                        deleteDraft(d.clientId)
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 hover:text-red-600 transition-all active:scale-95 flex-shrink-0"
                    title={locale === 'he' ? 'מחק' : 'Удалить'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Mobile list ────────────────────────────────────────────────── */}
      <div className={`md:hidden space-y-2 ${statusFilter === 'draft' ? 'hidden' : ''}`}>
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100
              dark:border-gray-700 p-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-32" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                </div>
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
          ))
        ) : filteredSales.length > 0 ? (
          filteredSales.map((sale, i) => (
            <SaleCard key={sale.id} sale={sale} locale={locale} index={i} onClick={handleSaleClick} />
          ))
        ) : (
          <EmptyState
            icon={<ShoppingBag size={28} />}
            title={t.noSales}
            description={t.noSalesDesc}
            action={{ label: t.newSale, onClick: () => setNewSaleOpen(true) }}
          />
        )}
      </div>

      {/* ── Desktop table ──────────────────────────────────────────────── */}
      <div className={`hidden md:block bg-white dark:bg-gray-800 rounded-xl border
        border-gray-100 dark:border-gray-700 overflow-hidden ${statusFilter === 'draft' ? '!hidden' : ''}`}
        style={{ animation: 'fadeInUp 0.4s 0.18s ease both' }}>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {locale === 'he' ? 'טוען...' : 'Загрузка...'}
          </div>
        ) : filteredSales.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.client}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.date}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.staff}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.items}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.amount}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.receipt}</TableHead>
                <TableHead className="text-start text-gray-600 dark:text-gray-400 font-medium text-xs">{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale, i) => {
                const sl = T[locale]
                const statusLabels: Record<string, string> = {
                  paid: sl.paid, partial: sl.partial, new: sl.newStatus,
                }
                const animDelay = `${i * 0.04}s`
                return (
                  <TableRow key={sale.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
                      border-b border-gray-50 dark:border-gray-700 group transition-colors"
                    style={{
                      animation: `fadeInUp 0.3s ${animDelay} ease both`,
                      borderLeft: `3px solid ${BORDER_L[sale.status] || '#e5e7eb'}`,
                    }}
                    onClick={() => handleSaleClick(sale)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                          text-xs font-medium flex-shrink-0 ${avColor(sale)}`}>
                          {initials(sale)}
                        </div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {clientName(sale, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {sale.sale_date}
                    </TableCell>
                    <TableCell>
                      {sale.staff_name ? (
                        <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {sale.staff_name}
                        </span>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(sale.sale_items || []).slice(0, 3).map(item => (
                          <span key={item.id} className="text-xs bg-gray-50 dark:bg-gray-700
                            border border-gray-100 dark:border-gray-600 rounded px-1.5 py-0.5
                            text-gray-500 dark:text-gray-400">
                            {item.quantity}× {item.product_name}
                          </span>
                        ))}
                        {(sale.sale_items?.length || 0) > 3 && (
                          <span className="text-xs text-gray-400">+{(sale.sale_items?.length || 0) - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        ₪{Number(sale.total_amount).toLocaleString()}
                      </div>
                      {sale.status === 'partial' && (
                        <div className="text-xs text-amber-500 mt-0.5">
                          {locale === 'he' ? `שולם ₪${Number(sale.paid_amount).toLocaleString()}` 
                            : `Оплачено ₪${Number(sale.paid_amount).toLocaleString()}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <button
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md
                          font-medium transition-all border
                          ${sale.receipt_sent
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                            : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600'}`}
                        onClick={() => toggleReceipt.mutate({ id: sale.id, receipt_sent: !sale.receipt_sent })}>
                        <FileText size={10} />
                        {locale === 'he' ? 'חשבונית' : 'Чек'}
                        <span className="ms-0.5">{sale.receipt_sent ? '✓' : '—'}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border
                        ${STATUS_BADGE[sale.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {statusLabels[sale.status] || sale.status}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">{t.noSales}</p>
          </div>
        )}
      </div>

      {/* ── Mobile FAB ─────────────────────────────────────────────────── */}
      <button className="md:hidden fixed bottom-6 end-6 w-14 h-14 bg-theme-primary text-white
        rounded-full shadow-lg flex items-center justify-center hover:opacity-90
        active:scale-95 transition-all z-50"
        aria-label={t.newSale}
        onClick={() => setNewSaleOpen(true)}>
        <Plus className="w-6 h-6" />
      </button>

      {/* ── Mobile filters drawer ──────────────────────────────────────── */}
      <TrinityBottomDrawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}
        title={locale === 'he' ? 'סינון' : 'Фильтры'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {locale === 'he' ? 'חיפוש' : 'Поиск'}
            </label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.search} className="ps-9" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {locale === 'he' ? 'שיטת תשלום' : 'Способ оплаты'}
            </label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filterAll}</SelectItem>
                <SelectItem value="cash">{t.cash}</SelectItem>
                <SelectItem value="card">{t.card}</SelectItem>
                <SelectItem value="bit">{t.bit}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => { setMethodFilter('all'); setSearch(''); setSelectedMonth(null) }}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 font-medium text-sm">
            {locale === 'he' ? 'נקה' : 'Сбросить'}
          </button>
          <button onClick={() => setFiltersOpen(false)}
            className="flex-1 py-3 rounded-xl bg-theme-primary text-white font-medium text-sm">
            {locale === 'he' ? 'החל' : 'Применить'}
          </button>
        </div>
      </TrinityBottomDrawer>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <NewSaleModal isOpen={newSaleOpen} onClose={() => setNewSaleOpen(false)} />
      <ImportSalesModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

    </div>
  )
}
