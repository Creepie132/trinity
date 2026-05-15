interface Stat {
  label: string
  value: string
  sub?: string
}

interface Props {
  todayTotal: number
  monthTotal: number
  todayCount: number
  monthCount: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

export function DashboardStats({ todayTotal, monthTotal, todayCount, monthCount }: Props) {
  const stats: Stat[] = [
    { label: 'Today',         value: fmt(todayTotal),  sub: `${todayCount} payments` },
    { label: 'This month',    value: fmt(monthTotal),  sub: `${monthCount} payments` },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-2">{s.label}</p>
          <p className="text-3xl font-bold text-zinc-100 tabular-nums">{s.value}</p>
          {s.sub && <p className="text-xs text-zinc-500 mt-1">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}
