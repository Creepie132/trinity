'use client'

/**
 * DashboardAutoTour
 *
 * Монтируется внутри DashboardContent.
 * При наличии localStorage-флага 'trinity_demo_start_tour'
 * запускает 5-шаговый driver.js тур и сбрасывает флаг.
 *
 * Работает без DemoProvider — не требует никакого контекста.
 * driver.js загружается динамически — не влияет на LCP.
 */

import { useEffect, useRef } from 'react'

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
      title: '🎯 Шаг 2 из 5 — Пайплайн',
      description: 'Ведите потенциальных клиентов от первого контакта до записи. Ни один лид не потеряется.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '#demo-step-income',
    popover: {
      title: '💰 Шаг 3 из 5 — Финансы',
      description: 'Фиксируйте оплаты в один клик. Наличные, карта, абонемент — всё фиксируется автоматически.',
      side: 'bottom' as const,
      align: 'center' as const,
    },
  },
  {
    element: '#demo-step-analytics',
    popover: {
      title: '📈 Шаг 4 из 5 — Аналитика',
      description: 'Какой мастер приносит больше? Какая услуга самая прибыльная? Ответы — на графиках.',
      side: 'bottom' as const,
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

export function DashboardAutoTour() {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return

    // Проверяем флаг
    let shouldRun = false
    try {
      shouldRun = localStorage.getItem('trinity_demo_start_tour') === '1'
    } catch {}

    if (!shouldRun) return
    started.current = true

    // Сбрасываем флаг сразу — повторный запуск не нужен
    try { localStorage.removeItem('trinity_demo_start_tour') } catch {}

    // Даём 1200ms — DOM должен отрисоваться полностью
    const timer = setTimeout(async () => {
      try {
        const { driver } = await import('driver.js')

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
            setTimeout(() => {
              const ok = window.confirm(
                '🎉 Тур завершён!\n\nХотите получить Trinity CRM для вашего бизнеса?\nНажмите ОК — напишем вам в WhatsApp прямо сейчас.'
              )
              if (ok) {
                window.open(
                  'https://wa.me/972544858586?text=Хочу+Trinity+CRM+для+своего+бизнеса',
                  '_blank'
                )
              }
            }, 350)
          },
          steps: TOUR_STEPS,
        })

        driverObj.drive()
      } catch (err) {
        console.warn('[DashboardAutoTour] driver.js failed:', err)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  return null
}
