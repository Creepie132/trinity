export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-xl p-3"
        >
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse" />
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-20 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
