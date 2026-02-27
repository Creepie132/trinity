import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import TodayBlockClient from './TodayBlockClient'

export default async function TodayBlock({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  // Get today's date range (00:00 to 23:59)
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

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
        first_name,
        last_name
      ),
      services(id, name, name_ru)
    `)
    .eq('org_id', orgId)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at', { ascending: true})
    .limit(5)

  // Format visits for client component
  const formattedVisits = visits?.map((visit) => {
    const scheduledDate = new Date(visit.scheduled_at)
    const hours = scheduledDate.getHours().toString().padStart(2, '0')
    const minutes = scheduledDate.getMinutes().toString().padStart(2, '0')
    const client: any = visit.clients

    return {
      id: visit.id,
      time: `${hours}:${minutes}`,
      clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown',
      notes: visit.notes,
      status: visit.status || 'scheduled',
    }
  }) || []

  return <TodayBlockClient visits={formattedVisits} />
}
