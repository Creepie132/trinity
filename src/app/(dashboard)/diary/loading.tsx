export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
      </div>
      
      {/* Filters/tabs */}
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
      </div>
      
      {/* Task cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
