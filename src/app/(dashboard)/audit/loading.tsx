export default function AuditLoading() {
  return (
    <div className="space-y-4 pb-20 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-28" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
      </div>
      {/* Filters */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-28" />
        ))}
      </div>
      {/* Log rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  )
}
