'use client'

import Link from 'next/link'
import { Truck, ArrowLeft, Monitor } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

// Worker видит те же презентации — read-only, без настроек
export default function WorkerPresentationsPage() {
  const { language } = useLanguage()
  const isHe = language === 'he'

  return (
    <div className="space-y-6 pb-8 px-4" dir={isHe ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-500" />
          {isHe ? 'מצגות' : 'Презентации'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {isHe ? 'הצג ללקוחות פוטנציאליים' : 'Показывай потенциальным клиентам'}
        </p>
      </div>

      <Link href="/admin/presentations/courier"
        className="group block rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            {isHe ? 'חי' : 'LIVE'}
          </span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {isHe ? 'מערכת קורירים' : 'Система курьеров'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
          {isHe
            ? 'ניהול קורירים בזמן אמת — מעקב GPS, זמן ממוצע, שכר יומי, קבלת תשלומים'
            : 'Управление курьерами в реальном времени — GPS, среднее время, зарплата, приём платежей'}
        </p>
        <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
          {isHe ? 'פתח דמו' : 'Открыть демо'}
          <ArrowLeft className={`w-4 h-4 ${isHe ? 'rotate-180' : ''}`} />
        </div>
      </Link>
    </div>
  )
}
