'use client'

import { Calendar, Clock, ChevronRight, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useModalStore } from '@/store/useModalStore'

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
  onSelect?: (client: any) => void
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
    // Initial check
    setHasDraft(!!localStorage.getItem(draftKey))

    // Re-check when storage changes (e.g. draft saved/cleared in another modal)
    const handleStorage = () => {
      setHasDraft(!!localStorage.getItem(draftKey))
    }
    window.addEventListener('storage', handleStorage)
    // Also poll on focus — catches same-tab updates (localStorage doesn't fire 'storage' in same tab)
    window.addEventListener('focus', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleStorage)
    }
  }, [client.id])

  const clientName = getClientName(client)
  const initials = getClientInitials(client)

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  const colorIndex = clientName.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIndex]

  const visitsCount = client.visits_count || client.total_visits || 0

  const t = {
    he: {
      visits: 'ביקורים',
      lastVisit: 'ביקור אחרון',
    },
    ru: {
      visits: 'Визитов',
      lastVisit: 'Последний визит',
    },
  }

  const text = t[locale]

  const handleCardClick = () => {
    openModal('client-details', {
      client,
      locale,
      enabledModules,
    })
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-card border rounded-xl p-4 mb-2 active:bg-muted/50 transition cursor-pointer ${hasDraft ? 'draft-glow' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${avatarColor} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base truncate">{clientName}</h4>
            {hasDraft && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openModal('client-sale', { client, locale })
                }}
                className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 transition flex-shrink-0"
                title={locale === 'he' ? 'יש עסקה שמורה' : 'Есть сохранённая сделка'}
              >
                <ShoppingCart className="w-4 h-4 text-amber-500" />
              </button>
            )}
          </div>
          {client.phone && (
            <p className="text-sm text-muted-foreground truncate">{client.phone}</p>
          )}
        </div>

        <ChevronRight className="text-muted-foreground flex-shrink-0" size={18} />
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-muted">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={13} />
          <span>
            {text.visits}: {visitsCount}
          </span>
        </div>

        {client.last_visit && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={13} />
            <span>
              {new Date(client.last_visit).toLocaleDateString(
                locale === 'he' ? 'he-IL' : 'ru-RU'
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
