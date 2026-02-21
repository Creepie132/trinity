export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
