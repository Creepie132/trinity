'use client'

import { Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

interface TodayVisitsWidgetProps {
  visits: any[]
  locale: string
}

export function TodayVisitsWidget({ visits, locale }: TodayVisitsWidgetProps) {
  const title = locale === 'he' ? 'ביקורים היום' : 'Визиты сегодня'
  const noVisits = locale === 'he' ? 'אין ביקורים' : 'Нет визитов'
  const viewAll = locale === 'he' ? 'כל הביקורים' : 'Все визиты'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <Calendar size={20} className="text-slate-400" />
      </div>
      
      {visits.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">{noVisits}</p>
      ) : (
        <div className="space-y-3">
          {visits.map((visit: any) => (
            <Link 
              key={visit.id} 
              href={`/visits`}
              className="block p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {visit.clients?.first_name} {visit.clients?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {visit.service_type || visit.services?.name || 'Услуга'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock size={12} />
                  {new Date(visit.scheduled_at).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {visits.length > 0 && (
        <Link 
          href="/visits" 
          className="block text-center text-sm text-blue-600 hover:text-blue-700 mt-4"
        >
          {viewAll} →
        </Link>
      )}
    </div>
  )
}
