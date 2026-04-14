export default function FinancesLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-48" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      {/* Expense list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-12 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-40" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
