'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Users, Send, AlertTriangle, CheckCircle2, Search, Clock, Filter, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
  last_visit_at?: string | null
}

interface LimitStatus { used: number; remaining: number; limit: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysSince(date: string | null | undefined): number | null {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

// ─── LimitBar ────────────────────────────────────────────────────────────────
function LimitBar({ status, l }: { status: LimitStatus; l: boolean }) {
  const pct = Math.round((status.used / status.limit) * 100)
  const over = status.remaining === 0

  return (
    <div className={cn(
      'rounded-2xl border p-4 mb-6 transition-colors',
      over
        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
        : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {over
            ? <AlertTriangle size={16} className="text-red-500" />
            : <MessageCircle size={16} className="text-green-500" />}
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            {l ? 'מגבלת שליחה יומית' : 'Дневной лимит отправки'}
          </span>
        </div>
        <span className={cn('text-sm font-bold', over ? 'text-red-600' : 'text-gray-600 dark:text-slate-400')}>
          {status.used} / {status.limit}
        </span>
      </div>

      {/* Прогресс-бар */}
      <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500',
            pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {over ? (
        <div className="flex items-start gap-2 mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-700">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {l ? '🚫 הגעת למגבלה היומית' : '🚫 Дневной лимит исчерпан'}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {l
                ? 'תוכל לשלוח הודעות חדשות מחר. WhatsApp מגביל שליחה המונית להגנה על חשבונך.'
                : 'Новые сообщения можно будет отправить завтра. WhatsApp ограничивает массовую рассылку для защиты аккаунта.'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {l
            ? `נותרו ${status.remaining} הודעות להיום`
            : `Осталось ${status.remaining} сообщений на сегодня`}
        </p>
      )}
    </div>
  )
}

// ─── ClientRow ────────────────────────────────────────────────────────────────
function ClientRow({ client, selected, onToggle, l }: {
  client: Client; selected: boolean; onToggle: () => void; l: boolean
}) {
  const days = daysSince(client.last_visit_at)
  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border',
        selected
          ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
          : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700'
      )}
    >
      {/* Checkbox */}
      <div className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
        selected ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-slate-500'
      )}>
        {selected && <CheckCircle2 size={12} className="text-white" />}
      </div>

