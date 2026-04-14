export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 animate-pulse">
      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-32" />
        </div>
      </div>
      {/* Form sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
