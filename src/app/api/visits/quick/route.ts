import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { israelLocalToUTC } from '@/lib/tz'

/**
 * POST /api/visits/quick
 * Быстрый режим мастера — создаёт постфактум-визит.
 * status: 'open' (сохранить) | 'completed' (завершить → оплата)
 * Безопасность: org_id только из getAuthContext() (БД).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, service, date, time, quick_items = [], status_override = 'open' } = body

    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user, orgId: org_id } = auth

    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    if (!Array.isArray(quick_items) || quick_items.length === 0)
      return NextResponse.json({ error: 'quick_items cannot be empty' }, { status: 400 })

    const allowedStatuses = ['open', 'completed']
    const finalStatus = allowedStatuses.includes(status_override) ? status_override : 'open'
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    const firstService = quick_items.find((i: any) => i.type === 'service')
    const validServiceId = firstService?.id && uuidRegex.test(firstService.id) ? firstService.id : null

    const now = new Date()
    const nowDate = now.toISOString().split('T')[0]
    const nowTime = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    const scheduled_at = israelLocalToUTC(date || nowDate, time || nowTime)

    const totalPrice = quick_items.reduce(
      (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0
    )

    const svc = createSupabaseServiceClient()

    // Создаём визит
    const { data: visit, error: visitError } = await svc
      .from('visits')
      .insert({
        org_id,
        client_id: clientId,
        scheduled_at,
        service_id: validServiceId,
        service_type: firstService?.name || service || 'other',
        price: totalPrice,
        duration_minutes: 60,
        status: finalStatus,
        is_postfactum: true,
        staff_user_id: user.id,
        event_type: 'visit',
      })
      .select('*, clients(first_name, last_name, phone, email)')
      .single()

    if (visitError) {
      console.error('[/api/visits/quick] Insert error:', visitError)
      return NextResponse.json({ error: visitError.message }, { status: 500 })
    }

    // Дополнительные услуги → visit_services
    const extraServices = quick_items.filter(
      (i: any) => i.type === 'service' && i.id !== firstService?.id
    )
    if (extraServices.length > 0) {
      await svc.from('visit_services').insert(
        extraServices.map((i: any) => ({
          visit_id: visit.id, org_id,
          service_id: uuidRegex.test(i.id) ? i.id : null,
          service_name: i.name,
          price: Number(i.price) * Number(i.quantity || 1),
          quantity: Number(i.quantity) || 1,
        }))
      )
    }

    // Товары → sale + sale_items
    const productItems = quick_items.filter((i: any) => i.type === 'product')
    if (productItems.length > 0) {
      const productTotal = productItems.reduce(
        (s: number, i: any) => s + Number(i.price) * Number(i.quantity || 1), 0
      )
      const { data: sale } = await svc.from('sales').insert({
        org_id, client_id: clientId, visit_id: visit.id,
        total_amount: productTotal,
        status: finalStatus === 'completed' ? 'paid' : 'unpaid',
        notes: 'Quick Mode',
      }).select('id').single()

      if (sale) {
        await svc.from('sale_items').insert(
          productItems.map((i: any) => ({
            sale_id: sale.id, org_id,
            product_id: uuidRegex.test(i.id) ? i.id : null,
            product_name: i.name,
            quantity: Number(i.quantity) || 1,
            unit_price: Number(i.price),
            total_price: Number(i.price) * Number(i.quantity || 1),
          }))
        )
      }
    }

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: any) {
    console.error('[/api/visits/quick] Exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
