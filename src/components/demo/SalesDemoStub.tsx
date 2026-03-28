'use client'

/**
 * SalesDemoStub — заглушка для /sales в демо-режиме.
 * Показывает описание модуля, план цен и кнопку связи в WhatsApp.
 */

import { MessageCircle, Check } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { WA_LINK, TRINITY_PLANS } from '@/lib/trinityPlans'

const T = {
  ru: {
    title: 'Модуль продаж Trinity',
    desc: 'Фиксируйте все продажи товаров и услуг в одном месте. Автоматические отчёты, статистика и история по каждому клиенту.',
    features: ['История всех сделок', 'Привязка к клиенту', 'Статусы оплаты', 'Импорт из Excel', 'Аналитика по месяцам', 'Чеки и счета'],
    plansTitle: 'Тарифные планы',
    cta: 'Написать в WhatsApp',
    sub: 'Влад ответит в течение нескольких минут',
  },
  he: {
    title: 'מודול מכירות Trinity',
    desc: 'תעד את כל מכירות המוצרים והשירותים במקום אחד. דוחות אוטומטיים, סטטיסטיקה והיסטוריה לכל לקוח.',
    features: ['היסטוריית מכירות', 'קישור ללקוח', 'סטטוסי תשלום', 'ייבוא מ-Excel', 'ניתוח חודשי', 'קבלות וחשבוניות'],
    plansTitle: 'תוכניות מחיר',
    cta: 'כתוב לנו ב-WhatsApp',
    sub: 'ולד יענה תוך דקות ספורות',
  },
}

export function SalesDemoStub() {
  const { language } = useLanguage()
  // ⚡ Убраны: visible state + requestAnimationFrame + transition-opacity 500ms
  // Контент рендерится СИНХРОННО — нет искусственных задержек
  const isHe = language === 'he'
  const t = T[isHe ? 'he' : 'ru']
  const dir = isHe ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="min-h-screen py-8 px-4">
      {/* ── Hero ── */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 opacity-20 blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl">
            <span className="text-3xl">🛍️</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">{t.desc}</p>
      </div>

      {/* ── Features grid ── */}
      <div className="grid grid-cols-2 gap-2 mb-8 max-w-sm mx-auto">
        {t.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">
            <Check size={14} className="text-emerald-500 flex-shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      {/* ── Pricing plans ── */}
      <div className="mb-8">
        <h2 className="text-center text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.plansTitle}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {TRINITY_PLANS.map((plan, i) => {
            const badge = isHe ? plan.badgeHe : plan.badge
            const name = isHe ? plan.nameHe : plan.nameRu
            const price = isHe ? plan.priceHe : plan.price
            const period = isHe ? plan.periodHe : plan.periodRu
            const features = isHe ? plan.featuresHe : plan.featuresRu
            return (
              <div key={i}
                className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5
                  ${badge ? 'border-amber-400 shadow-amber-100 dark:shadow-amber-900/20 shadow-lg bg-white dark:bg-gray-800'
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
                style={{ animation: `fadeInUp 0.4s ${i * 0.08}s ease both` }}>
                {badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {badge}
                  </span>
                )}
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-sm font-bold">{name[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{price}</span>
                    {period && <span className="text-xs text-gray-400">{period}</span>}
                  </div>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── WhatsApp CTA ── */}
      <div className="max-w-sm mx-auto">
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.35)' }}>
          <MessageCircle size={20} />
          <span>{t.cta}</span>
        </a>
        <p className="text-xs text-gray-400 text-center mt-2">{t.sub}</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-1">Trinity CRM by Amber Solutions</p>
      </div>
    </div>
  )
}
