'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Download, Search, ShoppingBag, Receipt, BookmarkCheck, Trash2, Loader2, TrendingUp, FileText, BarChart3 } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useDemoMode } from '@/hooks/useDemoMode'
import { SalesDemoStub } from '@/components/demo/SalesDemoStub'
import { useSales, useSaleStats, useToggleReceipt, Sale } from '@/hooks/useSales'
import { SaleCard } from '@/components/sales/SaleCard'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawerLazy'
import { EmptyState } from '@/components/ui/EmptyState'
import { SaleDetailModal } from '@/components/sales/SaleDetailModal'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  he: {
    title: 'מכירות', total: 'סה״כ', sales: 'מכירות',
    newSale: 'מכירה חדשה', export: 'ייצוא',
    revenue: 'הכנסות', count: 'עסקאות', avg: 'ממוצע לעסקה',
    monthlyChart: 'לפי חודש', clickHint: 'לחץ על עמודה לסינון',
    all: 'הכל', paid: 'שולם', partial: 'חלקי', newStatus: 'חדש', draft: 'שמורה',
    filterAll: 'כל השיטות', cash: 'מזומן', card: 'כרטיס', bit: 'ביט',
    search: 'חיפוש לפי לקוח, מוצר, עובד...',
    syncNote: 'כל מכירה יוצרת אוטומטית רשומה בתשלומים',
    client: 'לקוח', date: 'תאריך', staff: 'עובד', amount: 'סכום',
    items: 'פריטים', method: 'שיטה', status: 'סטטוס', receipt: 'חשבונית',
    noSales: 'אין מכירות', noSalesDesc: 'צור את המכירה הראשונה שלך',
    byStatus: 'לפי סטטוס', breakdown: 'פירוט',
  },
  ru: {
    title: 'Продажи', total: 'Итого', sales: 'сделок',
    newSale: 'Новая сделка', export: 'Экспорт',
    revenue: 'Выручка', count: 'Сделок', avg: 'Средний чек',
    monthlyChart: 'По месяцам', clickHint: 'нажмите на столбец для фильтрации',
    all: 'Все', paid: 'Оплачено', partial: 'Частично', newStatus: 'Новая', draft: 'Сохранённые',
    filterAll: 'Все способы', cash: 'Наличные', card: 'Карта', bit: 'Bit',
    search: 'Поиск по клиенту, товару, мастеру...',
    syncNote: 'Каждая продажа автоматически создаёт запись в разделе «Платежи»',
    client: 'Клиент', date: 'Дата', staff: 'Мастер', amount: 'Сумма',
    items: 'Товары', method: 'Способ', status: 'Статус', receipt: 'Чек',
    noSales: 'Нет продаж', noSalesDesc: 'Создайте первую сделку',
    byStatus: 'По статусу', breakdown: 'Разбивка',
  },
}

const MONTHS_HE = ['אוק', 'נוב', 'דצמ', 'ינו', 'פבר', 'מרץ']
const MONTHS_RU = ['Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар']
const MONTH_KEYS = ['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03']
const BAR_HEIGHTS = [45, 58, 50, 72, 64, 90]


// ─── DraftSales ───────────────────────────────────────────────────────────────
interface DraftSale {
  clientId: string; clientName: string; total: number; itemCount: number; savedAt?: string
}

