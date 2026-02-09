export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 bg-gray-200 rounded animate-pulse w-1/4"></div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-80 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
    </div>
  )
}
