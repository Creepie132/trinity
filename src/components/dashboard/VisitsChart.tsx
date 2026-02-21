'use client'

import { Card, CardContent } from '@/components/ui/card'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Dynamic imports for Recharts components
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false }
)
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
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

interface VisitData {
  dateLabel: string
  count: number
}

export function VisitsChart({ orgId }: { orgId: string }) {
  const [data, setData] = useState<VisitData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/dashboard/visits-chart?org_id=${orgId}&days=30`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch visits data:', error)
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

  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Визиты за последние 30 дней
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="dateLabel" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: any) => [value, 'Визитов']}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
