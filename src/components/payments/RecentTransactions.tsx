import { CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  client_name: string | null
  client_phone: string | null
  created_at: string
  paid_at: string | null
}

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  paid:      { label: 'Paid',      icon: CheckCircle2, color: 'text-emerald-400' },
  pending:   { label: 'Pending',   icon: Clock,        color: 'text-amber-400'   },
  failed:    { label: 'Failed',    icon: XCircle,      color: 'text-red-400'     },
  cancelled: { label: 'Cancelled', icon: XCircle,      color: 'text-zinc-500'    },
  expired:   { label: 'Expired',   icon: XCircle,      color: 'text-zinc-500'    },
}

function fmt(n: number, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (!transactions.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-zinc-500 text-sm">No transactions yet</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">Recent transactions</h2>
      </div>
      <ul className="divide-y divide-zinc-800">
        {transactions.map(tx => {
          const s = STATUS_MAP[tx.status] ?? STATUS_MAP['pending']
          const Icon = s.icon
          return (
            <li key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
              <Icon className={`w-4 h-4 shrink-0 ${s.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">
                  {tx.client_name ?? tx.client_phone ?? '—'}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {new Date(tx.created_at).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                  {fmt(Number(tx.amount), tx.currency)}
                </p>
                <p className={`text-[11px] ${s.color}`}>{s.label}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
