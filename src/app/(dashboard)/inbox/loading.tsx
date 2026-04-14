export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100dvh-80px)] gap-0 animate-pulse">
      {/* Sidebar: conversation list */}
      <div className="w-full md:w-80 border-e border-gray-100 dark:border-gray-700 flex flex-col">
        <div className="h-14 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1" />
        </div>
        <div className="flex-1 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat area — desktop only */}
      <div className="hidden md:flex flex-1 flex-col">
        <div className="h-16 border-b border-gray-100 dark:border-gray-700 px-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`h-10 bg-gray-200 dark:bg-gray-700 rounded-2xl ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
            </div>
          ))}
        </div>
        <div className="h-16 border-t border-gray-100 dark:border-gray-700 px-4 flex items-center gap-2">
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex-1" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
