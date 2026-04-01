'use client'

import { useState, useEffect } from 'react'
import { FinancesChart } from '@/components/finances/FinancesChart'
import { format } from 'date-fns'

interface IncomeExpensesWidgetProps {
  locale: string
}

export function IncomeExpensesWidget({ locale: _locale }: IncomeExpensesWidgetProps) {
  // Use state to avoid SSR/client hydration mismatch (server=UTC, client=local timezone)
  const [month, setMonth] = useState('')
  useEffect(() => { setMonth(format(new Date(), 'yyyy-MM')) }, [])
  if (!month) return null
  return <FinancesChart month={month} />
}
