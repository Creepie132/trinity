import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function TodayBlock({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  // Get today's date range (00:00 to 23:59)
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  // Format date in Hebrew
  const dateFormatter = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const hebrewDate = dateFormatter.format(today)

  // Fetch today's visits with client details
  const { data: visits } = await supabase
    .from('visits')
    .select(`
      id,
      scheduled_at,
      status,
      notes,
      clients(
        id,
        name
      )
    `)
    .eq('org_id', orgId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">✅ הושלם</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">📅 מתוכנן</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 text-xs">❌ בוטל</Badge>
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">⏳ ממתין</Badge>
    }
  }

  return (
    <Card className="bg-white dark:bg-[#111827] border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          היום, {hebrewDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {visits && visits.length > 0 ? (
          <div className="space-y-2">
            {visits.map((visit) => {
              const scheduledDate = new Date(visit.scheduled_at)
              const hours = scheduledDate.getHours().toString().padStart(2, '0')
              const minutes = scheduledDate.getMinutes().toString().padStart(2, '0')
              const time = `${hours}:${minutes}`

              const client: any = visit.clients
              
              return (
                <div
                  key={visit.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300 w-12 flex-shrink-0">
                      {time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {client?.name || 'Unknown'}
                      </p>
                      {visit.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {visit.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(visit.status || 'scheduled')}
                  </div>
                </div>
              )
            })}
            {visits.length === 5 && (
              <Link
                href="/visits"
                className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline pt-2"
              >
                הצג הכל →
              </Link>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              אין תורים להיום 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
