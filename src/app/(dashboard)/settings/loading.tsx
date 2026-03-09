export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
      
      {/* Settings sections */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
          <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  )
}
