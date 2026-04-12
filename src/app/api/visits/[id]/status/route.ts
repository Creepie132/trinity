import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { fireWaTrigger } from '@/lib/wa/fire-trigger'

/**
 * PATCH /api/visits/[id]/status
 * Update visit status. Supports both cookie auth (web) and Bearer token (mobile).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const { orgId } = auth
    const { id } = await params

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    }

    const supabase = createSupabaseServiceClient()
    const { data: visit, error } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select(`*, clients(first_name, phone), services(name, name_ru), organizations(name)`)
      .single()

    if (error) {
      console.error('[API] PATCH /api/visits/[id]/status error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // WA триггер visit_completed (fire-and-forget)
    if (status === 'completed') {
      const client = visit.clients as any
      const svc    = visit.services as any
      const org    = visit.organizations as any
      if (client?.phone) {
        void fireWaTrigger({
          orgId,
          triggerType: 'visit_completed',
          clientPhone: client.phone,
          vars: {
            client_name: client.first_name ?? '',
            org_name:    org?.name ?? '',
            service:     svc?.name_ru ?? svc?.name ?? '',
          },
          entityId: id,
        })
      }
    }

    return NextResponse.json({ visit })
  } catch (error) {
    console.error('[API] PATCH /api/visits/[id]/status exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
