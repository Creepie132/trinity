export function StatCardSkeleton() {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="p-3 rounded-xl bg-gray-700 w-12 h-12"></div>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-lg p-6 animate-pulse">
      <div className="h-5 bg-gray-700 rounded w-48 mb-4"></div>
      <div className="h-[300px] bg-gray-700/50 rounded-lg flex items-center justify-center">
        <svg
          className="w-16 h-16 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-lg p-6 animate-pulse">
      <div className="h-5 bg-gray-700 rounded w-48 mb-4"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 bg-gray-700 rounded flex-1"></div>
            <div className="h-10 bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  )
}

export function ChartsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  )
}
