export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header with title and action button */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
      </div>
      
      {/* Search bar */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full animate-pulse" />
      
      {/* Client cards */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
