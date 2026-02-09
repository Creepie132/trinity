import { Card } from '@/components/ui/card'

export default function PartnersLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-9 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="bg-gray-200 h-[250px] animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
