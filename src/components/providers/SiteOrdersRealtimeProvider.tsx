'use client'
/**
 * SiteOrdersRealtimeProvider
 *
 * Подписывается через Supabase Realtime на INSERT в site_orders для текущей org.
 * При новом заказе:
 *   1. Воспроизводит звук /sounds/notification.wav
 *   2. Показывает акцентный Toast с кнопкой "Перейти к заказу"
 *   3. Инвалидирует React Query кэш site-orders
 *
 * Монтируется в DashboardShell — работает на всех страницах дашборда.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/hooks/useAuth'
import { ShoppingBag, ArrowRight } from 'lucide-react'

// Храним глобально чтобы не создавать дважды при StrictMode
let channelCreated = false

export function SiteOrdersRealtimeProvider() {
  const { orgId } = useAuth()
  const router     = useRouter()
  const qc         = useQueryClient()
  const audioRef   = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!orgId || channelCreated) return
    channelCreated = true

    const supabase = createSupabaseBrowserClient()

    // Preload audio
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.wav')
      audioRef.current.volume = 0.7
      audioRef.current.load()
    }

    const channel = supabase
      .channel(`site-orders-realtime-${orgId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'site_orders',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const order = payload.new as {
            id: string
            customer_name: string
            total_amount: number
            items: Array<{ product_name: string; quantity: number }>
          }

          // 1. Звук
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {
              // Autoplay может быть заблокирован до первого gesture — не критично
            })
          }

          // 2. Инвалидируем кэш
          qc.invalidateQueries({ queryKey: ['site-orders'] })
          qc.invalidateQueries({ queryKey: ['new-orders-count'] })

          // 3. Акцентный Toast
          const firstItem = order.items?.[0]
          const productLine = firstItem
            ? `${firstItem.product_name} × ${firstItem.quantity}`
            : ''

          toast.custom(
            (toastId) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 8px 32px rgba(245,158,11,0.18)',
                  minWidth: 300,
                  maxWidth: 380,
                  fontFamily: 'inherit',
                }}
              >
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingBag size={18} color="#fff" />
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
                    🛍️ Новый заказ с сайта!
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                    {order.customer_name}{productLine ? ` · ${productLine}` : ''}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                    ₪{Number(order.total_amount).toFixed(0)}
                  </p>
                  <button
                    onClick={() => {
                      toast.dismiss(toastId)
                      router.push('/sales')
                    }}
                    style={{
                      marginTop: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#d97706',
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Перейти к заказу <ArrowRight size={11} />
                  </button>
                </div>
                {/* Dismiss */}
                <button
                  onClick={() => toast.dismiss(toastId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ),
            { duration: 12000, position: 'top-right' }
          )
        }
      )
      .subscribe()

    return () => {
      channelCreated = false
      supabase.removeChannel(channel)
    }
  }, [orgId])

  return null
}
