'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, Download, Search, ShoppingBag, BookmarkCheck, Trash2, Loader2, FileText, BarChart3, X, SlidersHorizontal } from 'lucide-react'
import { useModalStore } from '@/store/useModalStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useDemoMode } from '@/hooks/useDemoMode'
import { SalesDemoStub } from '@/components/demo/SalesDemoStub'
import { useSales, useSaleStats, useToggleReceipt, Sale } from '@/hooks/useSales'
import { EmptyState } from '@/components/ui/EmptyState'
import { SaleDetailModal } from '@/components/sales/SaleDetailModal'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── i18n ─────────────────────────────────────────────────────────────────
const T = {
  he: {
    title: 'מכירות', total: 'סה״כ', sales: 'מכירות',
    newSale: 'מכירה חדשה', export: 'ייצוא',
    revenue: 'הכנסות', count: 'עסקאות', avg: 'ממוצע לעסקה',
    monthlyChart: 'לפי חודש',
    all: 'הכל', paid: 'שולם', partial: 'חלקי', newStatus: 'חדש', draft: 'שמורה',
    filterAll: 'כל השיטות', cash: 'מזומן', card: 'כרטיס', bit: 'ביט',
    search: 'חיפוש לפי לקוח, מוצר...',
    syncNote: 'כל מכירה יוצרת אוטומטית רשומה בתשלומים',
    client: 'לקוח', date: 'תאריך', amount: 'סכום',
    items: 'פריטים', receipt: 'חשבונית', status: 'סטטוס',
    noSales: 'אין מכירות', noSalesDesc: 'צור את המכירה הראשונה שלך',
    breakdown: 'פירוט לפי סטטוס', kpi: 'מדדים עיקריים',
    filters: 'סינון',
  },
  ru: {
    title: 'Продажи', total: 'Итого', sales: 'сделок',
    newSale: 'Новая сделка', export: 'Экспорт',
    revenue: 'Выручка', count: 'Сделок', avg: 'Средний чек',
    monthlyChart: 'По месяцам',
    all: 'Все', paid: 'Оплачено', partial: 'Частично', newStatus: 'Новая', draft: 'Сохранённые',
    filterAll: 'Все способы', cash: 'Наличные', card: 'Карта', bit: 'Bit',
    search: 'Поиск по клиенту, товару...',
    syncNote: 'Каждая продажа создаёт запись в разделе «Платежи»',
    client: 'Клиент', date: 'Дата', amount: 'Сумма',
    items: 'Товары', receipt: 'Чек', status: 'Статус',
    noSales: 'Нет продаж', noSalesDesc: 'Создайте первую сделку',
    breakdown: 'Разбивка по статусу', kpi: 'Ключевые показатели',
    filters: 'Фильтры',
  },
}

const MONTHS_HE = ['אוק','נוב','דצמ','ינו','פבר','מרץ']
const MONTHS_RU = ['Окт','Ноя','Дек','Янв','Фев','Мар']
const MONTH_KEYS = ['2024-10','2024-11','2024-12','2025-01','2025-02','2025-03']
const BAR_H     = [45, 58, 50, 72, 64, 90]

// ─── helpers ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; badge: string; border: string; label: { ru: string; he: string } }> = {
  paid:      { dot: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800', border: '#10b981', label: { ru: 'Оплачено', he: 'שולם' } },
  partial:   { dot: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',         border: '#f59e0b', label: { ru: 'Частично', he: 'חלקי' } },
  new:       { dot: '#8b5cf6', badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',   border: '#8b5cf6', label: { ru: 'Новая',    he: 'חדש' } },
  refunded:  { dot: '#9ca3af', badge: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',                  border: '#9ca3af', label: { ru: 'Возврат',  he: 'החזר' } },
  cancelled: { dot: '#d1d5db', badge: 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',                  border: '#e5e7eb', label: { ru: 'Отменена', he: 'בוטל' } },
}
const AV_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]
function saleName(s: Sale, l: string) {
  return s.clients ? `${s.clients.first_name} ${s.clients.last_name}`.trim() : (l === 'he' ? 'לקוח לא ידוע' : 'Клиент')
}
function saleIni(s: Sale) {
  const f = s.clients?.first_name?.[0] || ''; const l = s.clients?.last_name?.[0] || ''
  return `${f}${l}`.toUpperCase() || '?'
}
function avCls(s: Sale) { return AV_COLORS[(s.clients?.first_name?.charCodeAt(0) || 0) % AV_COLORS.length] }

// ─── DraftSales hook ──────────────────────────────────────────────────────
interface DraftSale { clientId: string; clientName: string; total: number; itemCount: number }
function useDraftSales(key: number): DraftSale[] {
  const [drafts, setDrafts] = useState<DraftSale[]>([])
  useEffect(() => {
    const raw: DraftSale[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('draft_sale_')) continue
      try {
        const p = JSON.parse(localStorage.getItem(k) || '{}')
        const cart: { quantity: number; price: number }[] = p.cart || []
        raw.push({ clientId: k.replace('draft_sale_', ''), clientName: p.clientName || '—',
          total: cart.reduce((s, i) => s + i.price * i.quantity, 0), itemCount: cart.length })
      } catch { /**/ }
    }
    setDrafts(raw)
  }, [key])
  return drafts
}

// ─── Animated counter ─────────────────────────────────────────────────────
function AnimNum({ value, prefix = '', duration = 600 }: { value: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = ref.current; const end = value
    const startTime = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = Math.round(start + (end - start) * eased)
      setDisplay(cur)
      if (t < 1) requestAnimationFrame(step)
      else ref.current = end
    }
    requestAnimationFrame(step)
  }, [value, duration])
  return <>{prefix}{display.toLocaleString()}</>
}

