'use client'

import { ChevronRight, Calendar, Clock, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useModalStore } from '@/store/useModalStore'

// ── Палитра аватаров (мягкие градиенты, как на остальных экранах) ─────────────
const AVATAR_GRADIENTS = [
  ['#8B5CF6', '#6366F1'], // purple→indigo
  ['#10B981', '#0D9488'], // emerald→teal
  ['#F59E0B', '#EF4444'], // amber→red
  ['#EC4899', '#F43F5E'], // pink→rose
  ['#3B82F6', '#06B6D4'], // blue→cyan
  ['#8B5CF6', '#A855F7'], // violet→purple
]

function avatarGradient(name: string): [string, string] {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx] as [string, string]
}

// ── Форматирование даты ───────────────────────────────────────────────────────
function fmtDate(iso: string, locale: 'he' | 'ru'): string {
  return new Date(iso).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Типы ──────────────────────────────────────────────────────────────────────
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

export function ClientCard({
  client,
  locale,
  isDemo,
  enabledModules,
  onSelect,
}: ClientCardProps) {
  const { openModal } = useModalStore()
  const [hasDraft, setHasDraft] = useState(false)

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

  const clientName = getClientName(client)
  const initials   = getClientInitials(client)
  const [g1, g2]   = avatarGradient(clientName)
  const visitsCount = client.visits_count || client.total_visits || 0
  const isRTL = locale === 'he'

  const handleCardClick = () => {
    if (onSelect) { onSelect(client); return }
    openModal('client-details', { client, locale, enabledModules })
  }

  const t = {
    he: { visits: 'ביקורים', lastVisit: 'ביקור אחרון' },
    ru: { visits: 'Визитов',  lastVisit: 'Последний визит' },
  }[locale]

  return (
    <div
      onClick={handleCardClick}
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`relative flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5
        border border-gray-100 shadow-sm
        hover:shadow-md hover:border-indigo-100 active:scale-[0.98]
        transition-all duration-200 cursor-pointer mb-2
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

        {/* Нижняя строка: визиты + последний визит */}
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

      {/* Шеврон — зеркалится через RTL dir автоматически */}
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </div>
  )
}