function useDraftSales(refreshKey?: number): DraftSale[] {
  const [drafts, setDrafts] = useState<DraftSale[]>([])
  useEffect(() => {
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
        raw.push({ clientId, clientName: parsed.clientName || '', total, itemCount: cart.length, savedAt: parsed.savedAt, needsFetch: !parsed.clientName })
      } catch { /* skip */ }
    }
    if (raw.length === 0) { setDrafts([]); return }
    const toFetch = raw.filter(d => d.needsFetch)
    if (toFetch.length === 0) {
      setDrafts(raw.map(({ clientId, clientName, total, itemCount, savedAt }) => ({ clientId, clientName, total, itemCount, savedAt })))
      return
    }
    Promise.all(toFetch.map(async d => {
      try {
        const { data } = await createSupabaseBrowserClient().from('clients').select('id,first_name,last_name').eq('id', d.clientId).maybeSingle()
        return data
      } catch { return null }
    })).then(results => {
      const nameMap: Record<string, string> = {}
      toFetch.forEach((d, idx) => {
        const data = results[idx]
        if (data) nameMap[d.clientId] = `${data.first_name} ${data.last_name}`.trim() || d.clientId
        else nameMap[d.clientId] = d.clientId
      })
      setDrafts(raw.map(({ clientId, clientName, total, itemCount, savedAt }) => ({
        clientId, clientName: nameMap[clientId] || clientName || clientId, total, itemCount, savedAt,
      })))
    })
  }, [refreshKey])
  return drafts
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  partial:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  new:       'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
  refunded:  'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500',
}
const STATUS_BAR_COLOR: Record<string, string> = {
  paid: '#10b981', partial: '#f59e0b', new: '#8b5cf6', refunded: '#9ca3af', cancelled: '#e5e7eb',
}
const BORDER_L: Record<string, string> = {
  paid: '#10b981', partial: '#f59e0b', new: '#8b5cf6', refunded: '#9ca3af', cancelled: '#e5e7eb',
}
function saleClientName(sale: Sale, locale: string) {
  if (sale.clients) return `${sale.clients.first_name} ${sale.clients.last_name}`.trim()
  return locale === 'he' ? 'לקוח לא ידוע' : 'Клиент не найден'
}
function saleInitials(sale: Sale) {
  const f = sale.clients?.first_name || ''; const l = sale.clients?.last_name || ''
  return `${f[0]||''}${l[0]||''}`.toUpperCase() || '?'
}
const AV = ['bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300']
function avColor(sale: Sale) {
  return AV[(sale.clients?.first_name?.charCodeAt(0) || 0) % AV.length]
}