// ─── SaleRow (desktop) ────────────────────────────────────────────────────
function SaleRow({ sale, locale, index, onClick, onToggleReceipt }: {
  sale: Sale; locale: string; index: number
  onClick: () => void; onToggleReceipt: () => void
}) {
  const cfg = STATUS_CFG[sale.status] || STATUS_CFG.new
  const lbl = cfg.label[locale as 'ru' | 'he'] || sale.status
  return (
    <div
      onClick={onClick}
      className="grid items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150 group border-b border-gray-50 dark:border-gray-700/40 last:border-0"
      style={{
        gridTemplateColumns: '2fr 76px 76px minmax(0,1.2fr) 68px 90px',
        borderInlineStart: `2.5px solid ${cfg.border}`,
        animation: `slideInRow 0.35s ${index * 0.04}s ease both`,
      }}>
      {/* Client */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avCls(sale)}`}>
          {saleIni(sale)}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{saleName(sale, locale)}</span>
      </div>
      {/* Date */}
      <span className="text-xs text-gray-400 dark:text-gray-500">{sale.sale_date}</span>
      {/* Amount */}
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">₪{Number(sale.total_amount).toLocaleString()}</div>
        {sale.status === 'partial' && (
          <div className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">↑₪{Number(sale.paid_amount).toLocaleString()}</div>
        )}
      </div>
      {/* Items */}
      <div className="flex flex-wrap gap-1 min-w-0">
        {(sale.sale_items || []).slice(0, 2).map(it => (
          <span key={it.id} className="text-[10px] bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-gray-500 dark:text-gray-400 truncate max-w-[90px]">
            {it.quantity}× {it.product_name}
          </span>
        ))}
        {(sale.sale_items?.length || 0) > 2 && (
          <span className="text-[10px] text-gray-400">+{(sale.sale_items?.length || 0) - 2}</span>
        )}
      </div>
      {/* Receipt */}
      <div onClick={e => { e.stopPropagation(); onToggleReceipt() }}>
        <button className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md font-medium border transition-all ${
          sale.receipt_sent
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
            : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 dark:bg-gray-700 dark:border-gray-600 hover:border-gray-300'
        }`}>
          <FileText size={9} />
          {locale === 'he' ? 'חשבונית' : 'Чек'} {sale.receipt_sent ? '✓' : '—'}
        </button>
      </div>
      {/* Status */}
      <span className={`text-[10px] px-2 py-1 rounded-full font-medium border ${cfg.badge}`}>{lbl}</span>
    </div>
  )
}

// ─── MobileSaleCard ───────────────────────────────────────────────────────
function MobileSaleCard({ sale, locale, index, onClick }: {
  sale: Sale; locale: string; index: number; onClick: () => void
}) {
  const cfg = STATUS_CFG[sale.status] || STATUS_CFG.new
  const lbl = cfg.label[locale as 'ru' | 'he'] || sale.status
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150 border-b border-gray-50 dark:border-gray-700/40 last:border-0 active:scale-[0.99]"
      style={{
        borderInlineStart: `2.5px solid ${cfg.border}`,
        animation: `slideInRow 0.35s ${index * 0.05}s ease both`,
      }}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avCls(sale)}`}>
        {saleIni(sale)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{saleName(sale, locale)}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {sale.sale_date}
          {(sale.sale_items || []).length > 0 && ` · ${sale.sale_items![0].quantity}× ${sale.sale_items![0].product_name}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">₪{Number(sale.total_amount).toLocaleString()}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${cfg.badge}`}>{lbl}</span>
      </div>
    </div>
  )
}

