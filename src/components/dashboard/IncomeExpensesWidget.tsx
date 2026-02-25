'use client'

import { useState, useEffect } from 'react'
import { PieChart, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

interface IncomeExpensesWidgetProps {
  locale: string
  orgId: string
}

export function IncomeExpensesWidget({ locale, orgId }: IncomeExpensesWidgetProps) {
  const title = locale === 'he' ? 'הכנסות והוצאות' : 'Доходы и расходы'
  const incomeLabel = locale === 'he' ? 'הכנסות' : 'Доходы'
  const expensesLabel = locale === 'he' ? 'הוצאות' : 'Расходы'
  const profitLabel = locale === 'he' ? 'רווח' : 'Прибыль'
  
  const [data, setData] = useState({ income: 0, expenses: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const paymentsRes = await fetch('/api/payments')
        const paymentsData = await paymentsRes.json()
        const paymentsArr = Array.isArray(paymentsData) ? paymentsData : paymentsData?.data || []
        
        const monthPayments = paymentsArr.filter((p: any) => {
          const paymentDate = new Date(p.created_at || p.paid_at)
          return paymentDate >= monthStart && (p.status === 'completed' || p.status === 'success')
        })
        
        const income = monthPayments.reduce((sum: number, p: any) => sum + (p.amount || p.price || 0), 0)
        
        // Для расходов можно добавить API позже, пока 0
        const expenses = 0
        
        setData({ income, expenses })
        setLoading(false)
      } catch (error) {
        console.error('Error loading income/expenses:', error)
        setLoading(false)
      }
    }
    
    loadData()
  }, [orgId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 h-full animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  const profit = data.income - data.expenses
  const profitPercent = data.income > 0 ? Math.round((profit / data.income) * 100) : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <PieChart size={20} className="text-slate-400" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={20} className="text-emerald-600" />
            <span className="text-sm font-medium">{incomeLabel}</span>
          </div>
          <span className="font-bold text-emerald-600">
            ₪{data.income.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
          <div className="flex items-center gap-2">
            <ArrowDownCircle size={20} className="text-red-600" />
            <span className="text-sm font-medium">{expensesLabel}</span>
          </div>
          <span className="font-bold text-red-600">
            ₪{data.expenses.toLocaleString()}
          </span>
        </div>
        
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">{profitLabel}</span>
            <div className="text-right">
              <p className="font-bold text-lg">₪{profit.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{profitPercent}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
