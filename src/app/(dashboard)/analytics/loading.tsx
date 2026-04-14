export default function AnalyticsLoading() {
  return (
    <div className="space-y-5 pb-20 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
      <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
    </div>
  )
}
