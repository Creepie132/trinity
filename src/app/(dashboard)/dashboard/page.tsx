import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  // Get orgId from server session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: orgUser } = await supabase
    .from('org_users')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single()

  const orgId = orgUser?.org_id

  if (!orgId) {
    redirect('/unauthorized')
  }

  return <DashboardContent orgId={orgId} />
}
