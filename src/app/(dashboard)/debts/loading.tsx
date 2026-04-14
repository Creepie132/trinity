export default function DebtsLoading() {
  return (
    <div className="space-y-4 pb-20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-28" />
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-10 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-32" />
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-20" />
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}
