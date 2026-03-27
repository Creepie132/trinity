import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { validateBody, createPaymentSchema } from '@/lib/validations'

// GET /api/payments — список платежей для текущей организации
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    
    const { orgId } = auth
    const serviceSupabase = createSupabaseServiceClient()

    const { data: payments, error } = await serviceSupabase
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
      .limit(1000)

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

    const { client_id, amount, payment_method, visit_id, description, status } = data
    const service = createSupabaseServiceClient()

    // 3. Ownership check — client_id должен принадлежать orgId
    const { data: client, error: clientErr } = await service
      .from('clients')
      .select('id, org_id')
      .eq('id', client_id)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Клиент может принадлежать главной org или дочернему филиалу
    // Используем существующую логику getRelatedOrgIds через прямую проверку
    const { data: orgCheck } = await service
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .or(`org_id.eq.${orgId},org_id.in.(select child_org_id from branches where parent_org_id='${orgId}')`)
      .single()

    if (!orgCheck) {
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

    // 6. Создаём платёж
    const { data: payment, error: insertErr } = await service
      .from('payments')
      .insert({
        org_id:         orgId,
        client_id,
        amount:         roundedAmount,
        payment_method,
        status:         status ?? 'completed',
        visit_id:       visit_id ?? null,
        description:    description?.trim() || null,
        paid_at:        status === 'completed' ? new Date().toISOString() : null,
        provider:       'cash',
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
