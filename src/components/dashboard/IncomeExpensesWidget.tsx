'use client'

import { FinancesChart } from '@/components/finances/FinancesChart'
import { format } from 'date-fns'

interface IncomeExpensesWidgetProps {
  locale: string
}

export function IncomeExpensesWidget({ locale: _locale }: IncomeExpensesWidgetProps) {
  const month = format(new Date(), 'yyyy-MM')
  return <FinancesChart month={month} />
}
