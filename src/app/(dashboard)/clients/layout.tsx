import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/get-active-org'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import ClientsPage from './page'

export default async function ClientsLayout() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ClientsPage />

  const orgId = user.app_metadata?.org_id as string | undefined
  if (!orgId) return <ClientsPage />

  const activeOrgId = await getActiveOrgId(user.id, orgId)
  const service = createSupabaseServiceClient()

  // Resolve branch family
  const { data: parentRows } = await service
    .from('branches').select('parent_org_id').eq('child_org_id', activeOrgId)
  const rootOrgId = parentRows?.[0]?.parent_org_id ?? activeOrgId
  const { data: childRows } = await service
    .from('branches').select('child_org_id').eq('parent_org_id', rootOrgId).eq('is_active', true)
  const orgIds = Array.from(new Set([activeOrgId, rootOrgId, ...(childRows?.map((r: any) => r.child_org_id) ?? [])]))

  // Первая страница клиентов
  const { data: clients, count } = await service
    .from('clients')
    .select('id, first_name, last_name, phone, email, notes, created_at, org_id', { count: 'exact' })
    .in('org_id', orgIds)
    .order('created_at', { ascending: false })
    .range(0, 24)

  const queryClient = new QueryClient()

  if (clients?.length) {
    const clientIds = clients.map((c: any) => c.id)
    const [{ data: visits }, { data: payments }] = await Promise.all([
      service.from('visits').select('client_id, scheduled_at').in('client_id', clientIds),
      service.from('payments').select('client_id, amount').in('client_id', clientIds).eq('status', 'completed'),
    ])
    const visitMap: Record<string, { count: number; last: string | null }> = {}
    const payMap: Record<string, number> = {}
    for (const v of visits ?? []) {
      if (!visitMap[v.client_id]) visitMap[v.client_id] = { count: 0, last: null }
      visitMap[v.client_id].count++
      if (!visitMap[v.client_id].last || v.scheduled_at > visitMap[v.client_id].last!)
        visitMap[v.client_id].last = v.scheduled_at
    }
    for (const p of payments ?? []) payMap[p.client_id] = (payMap[p.client_id] ?? 0) + (p.amount ?? 0)

    const data = clients.map((c: any) => ({
      ...c,
      total_visits: visitMap[c.id]?.count ?? 0,
      last_visit:   visitMap[c.id]?.last  ?? null,
      total_paid:   payMap[c.id]          ?? 0,
    }))

    // queryKey совпадает с useClients(undefined, 1, 25)
    queryClient.setQueryData(['clients', activeOrgId, undefined, 1, 25], { data, count: count ?? 0 })
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientsPage />
    </HydrationBoundary>
  )
}
