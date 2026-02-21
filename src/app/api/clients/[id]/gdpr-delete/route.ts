import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireOrgRole, authErrorResponse } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1️⃣ Получить org_id клиента для проверки прав
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, organizations(name)')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const orgId = client.org_id

    // 2️⃣ Проверка авторизации: ТОЛЬКО OWNER!
    let userId: string
    let userEmail: string
    try {
      const auth = await requireOrgRole(orgId, ['owner'])
      userId = auth.userId
      userEmail = auth.email
    } catch (e) {
      return authErrorResponse(e)
    }

    // 3️⃣ Собрать ВСЕ данные для audit log (до удаления)
    const { data: visits } = await supabase
      .from('visits')
      .select('*')
      .eq('client_id', clientId)

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', clientId)

    const { data: smsMessages } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('client_id', clientId)

    // Visit services связанные с визитами клиента
    const visitIds = visits?.map((v) => v.id) || []
    let visitServices: any[] = []
    if (visitIds.length > 0) {
      const { data } = await supabase
        .from('visit_services')
        .select('*')
        .in('visit_id', visitIds)
      visitServices = data || []
    }

    // 4️⃣ Каскадное удаление (в правильном порядке!)
    let deletedCounts = {
      visit_services: 0,
      visits: 0,
      payments: 0,
      sms_messages: 0,
      client: 0,
    }

    // Удалить visit_services
    if (visitIds.length > 0) {
      const { error: vsError } = await supabase
        .from('visit_services')
        .delete()
        .in('visit_id', visitIds)

      if (vsError) {
        console.error('Error deleting visit_services:', vsError)
      } else {
        deletedCounts.visit_services = visitServices.length
      }
    }

    // Удалить visits
    const { error: visitsError } = await supabase
      .from('visits')
      .delete()
      .eq('client_id', clientId)

    if (visitsError) {
      console.error('Error deleting visits:', visitsError)
    } else {
      deletedCounts.visits = visits?.length || 0
    }

    // Удалить payments
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('client_id', clientId)

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError)
    } else {
      deletedCounts.payments = payments?.length || 0
    }

    // Удалить SMS messages
    const { error: smsError } = await supabase
      .from('sms_messages')
      .delete()
      .eq('client_id', clientId)

    if (smsError) {
      console.error('Error deleting sms_messages:', smsError)
    } else {
      deletedCounts.sms_messages = smsMessages?.length || 0
    }

    // Удалить самого клиента
    const { error: clientDeleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (clientDeleteError) {
      console.error('Error deleting client:', clientDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete client', details: clientDeleteError.message },
        { status: 500 }
      )
    }

    deletedCounts.client = 1

    // 5️⃣ Audit log
    await logAudit({
      org_id: orgId,
      user_id: userId,
      user_email: userEmail,
      action: 'delete',
      entity_type: 'client_gdpr',
      entity_id: clientId,
      old_data: {
        client,
        deleted_counts: deletedCounts,
        visits: visits?.length || 0,
        payments: payments?.length || 0,
        sms_messages: smsMessages?.length || 0,
        visit_services: visitServices.length,
      },
      ip_address: getClientIp(request),
    })

    return NextResponse.json({
      success: true,
      deleted: {
        client: deletedCounts.client,
        visits: deletedCounts.visits,
        payments: deletedCounts.payments,
        sms_messages: deletedCounts.sms_messages,
        visit_services: deletedCounts.visit_services,
      },
    })
  } catch (error: any) {
    console.error('GDPR delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client data', details: error.message },
      { status: 500 }
    )
  }
}
