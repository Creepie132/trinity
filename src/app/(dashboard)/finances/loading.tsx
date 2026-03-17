export default function FinancesLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
      </div>
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
    </div>
  )
}
