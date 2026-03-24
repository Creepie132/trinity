'use client'

import { ChevronRight, Calendar, Clock, ShoppingCart, Phone, CalendarPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useModalStore } from '@/store/useModalStore'
import { ClientBottomSheet } from './ClientBottomSheet'

// ── Палитра аватаров ──────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ['#8B5CF6', '#6366F1'],
  ['#10B981', '#0D9488'],
  ['#F59E0B', '#EF4444'],
  ['#EC4899', '#F43F5E'],
  ['#3B82F6', '#06B6D4'],
  ['#8B5CF6', '#A855F7'],
]

function avatarGradient(name: string): [string, string] {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx] as [string, string]
}

function fmtDate(iso: string, locale: 'he' | 'ru'): string {
  return new Date(iso).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

interface ClientCardProps {
  client: {
    id: string
    first_name?: string
    last_name?: string
    name?: string
    phone?: string
    email?: string
    visits_count?: number
    total_visits?: number
    last_visit?: string
    notes?: string
    created_at?: string
    total_paid?: string | number
  }
  locale: 'he' | 'ru'
  isDemo?: boolean
  enabledModules?: Record<string, boolean>
  onSelect?: (client: unknown) => void
}

// ── Константы свайпа ──────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 60   // px — минимум чтобы засчитался свайп
const SWIPE_MAX      = 100  // px — максимальный сдвиг карточки

export function ClientCard({
  client,
  locale,
  isDemo,
  enabledModules,
  onSelect,
}: ClientCardProps) {
  const { openModal } = useModalStore()
  const [hasDraft, setHasDraft] = useState(false)
  const [swipeX, setSwipeX]     = useState(0)
  const [action, setAction]     = useState<'call' | 'visit' | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isScrolling = useRef(false)

  useEffect(() => {
    const draftKey = `draft_sale_${client.id}`
    setHasDraft(!!localStorage.getItem(draftKey))
    const handleStorage = () => setHasDraft(!!localStorage.getItem(draftKey))
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleStorage)
    }
  }, [client.id])

  // Сбрасываем свайп если нажали в другое место
  useEffect(() => {
    if (swipeX === 0) return
    const id = setTimeout(() => setSwipeX(0), 2500)
    return () => clearTimeout(id)
  }, [swipeX])

  const clientName  = getClientName(client)
  const initials    = getClientInitials(client)
  const [g1, g2]   = avatarGradient(clientName)
  const visitsCount = client.visits_count || client.total_visits || 0
  const isRTL       = locale === 'he'

  const t = {
    he: { visits: 'ביקורים', call: 'שיחה', visit: 'ביקור' },
    ru: { visits: 'Визитов',  call: 'Звонок', visit: 'Визит' },
  }[locale]

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isScrolling.current = false
    setAction(null)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    // Если вертикальный скролл — не блокируем
    if (!isScrolling.current && Math.abs(dy) > Math.abs(dx)) {
      isScrolling.current = true
    }
    if (isScrolling.current) return
    e.preventDefault()
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx))
    setSwipeX(clamped)
    if (clamped < -SWIPE_THRESHOLD)      setAction('call')
    else if (clamped > SWIPE_THRESHOLD)  setAction('visit')
    else                                 setAction(null)
  }

  const onTouchEnd = () => {
    if (isScrolling.current) { setSwipeX(0); return }
    if (action === 'call' && client.phone) {
      window.location.href = `tel:${client.phone}`
    } else if (action === 'visit') {
      setSheetOpen(true)
    }
    setSwipeX(0)
    setAction(null)
    touchStartX.current = null
  }

  const handleCardClick = () => {
    if (Math.abs(swipeX) > 10) return // не открывать при свайпе
    if (onSelect) { onSelect(client); return }
    setSheetOpen(true)  // открываем TrinityMob через ClientBottomSheet
  }

  return (
    <>
    <div className="relative overflow-hidden rounded-2xl mb-2 touch-pan-y">
      {/* ── Фоны свайп-действий ─────────────────────────────────────────── */}
      {/* Левый фон: звонок (свайп влево — карточка уходит влево) */}
      <div className={`absolute inset-y-0 end-0 flex items-center justify-end pe-5
        rounded-2xl transition-colors duration-150
        ${action === 'call' ? 'bg-emerald-500 w-full' : 'bg-emerald-100 w-20'}`}>
        <div className="flex flex-col items-center gap-1">
          <Phone className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">{t.call}</span>
        </div>
      </div>
      {/* Правый фон: создать визит (свайп вправо) */}
      <div className={`absolute inset-y-0 start-0 flex items-center justify-start ps-5
        rounded-2xl transition-colors duration-150
        ${action === 'visit' ? 'bg-indigo-500 w-full' : 'bg-indigo-100 w-20'}`}>
        <div className="flex flex-col items-center gap-1">
          <CalendarPlus className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">{t.visit}</span>
        </div>
      </div>

      {/* ── Сама карточка ─────────────────────────────────────────────────── */}
      <div
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.25s ease' : 'none' }}
        className={`relative flex items-center gap-3 bg-white px-4 py-3.5
          border border-gray-100 shadow-sm rounded-2xl
          hover:shadow-md hover:border-indigo-100
          active:bg-gray-50 cursor-pointer select-none
          ${hasDraft ? 'draft-glow' : ''}`}
      >
        {/* Аватар */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md"
          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
        >
          {initials || '?'}
        </div>

        {/* Основная информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{clientName || '—'}</p>
            {hasDraft && (
              <button
                onClick={e => { e.stopPropagation(); openModal('client-sale', { client, locale }) }}
                className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 transition shrink-0"
                title={locale === 'he' ? 'יש עסקה שמורה' : 'Есть сохранённая сделка'}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
              </button>
            )}
          </div>
          {client.phone && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{client.phone}</p>
          )}

          {/* Нижняя строка */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50">
            <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
              <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
              {t.visits}: <span className="font-bold text-gray-700 ms-0.5">{visitsCount}</span>
            </span>
            {client.last_visit && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                {fmtDate(client.last_visit, locale)}
              </span>
            )}
          </div>
        </div>

        {/* Шеврон */}
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    </div>

    {/* TrinityMob — мобильная шторка клиента */}
    <ClientBottomSheet
      client={client}
      isOpen={sheetOpen}
      onClose={() => setSheetOpen(false)}
      locale={locale}
      isDemo={isDemo}
      enabledModules={enabledModules}
    />
    </>
  )
}
