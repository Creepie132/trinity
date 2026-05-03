'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/**
 * useClientSelfEditRealtime
 *
 * Подписывается на UPDATE в таблице `clients` для org.
 * При обновлении через self-edit ссылку — показывает кликабельный toast
 * с переходом в карточку клиента.
 *
 * Защита от ложных срабатываний:
 * - Проверяем что updated_at < 10 секунд назад (игнорируем при реконнекте)
 * - Подписка фильтрована по org_id на уровне Supabase Realtime
 */
export function useClientSelfEditRealtime(orgId: string | null, locale: 'he' | 'ru' = 'he') {
  const router = useRouter()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!orgId) return

    const channel = supabase
      .channel(`client-self-edit:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id?: string
            first_name?: string
            last_name?: string
            updated_at?: string
          }

          // Показываем только свежие события (< 10 сек)
          if (updated.updated_at) {
            const secondsAgo = (Date.now() - new Date(updated.updated_at).getTime()) / 1000
            if (secondsAgo > 10) return
          }

          const clientId = updated.id
          const name = `${updated.first_name ?? ''} ${updated.last_name ?? ''}`.trim()
            || (locale === 'he' ? 'לקוח' : 'Клиент')

          // Кликабельный toast — клик переводит в карточку клиента
          toast.success(
            locale === 'he'
              ? `✅ ${name} עדכן/ה את הפרופיל`
              : `✅ Клиент ${name} обновил профиль`,
            {
              description: locale === 'he'
                ? 'לחץ לפתיחת הפרופיל'
                : 'Нажмите, чтобы открыть карточку',
              duration: 8000,
              action: clientId
                ? {
                    label: locale === 'he' ? 'פתח ←' : 'Открыть →',
                    onClick: () => router.push(`/clients/${clientId}`),
                  }
                : undefined,
            }
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [orgId, locale, router])
}
