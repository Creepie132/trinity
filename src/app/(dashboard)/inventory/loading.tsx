export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-10 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
        </div>
      </div>
      
      {/* Search */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse" />
      
      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
