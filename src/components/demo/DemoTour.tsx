'use client'

import { useEffect, useRef } from 'react'
import { useDemoContext } from '@/contexts/DemoContext'

/**
 * 5-шаговый тур по Trinity CRM на базе driver.js.
 * Загружается динамически — не попадает в основной bundle.
 */

const TOUR_STEPS = [
  {
    element: '#demo-step-dashboard',
    popover: {
      title: '📊 Шаг 1 из 5 — Дашборд',
      description: 'Сводка бизнеса в реальном времени: выручка, визиты, средний чек и динамика по дням.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#demo-step-pipeline',
    popover: {
      title: '🎯 Шаг 2 из 5 — Пайплайн лидов',
      description: 'Ведите потенциальных клиентов от первого контакта до записи. Ни один лид не потеряется.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#demo-step-income',
    popover: {
      title: '💰 Шаг 3 из 5 — Ввод дохода',
      description: 'Фиксируйте оплаты в один клик. Наличные, карта, абонемент — всё фиксируется автоматически.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '#demo-step-analytics',
    popover: {
      title: '📈 Шаг 4 из 5 — Аналитика',
      description: 'Какой мастер приносит больше? Какая услуга самая прибыльная? Ответы — на графиках.',
      side: 'left' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#demo-step-settings',
    popover: {
      title: '⚙️ Шаг 5 из 5 — Настройки',
      description: 'SMS, WhatsApp, уведомления, персонал. Система адаптируется под ваш бизнес — не наоборот.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
]

export function DemoTour() {
  const { isTourActive, endTour } = useDemoContext()
  const driverRef = useRef<any>(null)

  useEffect(() => {
    if (!isTourActive) return

    let mounted = true

    import('driver.js').then(({ driver }) => {
      if (!mounted) return

      const driverObj = driver({
        showProgress: true,
        progressText: 'Шаг {{current}} из {{total}}',
        nextBtnText: 'Далее →',
        prevBtnText: '← Назад',
        doneBtnText: '🚀 Хочу такую систему!',
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayColor: 'rgba(0,0,0,0.65)',
        popoverClass: 'trinity-tour-popover',
        onDestroyStarted: () => {
          driverObj.destroy()
          endTour()
          setTimeout(() => {
            const ok = window.confirm(
              '🎉 Тур завершён!\n\nХотите получить Trinity CRM для вашего бизнеса?\nНажмите ОК — напишем вам в WhatsApp прямо сейчас.'
            )
            if (ok) window.open('https://wa.me/972544858586?text=Хочу+Trinity+CRM+для+своего+бизнеса', '_blank')
          }, 300)
        },
        steps: TOUR_STEPS,
      })

      driverRef.current = driverObj
      driverObj.drive()
    }).catch(err => {
      console.warn('[DemoTour] Failed to load driver.js:', err)
      endTour()
    })

    return () => {
      mounted = false
      if (driverRef.current) {
        try { driverRef.current.destroy() } catch { /* ignore */ }
      }
    }
  }, [isTourActive, endTour])

  return null
}
