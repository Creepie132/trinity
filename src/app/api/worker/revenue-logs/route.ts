import { NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/revenue-logs — all revenue logs for this worker

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    const { data, error } = await supabase
      .from('revenue_logs')
      .select(`
        id, setup_fee, commission_amount, entered_at,
        deal:deals(id, title),
        client:clients(id, first_name, last_name)
      `)
      .eq('worker_id', user.id)
      .order('entered_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ logs: data ?? [] })
  } catch (err) {
    console.error('[GET /api/worker/revenue-logs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
