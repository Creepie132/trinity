export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="bg-[#111827] border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-24 mb-2 animate-pulse" />
              <div className="h-8 bg-gray-700 rounded w-32 animate-pulse" />
            </div>
            <div className="w-12 h-12 bg-gray-700 rounded-xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
