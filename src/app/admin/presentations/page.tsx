'use client'

import Link from 'next/link'
import { Monitor, Truck, ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const PRESENTATIONS = [
  {
    id: 'courier',
    href: '/admin/presentations/courier',
    icon: Truck,
    title_he: 'מערכת קורירים',
    title_ru: 'Система курьеров',
    desc_he: 'ניהול קורירים בזמן אמת — מעקב GPS, זמן ממוצע, שכר יומי, קבלת תשלומים',
    desc_ru: 'Управление курьерами в реальном времени — GPS, среднее время, зарплата, приём платежей',
    badge_he: 'חי',
    badge_ru: 'LIVE',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
]

export default function PresentationsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'

  return (
    <div className="space-y-6 pb-8" dir={isHe ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Monitor className="w-6 h-6 text-indigo-500" />
          {isHe ? 'מצגות' : 'Презентации'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {isHe ? 'דמואים אינטראקטיביים למכירות' : 'Интерактивные демо для продаж'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {PRESENTATIONS.map((p) => {
          const Icon = p.icon
          return (
            <Link
              key={p.id}
              href={p.href}
              className={`group block rounded-2xl border ${p.border} ${p.bg} p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${p.color} text-white`}>
                  {isHe ? p.badge_he : p.badge_ru}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {isHe ? p.title_he : p.title_ru}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                {isHe ? p.desc_he : p.desc_ru}
              </p>
              <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                {isHe ? 'פתח דמו' : 'Открыть демо'}
                <ArrowLeft className={`w-4 h-4 ${isHe ? 'rotate-180' : ''}`} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
