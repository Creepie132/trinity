export default function ReportsLoading() {
  return (
    <div className="space-y-5 pb-20 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-28" />
      {/* Period tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
        ))}
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  )
}
