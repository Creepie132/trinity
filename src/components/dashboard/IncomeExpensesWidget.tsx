'use client'

import { TrendingUp } from 'lucide-react'

interface IncomeExpensesWidgetProps {
  locale: string
}

export function IncomeExpensesWidget({ locale }: IncomeExpensesWidgetProps) {
  const l = locale === 'he'

  return (
    <div className="bg-white rounded-2xl border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
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
    </div>
  )
}