      {/* Аватар */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-bold">
          {(client.first_name?.[0] || '?').toUpperCase()}
        </span>
      </div>

      {/* Инфо */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
          {client.first_name} {client.last_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{client.phone}</p>
      </div>

      {/* Дней отсутствия */}
      {days !== null && (
        <div className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
          days > 60 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : days > 30 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
        )}>
          {l ? `לפני ${days} ימים` : `${days} дн.`}
        </div>
      )}
    </div>
  )
}

// ─── FilterButton ─────────────────────────────────────────────────────────────
function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600'
      )}
    >
      {label}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BroadcastPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const qc = useQueryClient()

  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [message, setMessage]       = useState('')
  const [absentFilter, setAbsent]   = useState<number | null>(null)
  const [result, setResult]         = useState<{ sent: number; failed: number; skipped: number } | null>(null)

  // Лимит
  const { data: limitStatus } = useQuery<LimitStatus>({
    queryKey: ['wa-broadcast-limit'],
    queryFn:  () => fetch('/api/wa/broadcast').then(r => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  // Клиенты
  const { data: allClients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients-broadcast'],
    queryFn:  async () => {
      const res = await fetch('/api/clients?limit=500&fields=id,first_name,last_name,phone,last_visit_at')
      if (!res.ok) return []
      const data = await res.json()
      return data.clients ?? data ?? []
    },
    staleTime: 2 * 60_000,
  })

  // Фильтрация
  const filtered = allClients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(q)
    const days = daysSince(c.last_visit_at)
    const matchAbsent = absentFilter === null || (days !== null && days >= absentFilter)
    return matchSearch && matchAbsent
  })

  const toggleClient = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const limit = limitStatus?.remaining ?? 30
    const ids = filtered.slice(0, limit).map(c => c.id)
    setSelected(new Set(ids))
  }

  const clearAll = () => setSelected(new Set())

  // Отправка
  const { mutate: sendBroadcast, isPending: sending } = useMutation({
    mutationFn: async () => {
      const selectedClients = allClients
        .filter(c => selected.has(c.id))
        .map(c => ({ id: c.id, phone: c.phone, name: `${c.first_name} ${c.last_name}` }))

      const res = await fetch('/api/wa/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, clients: selectedClients }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'send failed')
      return data
    },
    onSuccess: (data) => {
      setResult(data.results)
      setSelected(new Set())
      setMessage('')
      qc.invalidateQueries({ queryKey: ['wa-broadcast-limit'] })
    },
  })

  const canSend = selected.size > 0 && message.trim().length > 0 && !sending && (limitStatus?.remaining ?? 0) > 0

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0" dir={l ? 'rtl' : 'ltr'}>

      {/* ── Левая колонка: список клиентов ── */}
      <div className="flex flex-col lg:w-[420px] lg:border-e border-gray-200 dark:border-slate-700 h-full lg:overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <MessageCircle size={22} className="text-green-500" />
            {l ? 'רשימת תפוצה WhatsApp' : 'WhatsApp рассылка'}
          </h1>

          {/* Лимит */}
          {limitStatus && <LimitBar status={limitStatus} l={l} />}

          {/* Поиск */}
          <div className="relative mb-3">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={l ? 'חיפוש לקוח...' : 'Поиск клиента...'}
              className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Фильтры по давности */}
          <div className="flex gap-2 flex-wrap mb-3">
            <FilterButton label={l ? 'הכל' : 'Все'} active={absentFilter === null} onClick={() => setAbsent(null)} />
            <FilterButton label={l ? '30+ ימים' : '30+ дней'} active={absentFilter === 30} onClick={() => setAbsent(30)} />
            <FilterButton label={l ? '60+ ימים' : '60+ дней'} active={absentFilter === 60} onClick={() => setAbsent(60)} />
            <FilterButton label={l ? '90+ ימים' : '90+ дней'} active={absentFilter === 90} onClick={() => setAbsent(90)} />
          </div>

          {/* Выбрать всех / очистить */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {l ? `נבחרו ${selected.size}` : `Выбрано ${selected.size}`}
              {limitStatus && selected.size > 0 && ` / ${limitStatus.remaining}`}
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline font-medium">
                {l ? 'בחר הכל' : 'Выбрать всех'}
              </button>
              {selected.size > 0 && (
                <button onClick={clearAll} className="text-xs text-red-500 hover:underline">
                  {l ? 'נקה' : 'Очистить'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-slate-700 animate-pulse" />
          ))}
          {!isLoading && filtered.map(c => (
            <ClientRow
              key={c.id} client={c}
              selected={selected.has(c.id)}
              onToggle={() => toggleClient(c.id)}
              l={l}
            />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-slate-500">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{l ? 'לא נמצאו לקוחות' : 'Клиенты не найдены'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Правая колонка: сообщение и отправка ── */}
      <div className="flex-1 flex flex-col p-5 lg:p-8 bg-gray-50 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">
          {l ? 'הודעה לשליחה' : 'Текст сообщения'}
        </h2>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={l ? 'כתוב את ההודעה שלך כאן...' : 'Напишите сообщение здесь...'}
          rows={6}
          className="w-full p-4 text-sm rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:border-blue-400 resize-none mb-3"
          dir="auto"
        />

        <p className="text-xs text-gray-400 dark:text-slate-500 mb-6">
          {l ? '* ההודעה תישלח לכל הלקוחות שנבחרו' : '* Сообщение будет отправлено всем выбранным клиентам'}
        </p>

        {/* Итог выбора */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <Users size={16} className="text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {l ? `${selected.size} לקוחות נבחרו לשליחה` : `Выбрано ${selected.size} клиентов для отправки`}
            </p>
          </div>
        )}

        {/* Результат отправки */}
        {result && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-green-500" />
              <span className="font-semibold text-green-700 dark:text-green-300">
                {l ? 'הרשימה נשלחה!' : 'Рассылка отправлена!'}
              </span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-400 space-y-0.5">
              <p>✅ {l ? `נשלחו: ${result.sent}` : `Отправлено: ${result.sent}`}</p>
              {result.failed > 0 && <p>❌ {l ? `נכשלו: ${result.failed}` : `Ошибок: ${result.failed}`}</p>}
              {result.skipped > 0 && <p>⏭️ {l ? `דולגו (מגבלה): ${result.skipped}` : `Пропущено (лимит): ${result.skipped}`}</p>}
            </div>
          </div>
        )}

        {/* Кнопка отправки */}
        <button
          onClick={() => sendBroadcast()}
          disabled={!canSend}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all',
            canSend
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 active:scale-95'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
          )}
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {sending
            ? (l ? 'שולח...' : 'Отправляем...')
            : (l ? `שלח ל-${selected.size} לקוחות` : `Отправить ${selected.size} клиентам`)}
        </button>

        {/* Предупреждение о лимите WhatsApp */}
        <div className="mt-6 flex items-start gap-2 text-xs text-gray-400 dark:text-slate-500">
          <Clock size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            {l
              ? 'WhatsApp מגביל שליחה המונית ל-30 הודעות ב-24 שעות. המגבלה מתאפסת כל יום.'
              : 'WhatsApp ограничивает рассылку до 30 сообщений в 24 часа. Лимит сбрасывается каждый день.'}
          </span>
        </div>
      </div>
    </div>
  )
}
