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

interface RevenueData {
  day: string
  amount: number
}

export function RevenueChart({ orgId }: { orgId: string }) {
  const [data, setData] = useState<RevenueData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/dashboard/revenue?org_id=${orgId}&days=7`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch revenue data:', error)
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
          Выручка за последние 7 дней
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: any) => [`₪${value}`, 'Выручка']}
            />
            <Bar dataKey="amount" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
