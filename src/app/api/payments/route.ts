import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { validateBody, createPaymentSchema } from '@/lib/validations'

// GET /api/payments — список платежей для текущей организации
// Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), status, limit
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')
    const status    = searchParams.get('status')
    const limit     = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 5000)

    const serviceSupabase = createSupabaseServiceClient()

    let query = serviceSupabase
      .from('payments')
      .select(`
        *,
        clients (
          id, first_name, last_name, phone, email, org_id
        ),
        sales:sale_id (
          id, total_amount, status, sale_date
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Фильтр по статусу
    if (status) query = query.eq('status', status)

    // Фильтр по датам — используем paid_at, fallback на created_at
    // startDate → paid_at >= startDate 00:00:00 UTC
    if (startDate) {
      query = query.gte('paid_at', `${startDate}T00:00:00.000Z`)
    }
    // endDate → paid_at <= endDate 23:59:59 UTC
    if (endDate) {
      query = query.lte('paid_at', `${endDate}T23:59:59.999Z`)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Payments query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(payments || [])
  } catch (e: any) {
    console.error('GET /api/payments error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/payments
 * Создание платежа. Полностью серверная валидация.
 *
 * Zero Trust:
 *   - orgId только из getAuthContext() — никаких client-side заголовков
 *   - ownership check: client_id и visit_id должны принадлежать этому orgId
 *   - Zod-валидация: amount > 0, payment_method из enum, uuid форматы
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth — orgId только с сервера
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    // 2. Zod-валидация тела
    const body = await request.json()
    const { data, error: validationError } = validateBody(createPaymentSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { client_id, amount, payment_method, visit_id, description, status, payment_details, amount_received } = data
    const service = createSupabaseServiceClient()

    // 3. Ownership check — client_id должен принадлежать orgId (или его филиалу)
    const { data: client, error: clientErr } = await service
      .from('clients')
      .select('id, org_id')
      .eq('id', client_id)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Шаг 1: прямая проверка — клиент принадлежит текущей org?
    let clientBelongs = client.org_id === orgId

    // Шаг 2: если нет — проверяем через branches (activeOrgId может быть филиалом)
    if (!clientBelongs) {
      const { data: branch } = await service
        .from('branches')
        .select('child_org_id')
        .or(`parent_org_id.eq.${orgId},child_org_id.eq.${orgId}`)
        .eq('child_org_id', client.org_id)
        .maybeSingle()

      if (branch) {
        clientBelongs = true
      } else {
        // Шаг 3: может клиент принадлежит parent org активного филиала?
        const { data: parentBranch } = await service
          .from('branches')
          .select('parent_org_id')
          .eq('child_org_id', orgId)
          .maybeSingle()

        if (parentBranch && client.org_id === parentBranch.parent_org_id) {
          clientBelongs = true
        }
      }
    }

    if (!clientBelongs) {
      console.error(`[payments] client ${client_id} org=${client.org_id} does not match orgId=${orgId}`)
      return NextResponse.json({ error: 'Client does not belong to your organization' }, { status: 403 })
    }

    // 4. Ownership check — visit_id (если передан)
    if (visit_id) {
      const { data: visit } = await service
        .from('visits')
        .select('id')
        .eq('id', visit_id)
        .eq('org_id', orgId)
        .single()

      if (!visit) {
        return NextResponse.json({ error: 'Visit not found or does not belong to your organization' }, { status: 403 })
      }
    }

    // 5. Округляем сумму до 2 знаков (защита от float drift)
    const roundedAmount = Math.round(amount * 100) / 100

    // 6. Строим payment_details — для наличных добавляем amount_received и change
    let finalDetails = payment_details ?? null
    if (payment_method === 'cash' && amount_received != null) {
      const change = Math.round((amount_received - roundedAmount) * 100) / 100
      finalDetails = {
        ...((finalDetails as object) ?? {}),
        amount_received,
        change_amount: change >= 0 ? change : 0,
      }
    }

    // 7. Создаём платёж
    const { data: payment, error: insertErr } = await service
      .from('payments')
      .insert({
        org_id:               orgId,
        client_id,
        amount:               roundedAmount,
        payment_method,
        status:               status ?? 'completed',
        visit_id:             visit_id ?? null,
        description:          description?.trim() || null,
        paid_at:              status === 'completed' ? new Date().toISOString() : null,
        provider:             'cash',
        payment_details:      finalDetails,
        // received_by_user_id — только для наличных, берём из токена (не с клиента!)
        received_by_user_id:  payment_method === 'cash' ? auth.user.id : null,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[API] POST /api/payments insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/payments exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
