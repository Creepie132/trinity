import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {/* Иконка в мягкой тени */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/60 flex items-center justify-center shadow-lg shadow-indigo-100/40 text-indigo-400">
          {icon}
        </div>
        {/* Декоративные точки */}
        <div className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-indigo-200/60" />
        <div className="absolute -bottom-0.5 -start-1.5 w-2 h-2 rounded-full bg-blue-200/60" />
      </div>

      <h3 className="text-base font-bold text-gray-800 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-[260px] leading-relaxed">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-200/60 active:scale-[0.97] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
          </svg>
          {action.label}
        </button>
      )}
    </div>
  )
}
