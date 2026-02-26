'use client'

import { UserPlus, CreditCard, ListPlus, Printer, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuickActionsPanelProps {
  locale: string
}

export function QuickActionsPanel({ locale }: QuickActionsPanelProps) {
  const l = locale === 'he'
  const router = useRouter()

  const actions = [
    {
      icon: <UserPlus size={20} />,
      label: l ? 'לקוח חדש' : 'Новый клиент',
      onClick: () => router.push('/clients?action=new'),
      active: true,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: <CreditCard size={20} />,
      label: l ? 'מכירה חדשה' : 'Новая продажа',
      onClick: () => router.push('/payments?action=new'),
      active: true,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: <ListPlus size={20} />,
      label: l ? 'משימה חדשה' : 'Новая задача',
      onClick: () => router.push('/diary?action=new'),
      active: true,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: <Printer size={20} />,
      label: l ? 'הדפסת קבלה' : 'Печать квитанции',
      onClick: undefined,
      active: false,
      color: 'bg-slate-50 text-slate-300',
      hint: l ? 'בקרוב — אינטגרציית תשלומים' : 'Скоро — интеграция платежей',
    },
    {
      icon: <Upload size={20} />,
      label: l ? 'העלאת הוצאה' : 'Загрузить расход',
      onClick: undefined,
      active: false,
      color: 'bg-slate-50 text-slate-300',
      hint: l ? 'בקרוב — הוצאות עסקיות' : 'Скоро — расходы бизнеса',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-6">
      <h3 className="text-sm font-semibold mb-4">{l ? 'פעולות מהירות' : 'Быстрые действия'}</h3>
      
      <div className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            disabled={!action.active}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-start ${
              action.active ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
              {action.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{action.label}</p>
              {action.hint && (
                <p className="text-[10px] text-slate-300 mt-0.5">{action.hint}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
