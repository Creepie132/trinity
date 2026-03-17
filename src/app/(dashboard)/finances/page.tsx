'use client'

import { useState } from 'react'
import { format, startOfMonth, subMonths, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet,
  Receipt, Trash2, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { useExpenses, useExpensesStats, useDeleteExpense, useUpdateExpense } from '@/hooks/useExpenses'
import { usePaymentsStats } from '@/hooks/usePayments'
import { ReceiptUploadZone } from '@/components/finances/ReceiptUploadZone'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CATEGORY_META: Record<string, { label_he: string; label_ru: string; color: string; bg: string; emoji: string }> = {
  supplies:  { label_he: 'ציוד',      label_ru: 'Расходники',  color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30', emoji: '💄' },
  food:      { label_he: 'מזון',      label_ru: 'Продукты',    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', emoji: '🛒' },
  transport: { label_he: 'תחבורה',    label_ru: 'Транспорт',   color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/30',   emoji: '🚗' },
  utilities: { label_he: 'שירותים',   label_ru: 'Коммунальные',color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/30',       emoji: '⚡' },
  equipment: { label_he: 'ציוד מקצועי',label_ru: 'Оборудование',color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-950/30',     emoji: '🔧' },
  marketing: { label_he: 'שיווק',     label_ru: 'Маркетинг',   color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-950/30',     emoji: '📣' },
  rent:      { label_he: 'שכירות',    label_ru: 'Аренда',      color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-950/30', emoji: '🏢' },
  salary:    { label_he: 'משכורות',   label_ru: 'Зарплаты',    color: 'text-teal-600',    bg: 'bg-teal-50 dark:bg-teal-950/30',     emoji: '💼' },
  other:     { label_he: 'אחר',       label_ru: 'Прочее',      color: 'text-gray-600',    bg: 'bg-gray-50 dark:bg-gray-900/30',     emoji: '📦' },
}


const translations = {
  he: {
    title: 'כספים', income: 'הכנסות', expenses: 'הוצאות', profit: 'רווח נקי',
    noExpenses: 'אין הוצאות לחודש זה', categories: 'לפי קטגוריה',
    verified: 'מאומת', unverified: 'לא מאומת', deleteConfirm: 'למחוק הוצאה זו?',
    allCategories: 'כל הקטגוריות',
  },
  ru: {
    title: 'Финансы', income: 'Доходы', expenses: 'Расходы', profit: 'Прибыль',
    noExpenses: 'Нет расходов за этот месяц', categories: 'По категориям',
    verified: 'Подтверждено', unverified: 'Не проверено', deleteConfirm: 'Удалить расход?',
    allCategories: 'Все категории',
  },
}

export default function FinancesPage() {
  const { language } = useLanguage()
  const tx = translations[language === 'he' ? 'he' : 'ru']
  const dir = language === 'he' ? 'rtl' : 'ltr'
  const locale = language === 'he' ? 'he' : 'ru'

  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()))
  const [categoryFilter, setCategoryFilter] = useState('all')
  const month = format(currentDate, 'yyyy-MM')
  const monthLabel = currentDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU',
    { month: 'long', year: 'numeric' })

  const { data: expenses = [], isLoading } = useExpenses(month, categoryFilter)
  const { data: stats } = useExpensesStats(month)
  const { data: paymentsStats } = usePaymentsStats()
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()

  // Income from payments for this month (usePaymentsStats returns { totalAmount, count, avgAmount })
  const income = paymentsStats?.totalAmount ?? 0
  const totalExpenses = stats?.total ?? 0
  const profit = income - totalExpenses


  const handleDelete = async (id: string) => {
    if (!confirm(tx.deleteConfirm)) return
    await deleteExpense.mutateAsync(id)
  }

  const handleVerify = async (id: string) => {
    await updateExpense.mutateAsync({ id, verified: true })
    toast.success(language === 'he' ? 'אומת בהצלחה' : 'Подтверждено')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
            {language === 'he' ? 'כספים · finances' : 'finances · כספים'}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tx.title}</h1>
        </div>
        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px] text-center capitalize">
            {monthLabel}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tx.income, value: income, icon: TrendingUp, color: 'text-emerald-600', accentBg: 'bg-emerald-500', cardBg: 'bg-white dark:bg-gray-800', border: 'border-emerald-200 dark:border-emerald-900/40' },
          { label: tx.expenses, value: totalExpenses, icon: TrendingDown, color: 'text-red-500', accentBg: 'bg-red-500', cardBg: 'bg-white dark:bg-gray-800', border: 'border-red-200 dark:border-red-900/40' },
          { label: tx.profit, value: profit, icon: Wallet, color: profit >= 0 ? 'text-amber-500' : 'text-red-500', accentBg: profit >= 0 ? 'bg-amber-500' : 'bg-red-500', cardBg: 'bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-950/10', border: 'border-amber-200 dark:border-amber-900/40' },
        ].map((card) => (
          <div key={card.label} className={cn('relative overflow-hidden rounded-2xl border p-4 shadow-sm', card.cardBg, card.border)}>
            <div className={cn('absolute top-0 left-0 w-1 h-full', card.accentBg)} />
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', `${card.accentBg}/10`)}>
              <card.icon className={cn('w-4 h-4', card.color)} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1 font-medium">{card.label}</p>
            <p className={cn('text-xl font-bold tabular-nums', card.color)}>
              ₪{Math.abs(card.value).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {stats && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">{tx.categories}</p>
          <div className="space-y-2.5">
            {Object.entries(stats.byCategory).sort(([,a],[,b]) => b - a).map(([cat, amount]) => {
              const meta = CATEGORY_META[cat] ?? CATEGORY_META.other
              const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {language === 'he' ? meta.label_he : meta.label_ru}
                      </span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        ₪{amount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* Expenses list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            {tx.expenses} <span className="text-gray-400 font-normal text-xs ms-1">({expenses.length})</span>
          </p>
          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap justify-end">
            {['all', ...Object.keys(CATEGORY_META)].slice(0, 5).map((cat) => {
              const meta = CATEGORY_META[cat]
              return (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={cn('text-xs px-2.5 py-1 rounded-lg font-medium transition-all',
                    categoryFilter === cat
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}>
                  {cat === 'all' ? (language === 'he' ? 'הכל' : 'Все') : meta?.emoji}
                </button>
              )
            })}
          </div>
        </div>

        {/* Items */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse border-b border-gray-50 dark:border-gray-700/50">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
              </div>
              <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded" />
            </div>
          ))
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Receipt className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{tx.noExpenses}</p>
          </div>
        ) : expenses.map((expense, i) => {
          const meta = CATEGORY_META[expense.category] ?? CATEGORY_META.other
          const dateStr = expense.expense_date
            ? new Date(expense.expense_date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short' })
            : '—'
          return (
            <div key={expense.id}
              className={cn('flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0 group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30',
                'animate-in fade-in slide-in-from-left-2')}
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', meta.bg)}>
                {meta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {expense.vendor ?? (language === 'he' ? 'ספק לא ידוע' : 'Неизвестный продавец')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{dateStr}</span>
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md', meta.bg, meta.color)}>
                    {language === 'he' ? meta.label_he : meta.label_ru}
                  </span>
                  {!expense.verified && (
                    <span className="text-xs text-amber-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-red-500 tabular-nums">
                  ₪{(expense.amount ?? 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {expense.receipt_url && (
                    <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                    </a>
                  )}
                  {!expense.verified && (
                    <button onClick={() => handleVerify(expense.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5 text-gray-500 hover:text-emerald-500" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(expense.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Upload zone */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
          <ReceiptUploadZone />
        </div>
      </div>
    </div>
  )
}
