'use client'

import { ChevronRight, Calendar, Clock, ShoppingCart, Phone, CalendarPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useModalStore } from '@/store/useModalStore'
import { ClientBottomSheet } from './ClientBottomSheet'
import { useClientCardSettings } from './ClientCardSettingsModal'
import { useMobileBackTrap } from '@/hooks/useMobileBackTrap'

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
    address?: string
    city?: string
    date_of_birth?: string
    description?: string
    paint_code?: string
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
  onDelete?: (clientId: string) => void
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
  onDelete,
}: ClientCardProps) {
  const { openModal } = useModalStore()
  const [cardSettings] = useClientCardSettings()
  const [hasDraft, setHasDraft] = useState(false)
  const [swipeX, setSwipeX]     = useState(0)
  const [action, setAction]     = useState<'call' | 'visit' | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Mobile Back Button trap:
  // — свайп-действие (swipeX !== 0): "Назад" сбрасывает свайп
  // — шторка клиента (sheetOpen): "Назад" закрывает ClientBottomSheet
  // LIFO: сначала сбрасывается свайп, потом закрывается шторка
  useMobileBackTrap(Math.abs(swipeX) >= 10, () => setSwipeX(0))
  useMobileBackTrap(sheetOpen, () => setSheetOpen(false))
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isScrolling = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const actionRef = useRef<'call' | 'visit' | null>(null)
  // Refs для доступа к актуальным значениям внутри нативных event listeners
  const openModalRef     = useRef(openModal)
  const cardSettingsRef  = useRef(cardSettings)
  const clientRef        = useRef(client)
  const localeRef        = useRef(locale)
  useEffect(() => { openModalRef.current    = openModal     }, [openModal])
  useEffect(() => { cardSettingsRef.current = cardSettings  }, [cardSettings])
  useEffect(() => { clientRef.current       = client        }, [client])
  useEffect(() => { localeRef.current       = locale        }, [locale])

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

  const clientName    = getClientName(client)
  const initials      = getClientInitials(client)
  const [g1, g2]     = avatarGradient(clientName)
  const visitsCount   = client.visits_count || client.total_visits || 0
  const isRTL         = locale === 'he'
  // Optimistic-запись ещё не сохранена на сервере
  const isOptimistic  = client.id?.startsWith('optimistic-') ?? false

  const t = {
    he: { visits: 'ביקורים', call: 'שיחה', visit: 'ביקור', sale: 'מכירה' },
    ru: { visits: 'Визитов',  call: 'Звонок', visit: 'Визит', sale: 'Продажа' },
  }[locale]

  // Метка и иконка для свайпа вправо — зависит от настройки карточки
  const swipeRightLabel = cardSettings.primaryAction === 'visit' ? t.visit : t.sale
  const SwipeRightIcon  = cardSettings.primaryAction === 'visit' ? CalendarPlus : ShoppingCart

  // ── Touch handlers — через addEventListener { passive: false } ──────────
  // React вешает обработчики как passive по умолчанию (Chrome 56+),
  // из-за чего e.preventDefault() вызывает ошибку в консоли.
  // Решение: вешаем вручную с { passive: false } только для touchmove.
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isScrolling.current = false
      actionRef.current = null
      setAction(null)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      if (!isScrolling.current && Math.abs(dy) > Math.abs(dx)) {
        isScrolling.current = true
      }
      if (isScrolling.current) return
      e.preventDefault() // работает — passive: false
      const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx))
      setSwipeX(clamped)
      const next = clamped < -SWIPE_THRESHOLD ? 'call'
                 : clamped > SWIPE_THRESHOLD  ? 'visit'
                 : null
      actionRef.current = next
      setAction(next)
    }

    const handleTouchEnd = () => {
      if (isScrolling.current) { setSwipeX(0); return }
      const act = actionRef.current
      const c   = clientRef.current
      if (act === 'call' && c.phone) {
        window.location.href = `tel:${c.phone}`
      } else if (act === 'visit') {
        if (cardSettingsRef.current.primaryAction === 'visit') {
          openModalRef.current('visit-unified', { mode: 'create', clientId: c.id })
        } else {
          openModalRef.current('sale-unified', { clientId: c.id, clientName: `${c.first_name||''} ${c.last_name||''}`.trim() })
        }
      }
      setSwipeX(0)
      setAction(null)
      actionRef.current = null
      touchStartX.current = null
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    el.addEventListener('touchend',   handleTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove',  handleTouchMove)
      el.removeEventListener('touchend',   handleTouchEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = () => {
    if (Math.abs(swipeX) > 10) return // не открывать при свайпе
    // ── GUARD: не открываем шторку для optimistic записей ─────────────────
    // Пока сервер не вернул реальный UUID, карточка не кликабельна.
    // Это предотвращает попытку редактирования/просмотра несуществующего ID.
    if (client.id?.startsWith('optimistic-')) return
    if (onSelect) { onSelect(client); return }
    setSheetOpen(true)  // открываем TrinityMob через ClientBottomSheet
  }

  return (
    <>
    <div className="relative overflow-hidden rounded-2xl mb-2">
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
      {/* Правый фон: главное действие (свайп вправо) */}
      <div className={`absolute inset-y-0 start-0 flex items-center justify-start ps-5
        rounded-2xl transition-colors duration-150
        ${action === 'visit' ? 'bg-indigo-500 w-full' : 'bg-indigo-100 w-20'}`}>
        <div className="flex flex-col items-center gap-1">
          <SwipeRightIcon className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">{swipeRightLabel}</span>
        </div>
      </div>

      {/* ── Сама карточка ─────────────────────────────────────────────────── */}
      {/* Shimmer keyframes — инжектируем один раз */}
      {hasDraft && (
        <style>{`
          @keyframes trinity-draft-shimmer {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes trinity-draft-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.82; }
          }
        `}</style>
      )}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.25s ease' : 'none',
          ...(hasDraft ? {
            background: 'linear-gradient(120deg, #fff8e7, #fde8ff, #e8f0ff, #e8fff4, #fff8e7)',
            backgroundSize: '300% 300%',
            animation: 'trinity-draft-shimmer 3.5s ease infinite, trinity-draft-pulse 3.5s ease infinite',
            border: '1.5px solid transparent',
            backgroundClip: 'padding-box',
            boxShadow: '0 0 0 1.5px rgba(251,191,36,0.4), 0 4px 16px rgba(167,139,250,0.18), 0 1px 3px rgba(0,0,0,0.06)',
          } : {}),
        }}
        className={`relative flex items-center gap-3 px-4 py-3.5
          rounded-2xl select-none transition-opacity duration-300
          ${isOptimistic ? 'opacity-60 cursor-default' : 'cursor-pointer'}
          ${hasDraft
            ? 'shadow-sm active:opacity-90'
            : 'bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 active:bg-gray-50'
          }`}
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
                onClick={e => { e.stopPropagation(); openModal('sale-unified', { clientId: client.id, clientName: `${client.first_name||''} ${client.last_name||''}`.trim() }) }}
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
      onDelete={onDelete}
    />
    </>
  )
}
