export default function InventoryLoading() {
  return (
    <div className="space-y-4 pb-20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-28" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
      </div>
      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-28" />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        ))}
      </div>
      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
