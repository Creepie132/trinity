const STATUS_COLORS: Record<string, string> = {
  success: 'bg-emerald-500 text-white',
  completed: 'bg-emerald-500 text-white',
  done: 'bg-emerald-500 text-white',
  active: 'bg-emerald-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  pending: 'bg-amber-500 text-white',
  trial: 'bg-amber-500 text-white',
  scheduled: 'bg-blue-600 text-white',
  open: 'bg-blue-600 text-white',
  manual: 'bg-blue-600 text-white',
  failed: 'bg-red-500 text-white',
  expired: 'bg-red-500 text-white',
  cancelled: 'bg-slate-300 text-slate-600',
  none: 'bg-slate-200 text-slate-500',
}

interface StatusBadgeProps {
  status: string
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.none

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colorClass}`}>
      {label || status}
    </span>
  )
}
