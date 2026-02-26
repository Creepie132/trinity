'use client'

import { TrendingUp } from 'lucide-react'
import { WidgetCard } from '@/components/ui/WidgetCard'

interface IncomeExpensesWidgetProps {
  locale: string
}

export function IncomeExpensesWidget({ locale }: IncomeExpensesWidgetProps) {
  const l = locale === 'he'

  return (
    <WidgetCard className="p-4">
      <h3 className="text-sm font-semibold mb-4">
        {l ? 'הכנסות מול הוצאות' : 'Доходы vs Расходы'}
      </h3>
      
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
          <TrendingUp size={20} className="text-slate-300" />
        </div>
        <p className="text-sm text-slate-400 text-center">
          {l ? 'יהיה זמין עם מודול ההוצאות' : 'Доступно с модулем расходов'}
        </p>
      </div>
    </WidgetCard>
  )
}
