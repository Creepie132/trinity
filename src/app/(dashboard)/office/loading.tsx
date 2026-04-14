export default function OfficeLoading() {
  return (
    <div className="space-y-5 pb-20 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-28" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
  )
}
