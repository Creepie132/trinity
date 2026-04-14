export default function BroadcastLoading() {
  return (
    <div className="space-y-5 pb-20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-36" />
      </div>
      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {/* History */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  )
}