// ─── SalesContent ─────────────────────────────────────────────────────────────
function SalesContent() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir    = locale === 'he' ? 'rtl' : 'ltr'
  const t      = T[locale]
  const months = locale === 'he' ? MONTHS_HE : MONTHS_RU
  const { openModal } = useModalStore()
  const { role, orgId } = useAuth()
  const isOwner = role === 'owner'

  const [statusFilter, setStatusFilter]   = useState('all')
  const [methodFilter, setMethodFilter]   = useState('all')
  const [search, setSearch]               = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen]     = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedSale, setSelectedSale]   = useState<Sale | null>(null)
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

  const filteredSales = useMemo(() => {
    if (methodFilter === 'all') return sales
    return sales.filter((s: any) => s.payment_method === methodFilter)
  }, [sales, methodFilter])

  const handleBarClick = useCallback((key: string) => {
    setSelectedMonth(prev => prev === key ? null : key)
  }, [])

  const handleSaleClick = useCallback((sale: Sale) => { setSelectedSale(sale) }, [])

  const handleExport = async () => {
    if (!orgId || exportLoading) return
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ type: 'sales', org_id: orgId, format: 'csv' })
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch (e) { console.error(e) } finally { setExportLoading(false) }
  }

  // ── Status breakdown ─────────────────────────────────────────────────────
  const totalRevenue = stats.totalRevenue || 0
  const paidSales    = filteredSales.filter((s: Sale) => s.status === 'paid')
  const partialSales = filteredSales.filter((s: Sale) => s.status === 'partial')
  const paidRev      = paidSales.reduce((s: number, x: Sale) => s + Number(x.total_amount || 0), 0)
  const partialRev   = partialSales.reduce((s: number, x: Sale) => s + Number(x.total_amount || 0), 0)
  const paidPct      = totalRevenue > 0 ? Math.round((paidRev / totalRevenue) * 100) : 0
  const partialPct   = totalRevenue > 0 ? Math.round((partialRev / totalRevenue) * 100) : 0


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir={dir} className="min-h-screen space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ animation: 'fadeInUp 0.4s ease both' }}>
        <div className={locale === 'he' ? 'text-center md:text-right' : 'text-center md:text-left'}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t.total}: {filteredSales.length} {t.sales}
          </p>
        </div>
        <div className="flex gap-2 justify-center md:justify-end">
          {isOwner && (
            <button onClick={handleExport} disabled={exportLoading}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 relative overflow-hidden transition-all duration-200 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.05))' }}>
              <span aria-hidden className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.18) 50%, transparent 100%)', animation: 'shimmer-wave 2.4s ease-in-out infinite' }} />
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin relative z-10" /> : <Download className="w-4 h-4 relative z-10" />}
              <span className="relative z-10">{t.export}</span>
            </button>
          )}
          <button className="bg-theme-primary text-white hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity"
            style={{ animation: 'pulseRing 2.5s ease-in-out infinite' }}
            onClick={() => openModal('client-sale', { locale })}>
            <Plus className="w-4 h-4" />{t.newSale}
          </button>
        </div>
      </div>

      {/* ── TWO-COLUMN DASHBOARD LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">

        {/* ════ LEFT COLUMN ════ */}
        <div className="flex flex-col gap-4">

          {/* KPI stacked */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            style={{ animation: 'fadeInUp 0.4s 0.05s ease both' }}>
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                {locale === 'he' ? 'מדדים עיקריים' : 'Ключевые показатели'}
              </span>
            </div>
            {[
              { label: t.revenue, value: `₪${stats.totalRevenue.toLocaleString()}`, color: 'bg-amber-500' },
              { label: t.count,   value: `${stats.count}`, color: 'bg-violet-500' },
              { label: t.avg,     value: `₪${stats.avg}`, color: 'bg-emerald-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b last:border-0 border-gray-50 dark:border-gray-700/50 group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                </div>
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.value}</span>
              </div>
            ))}
          </div>


          {/* Mini bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4"
            style={{ animation: 'fadeInUp 0.4s 0.1s ease both' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{t.monthlyChart}</span>
              {selectedMonth && (
                <button onClick={() => setSelectedMonth(null)}
                  className="text-[10px] text-amber-500 hover:text-amber-600 underline">
                  {locale === 'he' ? 'נקה' : 'сброс'}
                </button>
              )}
            </div>
            <div className="flex items-end gap-1.5 h-12">
              {months.map((m, i) => {
                const key = MONTH_KEYS[i]; const active = selectedMonth === key; const h = BAR_HEIGHTS[i]
                return (
                  <div key={key} className="flex flex-col items-center gap-1 flex-1 cursor-pointer group" onClick={() => handleBarClick(key)}>
                    <div className="w-full rounded-t-sm transition-all duration-200"
                      style={{ height: `${h}%`, background: active ? '#f59e0b' : selectedMonth ? '#fde68a' : '#fde68a',
                        opacity: selectedMonth && !active ? 0.35 : 1,
                        transform: active ? 'scaleY(1.06)' : 'scaleY(1)', transformOrigin: 'bottom' }} />
                    <span className={`text-[9px] transition-colors ${active ? 'text-amber-600 font-semibold' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>{m}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4"
            style={{ animation: 'fadeInUp 0.4s 0.15s ease both' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{t.breakdown}</span>
            </div>
            <div className="space-y-3">
              {/* Paid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t.paid}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {paidSales.length} · ₪{paidRev.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                </div>
              </div>
              {/* Partial */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t.partial}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {partialSales.length} · ₪{partialRev.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${partialPct}%` }} />
                </div>
              </div>
            </div>
            {/* Sync note */}
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{t.syncNote}</span>
            </div>
          </div>

        </div>{/* end LEFT COLUMN */}


        {/* ════ RIGHT COLUMN — deals list ════ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
          style={{ animation: 'fadeInUp 0.4s 0.08s ease both' }}>

          {/* Right header: title + search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
                className="w-full ps-8 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
            </div>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              className="text-xs border border-gray-100 dark:border-gray-600 rounded-lg px-2 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none">
              <option value="all">{t.filterAll}</option>
              <option value="cash">{t.cash}</option>
              <option value="card">{t.card}</option>
              <option value="bit">{t.bit}</option>
            </select>
          </div>

          {/* Tab bar */}
          <div className="flex bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 px-3 gap-0.5 overflow-x-auto">
            {(['all','paid','partial','new','draft'] as const).map(s => (
              <button key={s}
                className={`flex-shrink-0 text-xs py-2.5 px-3 font-medium flex items-center gap-1 transition-all border-b-2 ${
                  statusFilter === s
                    ? 'border-amber-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'draft' && <BookmarkCheck size={10} />}
                {s === 'all' ? t.all : s === 'paid' ? t.paid : s === 'partial' ? t.partial : s === 'new' ? t.newStatus : t.draft}
                {s === 'draft' && draftSales.length > 0 && (
                  <span className="bg-amber-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{draftSales.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Draft sales */}
          {statusFilter === 'draft' && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              {draftSales.length === 0 ? (
                <EmptyState icon={<BookmarkCheck size={24} />}
                  title={locale === 'he' ? 'אין עסקאות שמורות' : 'Нет сохранённых сделок'}
                  description={locale === 'he' ? 'שמור עסקה מכרטיס לקוח' : 'Сохраните сделку из карточки клиента'} />
              ) : draftSales.map((d, i) => {
                const av = AV[d.clientName.charCodeAt(0) % AV.length]
                const ini = d.clientName.split(' ').map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0,2) || '?'
                return (
                  <div key={d.clientId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    style={{ animation: `fadeInUp 0.25s ${i * 0.04}s ease both` }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${av}`}>{ini}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{d.clientName}</p>
                      <p className="text-xs text-gray-400">{d.itemCount} {locale === 'he' ? 'פריטים' : 'поз.'} · ₪{d.total.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => openModal('client-sale', { client: { id: d.clientId, first_name: d.clientName }, locale })}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 active:scale-95 transition-all">
                        {locale === 'he' ? 'פתח' : 'Открыть'}
                      </button>
                      <button onClick={() => { if (confirm(locale === 'he' ? 'למחוק?' : 'Удалить?')) deleteDraft(d.clientId) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}


          {/* Mobile sale cards */}
          {statusFilter !== 'draft' && (
            <div className="lg:hidden flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              {isLoading ? [...Array(4)].map((_, i) => (
                <div key={i} className="p-3 animate-pulse flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-32" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-20" />
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16" />
                </div>
              )) : filteredSales.length > 0
                ? filteredSales.map((sale, i) => <SaleCard key={sale.id} sale={sale} locale={locale} index={i} onClick={handleSaleClick} />)
                : <EmptyState icon={<ShoppingBag size={24} />} title={t.noSales} description={t.noSalesDesc}
                    action={{ label: t.newSale, onClick: () => openModal('client-sale', { locale }) }} />}
            </div>
          )}

          {/* Desktop table */}
          {statusFilter !== 'draft' && (
            <div className="hidden lg:block flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {locale === 'he' ? 'טוען...' : 'Загрузка...'}
                </div>
              ) : filteredSales.length > 0 ? (
                <>
                  {/* Table header */}
                  <div className="grid px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700"
                    style={{ gridTemplateColumns: '2fr 80px 70px 120px 80px 90px' }}>
                    {[t.client, t.date, t.amount, t.items, t.receipt, t.status].map((h, i) => (
                      <span key={i} className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{h}</span>
                    ))}
                  </div>
                  {/* Rows */}
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {filteredSales.map((sale, i) => {
                      const sl = T[locale]
                      const statusLabels: Record<string, string> = { paid: sl.paid, partial: sl.partial, new: sl.newStatus }
                      return (
                        <div key={sale.id}
                          className="grid px-4 py-2.5 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors group"
                          style={{ gridTemplateColumns: '2fr 80px 70px 120px 80px 90px',
                            animation: `fadeInUp 0.25s ${i * 0.03}s ease both`,
                            borderLeft: `2px solid ${BORDER_L[sale.status] || '#e5e7eb'}` }}
                          onClick={() => handleSaleClick(sale)}>
                          {/* Client */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${avColor(sale)}`}>
                              {saleInitials(sale)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {saleClientName(sale, locale)}
                            </span>
                          </div>
                          {/* Date */}
                          <span className="text-xs text-gray-400">{sale.sale_date}</span>
                          {/* Amount */}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">₪{Number(sale.total_amount).toLocaleString()}</div>
                            {sale.status === 'partial' && (
                              <div className="text-[10px] text-amber-500 mt-0.5">↑₪{Number(sale.paid_amount).toLocaleString()}</div>
                            )}
                          </div>
                          {/* Items */}
                          <div className="flex flex-wrap gap-1">
                            {(sale.sale_items || []).slice(0, 2).map(item => (
                              <span key={item.id} className="text-[10px] bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-gray-500 dark:text-gray-400">
                                {item.quantity}× {item.product_name}
                              </span>
                            ))}
                            {(sale.sale_items?.length || 0) > 2 && <span className="text-[10px] text-gray-400">+{(sale.sale_items?.length || 0) - 2}</span>}
                          </div>
                          {/* Receipt */}
                          <div onClick={e => e.stopPropagation()}>
                            <button
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md font-medium transition-all border ${
                                sale.receipt_sent
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                  : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600'}`}
                              onClick={() => toggleReceipt.mutate({ id: sale.id, receipt_sent: !sale.receipt_sent })}>
                              <FileText size={9} />
                              {locale === 'he' ? 'חשבונית' : 'Чек'} {sale.receipt_sent ? '✓' : '—'}
                            </button>
                          </div>
                          {/* Status */}
                          <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${STATUS_BADGE[sale.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {statusLabels[sale.status] || sale.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">{t.noSales}</p>
                  <button onClick={() => openModal('client-sale', { locale })}
                    className="mt-4 text-sm text-amber-600 hover:underline">{t.newSale}</button>
                </div>
              )}
            </div>
          )}

        </div>{/* end RIGHT COLUMN */}

      </div>{/* end grid */}


      {/* Mobile FAB */}
      <button className="lg:hidden fixed bottom-6 end-6 w-14 h-14 bg-theme-primary text-white rounded-full shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
        aria-label={t.newSale}
        onClick={() => openModal('client-sale', { locale })}>
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile filters drawer */}
      <TrinityBottomDrawer isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}
        title={locale === 'he' ? 'סינון' : 'Фильтры'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{locale === 'he' ? 'חיפוש' : 'Поиск'}</label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
                className="w-full ps-9 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{locale === 'he' ? 'שיטת תשלום' : 'Способ оплаты'}</label>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="all">{t.filterAll}</option>
              <option value="cash">{t.cash}</option>
              <option value="card">{t.card}</option>
              <option value="bit">{t.bit}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => { setMethodFilter('all'); setSearch('') }}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 font-medium text-sm">
            {locale === 'he' ? 'נקה' : 'Сбросить'}
          </button>
          <button onClick={() => setFiltersOpen(false)}
            className="flex-1 py-3 rounded-xl bg-theme-primary text-white font-medium text-sm">
            {locale === 'he' ? 'החל' : 'Применить'}
          </button>
        </div>
      </TrinityBottomDrawer>

      {/* Modals */}
      <SaleDetailModal sale={selectedSale} locale={locale} onClose={() => setSelectedSale(null)} />

    </div>
  )
}

export default function SalesPage() {
  const { isDemo, isLoading } = useDemoMode()
  const previewStub = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview_stub') === '1'

  if (isLoading) return (
    <div className="space-y-4 min-h-screen animate-pulse">
      <div className="h-9 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  )

  if (isDemo || previewStub) return <SalesDemoStub />
  return <SalesContent />
}
