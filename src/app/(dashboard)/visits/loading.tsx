export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
      <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}