// ─── SalesContent ─────────────────────────────────────────────────────────
function SalesContent() {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir    = locale === 'he' ? 'rtl' : 'ltr'
  const t      = T[locale]
  const months = locale === 'he' ? MONTHS_HE : MONTHS_RU
  const { openModal } = useModalStore()
  const { role, orgId } = useAuth()
  const isOwner = role === 'owner'

  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch]             = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedSale, setSelectedSale]   = useState<Sale | null>(null)
  const [draftKey, setDraftKey]           = useState(0)
  const [showFilters, setShowFilters]     = useState(false)

  const { data: sales = [], isLoading } = useSales({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    month: selectedMonth || undefined,
    search: search.length >= 2 ? search : undefined,
  })
  const stats        = useSaleStats(sales)
  const toggleRec    = useToggleReceipt()
  const drafts       = useDraftSales(draftKey)

  const filteredSales = useMemo(() =>
    methodFilter === 'all' ? sales : sales.filter((s: any) => s.payment_method === methodFilter),
  [sales, methodFilter])

  const handleBarClick = useCallback((k: string) =>
    setSelectedMonth(prev => prev === k ? null : k), [])
  const handleSaleClick = useCallback((s: Sale) => setSelectedSale(s), [])

  const handleExport = async () => {
    if (!orgId || exportLoading) return
    setExportLoading(true)
    try {
      const res = await fetch(`/api/export?${new URLSearchParams({ type: 'sales', org_id: orgId, format: 'csv' })}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `sales_${new Date().toISOString().slice(0,10)}.csv` })
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch (e) { console.error(e) } finally { setExportLoading(false) }
  }

  // breakdown
  const totalRev   = stats.totalRevenue || 0
  const paidSales  = filteredSales.filter((s: Sale) => s.status === 'paid')
  const partSales  = filteredSales.filter((s: Sale) => s.status === 'partial')
  const paidRev    = paidSales.reduce((s: number, x: Sale) => s + Number(x.total_amount || 0), 0)
  const partRev    = partSales.reduce((s: number, x: Sale) => s + Number(x.total_amount || 0), 0)
  const paidPct    = totalRev > 0 ? Math.round((paidRev / totalRev) * 100) : 0
  const partPct    = totalRev > 0 ? Math.round((partRev / totalRev) * 100) : 0

  const kpiData = [
    { label: t.revenue, value: stats.totalRevenue, prefix: '₪', color: 'from-amber-400 to-orange-500', icon: '₪', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: t.count,   value: stats.count,         prefix: '',  color: 'from-violet-400 to-purple-600', icon: '#',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: t.avg,     value: stats.avg,            prefix: '₪', color: 'from-emerald-400 to-teal-500', icon: '~',  bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  return (
    <>
      {/* ── keyframes injected once ── */}
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes slideInRow { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:none } }
        @keyframes popIn    { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:none } }
        @keyframes barGrow  { from { height:0% } to { height:var(--bh) } }
        @keyframes progBar  { from { width:0% } to { width:var(--pw) } }
        .anim-fadeup  { animation: fadeUp 0.45s ease both }
        .anim-popin   { animation: popIn  0.35s ease both }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:0.01ms !important } }
      `}</style>

      <div dir={dir} className="min-h-screen space-y-5 pb-24 md:pb-8">

        {/* ══ HEADER ══ */}
        <div className="anim-fadeup flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{t.total}: {filteredSales.length} {t.sales}</p>
          </div>
          <div className="flex gap-2 items-center">
            {isOwner && (
              <button onClick={handleExport} disabled={exportLoading}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 relative overflow-hidden transition-all hover:shadow-md hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,rgba(52,211,153,.08),rgba(16,185,129,.04))' }}>
                <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg,transparent,rgba(52,211,153,.15),transparent)', animation: 'shimmer-wave 2.4s ease-in-out infinite' }} />
                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin relative z-10" /> : <Download className="w-4 h-4 relative z-10" />}
                <span className="relative z-10">{t.export}</span>
              </button>
            )}
            <button onClick={() => openModal('client-sale', { locale })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-theme-primary text-white shadow-md hover:opacity-90 active:scale-95 transition-all"
              style={{ animation: 'pulseRing 2.5s ease-in-out infinite' }}>
              <Plus className="w-4 h-4" />{t.newSale}
            </button>
          </div>
        </div>

        {/* ══ KPI CARDS ══ */}
        <div className="grid grid-cols-3 gap-3">
          {kpiData.map((k, i) => (
            <div key={i} className="anim-popin bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 relative overflow-hidden"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${k.color}`} />
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold mb-3 ${k.bg}`}
                style={{ color: k.color.includes('amber') ? '#d97706' : k.color.includes('violet') ? '#7c3aed' : '#059669' }}>
                {k.icon}
              </div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                <AnimNum value={k.value} prefix={k.prefix} />
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">{k.label}</div>
            </div>
          ))}
        </div>


        {/* ══ MIDDLE ROW: chart + breakdown (collapse on mobile) ══ */}
        <div className="hidden md:grid grid-cols-[1fr_260px] gap-3" style={{ animation: 'fadeUp 0.45s 0.15s ease both' }}>
          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t.monthlyChart}</span>
              {selectedMonth && (
                <button onClick={() => setSelectedMonth(null)} className="text-[10px] text-amber-500 hover:text-amber-600 flex items-center gap-0.5">
                  <X size={10} />{locale === 'he' ? 'נקה' : 'сброс'}
                </button>
              )}
            </div>
            <div className="flex items-end gap-2 h-16">
              {months.map((m, i) => {
                const key = MONTH_KEYS[i]; const active = selectedMonth === key
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group" onClick={() => handleBarClick(key)}>
                    <div className="w-full rounded-t-md transition-all duration-300"
                      style={{
                        height: `${BAR_H[i]}%`,
                        background: active ? 'linear-gradient(to top,#f59e0b,#fbbf24)' : 'linear-gradient(to top,#fde68a,#fef3c7)',
                        opacity: selectedMonth && !active ? 0.3 : 1,
                        transform: active ? 'scaleY(1.05)' : 'scaleY(1)',
                        transformOrigin: 'bottom',
                        boxShadow: active ? '0 -2px 8px rgba(245,158,11,.4)' : 'none',
                      }} />
                    <span className={`text-[9px] font-medium transition-colors ${active ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>{m}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 block">{t.breakdown}</span>
            <div className="space-y-3 flex-1">
              {[
                { label: t.paid, count: paidSales.length, rev: paidRev, pct: paidPct, color: '#10b981' },
                { label: t.partial, count: partSales.length, rev: partRev, pct: partPct, color: '#f59e0b' },
              ].map((row, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{row.count} · ₪{row.rev.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color, transition: 'width 0.8s cubic-bezier(.34,1.56,.64,1)' }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-3 leading-tight flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{t.syncNote}
            </p>
          </div>
        </div>


        {/* ══ DEALS PANEL ══ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          style={{ animation: 'fadeUp 0.45s 0.22s ease both' }}>

          {/* search + filter row */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 dark:border-gray-700/60">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
                className="w-full ps-8 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-shadow" />
            </div>
            {/* filters toggle (mobile) */}
            <button onClick={() => setShowFilters(v => !v)}
              className={`md:hidden w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${showFilters ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400' : 'border-gray-100 dark:border-gray-600 text-gray-400'}`}>
              <SlidersHorizontal size={15} />
            </button>
            {/* method select (desktop) */}
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              className="hidden md:block text-xs border border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-shadow">
              <option value="all">{t.filterAll}</option>
              <option value="cash">{t.cash}</option>
              <option value="card">{t.card}</option>
              <option value="bit">{t.bit}</option>
            </select>
          </div>

          {/* collapsible mobile filters */}
          {showFilters && (
            <div className="md:hidden px-4 py-3 border-b border-gray-50 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-700/20"
              style={{ animation: 'fadeUp 0.2s ease both' }}>
              <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <option value="all">{t.filterAll}</option>
                <option value="cash">{t.cash}</option>
                <option value="card">{t.card}</option>
                <option value="bit">{t.bit}</option>
              </select>
            </div>
          )}

          {/* tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 px-2 overflow-x-auto scrollbar-hide">
            {(['all','paid','partial','new','draft'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold py-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                  statusFilter === s
                    ? 'border-amber-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                {s === 'draft' && <BookmarkCheck size={11} />}
                {s === 'all' ? t.all : s === 'paid' ? t.paid : s === 'partial' ? t.partial : s === 'new' ? t.newStatus : t.draft}
                {s === 'draft' && drafts.length > 0 && (
                  <span className="bg-amber-500 text-white text-[8px] min-w-[14px] h-3.5 px-1 rounded-full flex items-center justify-center font-bold">{drafts.length}</span>
                )}
              </button>
            ))}
          </div>


          {/* draft tab */}
          {statusFilter === 'draft' && (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {drafts.length === 0 ? (
                <EmptyState icon={<BookmarkCheck size={26} />}
                  title={locale === 'he' ? 'אין עסקאות שמורות' : 'Нет сохранённых сделок'}
                  description={locale === 'he' ? 'שמור עסקה מכרטיס לקוח' : 'Сохраните сделку из карточки клиента'} />
              ) : drafts.map((d, i) => {
                const av = AV_COLORS[d.clientName.charCodeAt(0) % AV_COLORS.length]
                const ini = d.clientName.split(' ').map((w: string) => w[0]?.toUpperCase() || '').join('').slice(0,2) || '?'
                return (
                  <div key={d.clientId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    style={{ animation: `slideInRow 0.3s ${i * 0.05}s ease both` }}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${av}`}>{ini}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{d.clientName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.itemCount} {locale === 'he' ? 'פריטים' : 'поз.'} · ₪{d.total.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => openModal('client-sale', { client: { id: d.clientId, first_name: d.clientName }, locale })}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold active:scale-95 transition-all">
                        {locale === 'he' ? 'פתח' : 'Открыть'}
                      </button>
                      <button onClick={() => { if (confirm(locale === 'he' ? 'למחוק?' : 'Удалить?')) { localStorage.removeItem(`draft_sale_${d.clientId}`); setDraftKey(k => k + 1) } }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all active:scale-95">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* loading skeleton */}
          {statusFilter !== 'draft' && isLoading && (
            <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-full w-36" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-24" />
                  </div>
                  <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-14" />
                </div>
              ))}
            </div>
          )}

          {/* mobile cards */}
          {statusFilter !== 'draft' && !isLoading && (
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-700/40">
              {filteredSales.length > 0
                ? filteredSales.map((s, i) => <MobileSaleCard key={s.id} sale={s} locale={locale} index={i} onClick={() => handleSaleClick(s)} />)
                : <EmptyState icon={<ShoppingBag size={26} />} title={t.noSales} description={t.noSalesDesc}
                    action={{ label: t.newSale, onClick: () => openModal('client-sale', { locale }) }} />}
            </div>
          )}

          {/* desktop table */}
          {statusFilter !== 'draft' && !isLoading && (
            <div className="hidden md:block">
              {filteredSales.length > 0 ? (
                <>
                  <div className="grid px-4 py-2 bg-gray-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700"
                    style={{ gridTemplateColumns: '2fr 76px 76px minmax(0,1.2fr) 68px 90px' }}>
                    {[t.client, t.date, t.amount, t.items, t.receipt, t.status].map((h, i) => (
                      <span key={i} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{h}</span>
                    ))}
                  </div>
                  {filteredSales.map((s, i) => (
                    <SaleRow key={s.id} sale={s} locale={locale} index={i}
                      onClick={() => handleSaleClick(s)}
                      onToggleReceipt={() => toggleRec.mutate({ id: s.id, receipt_sent: !s.receipt_sent })} />
                  ))}
                </>
              ) : (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t.noSales}</p>
                  <button onClick={() => openModal('client-sale', { locale })}
                    className="mt-3 text-sm text-amber-500 hover:text-amber-600 hover:underline transition-colors">{t.newSale}</button>
                </div>
              )}
            </div>
          )}

        </div>{/* end deals panel */}

        {/* FAB */}
        <button onClick={() => openModal('client-sale', { locale })}
          className="md:hidden fixed bottom-6 end-6 w-14 h-14 rounded-full bg-theme-primary text-white shadow-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-50"
          aria-label={t.newSale}>
          <Plus className="w-6 h-6" />
        </button>

        <SaleDetailModal sale={selectedSale} locale={locale} onClose={() => setSelectedSale(null)} />
      </div>
    </>
  )
}

// ─── SalesPage ────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { isDemo, isLoading } = useDemoMode()
  const previewStub = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview_stub') === '1'

  if (isLoading) return (
    <div className="min-h-screen space-y-5 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-9 w-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-10 w-36 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}</div>
      <div className="hidden md:grid grid-cols-[1fr_260px] gap-3">
        <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
      <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  )

  if (isDemo || previewStub) return <SalesDemoStub />
  return <SalesContent />
}
