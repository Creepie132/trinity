import { NextResponse } from 'next/server'
import { getWorkerAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/worker/wa-templates
// Returns active message_templates + worker's assigned clients for sending

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

export async function GET() {
  try {
    const auth = await getWorkerAuthContext()
    if ('error' in auth) return auth.error
    const { user } = auth

    const supabase = createSupabaseServiceClient()

    const [tplRes, clientsRes] = await Promise.all([
      supabase
        .from('message_templates')
        .select('id, name, content, category, variables')
        .eq('org_id', ORG_ID)
        .eq('is_active', true)
        .order('category'),

      supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .eq('org_id', ORG_ID)
        .eq('assigned_to', user.id)
        .not('phone', 'is', null)
        .order('first_name')
        .limit(100),
    ])

    return NextResponse.json({
      templates: tplRes.data  ?? [],
      clients:   clientsRes.data ?? [],
    })
  } catch (err) {
    console.error('[GET /api/worker/wa-templates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
