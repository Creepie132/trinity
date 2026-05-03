'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/**
 * useClientSelfEditRealtime
 * Подписывается на изменения в таблице `clients` для конкретной org.
 * Когда клиент обновляет профиль через self-edit ссылку — показывает toast.
 *
 * Использование (в dashboard layout или на странице клиентов):
 *   useClientSelfEditRealtime(orgId, locale)
 */
export function useClientSelfEditRealtime(orgId: string | null, locale: 'he' | 'ru' = 'he') {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!orgId) return

    // Подписываемся на UPDATE в таблице clients для нашей org
    // Фильтруем по org_id чтобы не получать чужие события
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
          const updated = payload.new as { first_name?: string; last_name?: string; updated_at?: string }

          // Показываем только если запись была обновлена в последние 10 секунд
          // (не показываем старые события при реконнекте)
          if (updated.updated_at) {
            const secondsAgo = (Date.now() - new Date(updated.updated_at).getTime()) / 1000
            if (secondsAgo > 10) return
          }

          const name = `${updated.first_name ?? ''} ${updated.last_name ?? ''}`.trim() || (locale === 'he' ? 'לקוח' : 'Клиент')

          toast.success(
            locale === 'he'
              ? `✅ ${name} עדכן/ה את הפרופיל`
              : `✅ Клиент ${name} обновил профиль`,
            {
              description: locale === 'he'
                ? 'הפרטים עודכנו בהצלחה'
                : 'Данные обновлены в CRM',
              duration: 6000,
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
  }, [orgId, locale])
}
