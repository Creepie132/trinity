export default function SalesLoading() {
  return (
    <div className="space-y-4 pb-20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
      </div>
      {/* Pipeline columns */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
