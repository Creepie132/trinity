'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Debt {
  id: string
  name: string
  phone: string
  amount: number
}

interface DebtWidgetProps {
  result: { found: boolean; debts: Debt[] }
}

export function DebtWidget({ result }: DebtWidgetProps) {
  const [sent, setSent]       = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  if (!result?.found || !result.debts.length) {
    return (
      <div className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs"
        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#34d399' }} />
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Должников нет. Все расчёты в порядке.</span>
      </div>
    )
  }

  const handleRemind = async (debt: Debt) => {
    if (sent[debt.id] || loading[debt.id] || !debt.phone) return
    setLoading(prev => ({ ...prev, [debt.id]: true }))
    try {
      const res = await fetch('/api/kira/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId:     debt.id,
          phone:      debt.phone,
          clientName: debt.name,
          amount:     debt.amount,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(prev => ({ ...prev, [debt.id]: true }))
        toast.success(`WA отправлен: ${debt.name}`)
      } else {
        const msg = data.error === 'WhatsApp not configured'
          ? 'WhatsApp не настроен в организации'
          : data.error ?? 'Ошибка отправки'
        toast.error(msg)
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setLoading(prev => ({ ...prev, [debt.id]: false }))
    }
  }

  const totalDebt = result.debts.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="rounded-xl overflow-hidden text-xs"
      style={{ background: 'rgba(30,32,39,0.9)', border: '1px solid rgba(248,113,113,0.2)' }}>

      {/* Заголовок */}
      <div className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(248,113,113,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: 'rgba(248,113,113,0.8)' }} />
          <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Задолженности — {result.debts.length}
          </span>
        </div>
        <span className="font-bold" style={{ color: 'rgba(248,113,113,0.9)' }}>
          ₪{Math.round(totalDebt)}
        </span>
      </div>

      {/* Список */}
      <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        {result.debts.map((debt) => (
          <div key={debt.id} className="flex items-center justify-between px-3 py-2 gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {debt.name}
              </p>
              {debt.phone
                ? <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{debt.phone}</p>
                : <p className="text-[10px]" style={{ color: 'rgba(248,113,113,0.4)' }}>нет телефона</p>
              }
            </div>

            <span className="flex-shrink-0 font-bold" style={{ color: 'rgba(248,113,113,0.85)' }}>
              ₪{debt.amount}
            </span>

            <button
              onClick={() => handleRemind(debt)}
              disabled={sent[debt.id] || loading[debt.id] || !debt.phone}
              title={debt.phone ? 'Напомнить в WhatsApp' : 'Нет телефона'}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 disabled:opacity-40"
              style={{
                background: sent[debt.id] ? 'rgba(52,211,153,0.15)' : 'rgba(37,211,102,0.15)',
                border: `1px solid ${sent[debt.id] ? 'rgba(52,211,153,0.3)' : 'rgba(37,211,102,0.25)'}`,
              }}
            >
              {loading[debt.id]
                ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'rgba(37,211,102,0.8)' }} />
                : sent[debt.id]
                  ? <CheckCircle2 className="w-3 h-3" style={{ color: '#34d399' }} />
                  : <MessageCircle className="w-3 h-3" style={{ color: 'rgba(37,211,102,0.8)' }} />
              }
              <span className="text-[10px] font-medium"
                style={{ color: sent[debt.id] ? '#34d399' : 'rgba(37,211,102,0.85)' }}>
                {loading[debt.id] ? '...' : sent[debt.id] ? 'Отправлено' : 'Напомнить'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
