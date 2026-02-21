'use client'

import { Card, CardContent } from '@/components/ui/card'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Dynamic imports for Recharts components
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false }
)
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false }
)
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
  { ssr: false }
)
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false }
)
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false }
)
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false }
)
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false }
)
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
)

interface ServiceData {
  name: string
  count: number
  fill: string
}

export function TopServicesChart({ orgId }: { orgId: string }) {
  const [data, setData] = useState<ServiceData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/dashboard/top-services?org_id=${orgId}`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch top services data:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [orgId])

  if (isLoading) {
    return (
      <Card className="bg-[#111827] border-gray-800">
        <CardContent className="p-6">
          <div className="h-5 bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-[300px] bg-gray-700/50 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return null
  }

  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Топ-5 услуг за месяц
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: any) => [value, 'Визитов']}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
