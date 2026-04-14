// ⚡ INSTANT LOAD: App Router показывает этот скелетон немедленно при переходе на /visits
// Sidebar + header уже отрисованы layout.tsx — этот файл заполняет только контентную зону
export default function VisitsLoading() {
  return (
    <div className="space-y-5 pb-20 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-1" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-36" />
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {/* Filters */}
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
        ))}
      </div>
      {/* Visit rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  )
}
