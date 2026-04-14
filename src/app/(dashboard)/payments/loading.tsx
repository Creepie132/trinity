export default function PaymentsLoading() {
  return (
    <div className="space-y-4 pb-24 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-24" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-32" />
        </div>
      </div>
      {/* Mobile hero card */}
      <div className="md:hidden h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      {/* Desktop split layout */}
      <div className="hidden md:flex rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
        style={{ height: 'calc(100dvh - 220px)', minHeight: 480 }}>
        {/* Left dark panel */}
        <div className="w-64 bg-gray-800 dark:bg-gray-900 p-5 flex flex-col gap-5">
          <div className="h-10 bg-gray-700 rounded-lg w-3/4" />
          <div className="h-6 bg-gray-700 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="h-16 bg-gray-700 rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-700 rounded w-full" />
          ))}
        </div>
        {/* Right list panel */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-0">
          <div className="h-12 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center gap-2">
            <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl flex-1" />
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700">
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-36" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
