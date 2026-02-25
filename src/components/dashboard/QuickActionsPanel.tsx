'use client'

import { Plus, UserPlus, Calendar, MessageSquare, Settings, Zap } from 'lucide-react'
import Link from 'next/link'

interface QuickActionsPanelProps {
  locale: string
}

export function QuickActionsPanel({ locale }: QuickActionsPanelProps) {
  const title = locale === 'he' ? 'פעולות מהירות' : 'Быстрые действия'
  
  const actions = [
    {
      icon: Calendar,
      label: locale === 'he' ? 'ביקור חדש' : 'Новый визит',
      href: '/visits?action=new',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    },
    {
      icon: UserPlus,
      label: locale === 'he' ? 'לקוח חדש' : 'Новый клиент',
      href: '/clients?action=new',
      color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    },
    {
      icon: MessageSquare,
      label: locale === 'he' ? 'שלח SMS' : 'Отправить SMS',
      href: '/sms',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    },
    {
      icon: Plus,
      label: locale === 'he' ? 'משימה חדשה' : 'Новая задача',
      href: '/diary?action=new',
      color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    },
    {
      icon: Settings,
      label: locale === 'he' ? 'הגדרות' : 'Настройки',
      href: '/settings',
      color: 'bg-slate-50 text-slate-600 hover:bg-slate-100',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={20} className="text-amber-500" />
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      
      <div className="space-y-2">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Link
              key={index}
              href={action.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${action.color}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          )
        })}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
        <p className="text-xs text-slate-600 mb-2">
          {locale === 'he' ? '💡 טיפ' : '💡 Совет'}
        </p>
        <p className="text-sm font-medium text-slate-700">
          {locale === 'he' 
            ? 'השתמש בלוח המחוונים כדי לעקוב אחר הביצועים שלך'
            : 'Используйте дашборд для отслеживания показателей'}
        </p>
      </div>
    </div>
  )
}
