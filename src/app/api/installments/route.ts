import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { computeNextDate, chargeInstallment } from '@/lib/installments'

export const dynamic = 'force-dynamic'

/**
 * GET /api/installments
 * Список планов рассрочки org. Фильтры: client_id, visit_id, sale_id, status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const visitId  = searchParams.get('visit_id')
    const saleId   = searchParams.get('sale_id')
    const status   = searchParams.get('status')

    const supabase = createSupabaseServiceClient()

    let query = supabase
      .from('payment_installments')
      .select('*, installment_charges(id, amount, installment_number, status, tranzila_doc_id, error_message, charged_at)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (visitId)  query = query.eq('visit_id', visitId)
    if (saleId)   query = query.eq('sale_id', saleId)
    if (status)   query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[installments GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/installments
 * Создаёт план рассрочки + немедленно списывает первый платёж по токену карты.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await request.json()
    const {
      client_id, visit_id, sale_id,
      total_amount, installments_count, frequency,
      tranzila_token, tranzila_expdate, card_last4,
      notes,
    } = body

    if (!client_id || !total_amount || !installments_count || !tranzila_token || !tranzila_expdate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (installments_count < 2 || installments_count > 36) {
      return NextResponse.json({ error: 'installments_count must be 2–36' }, { status: 400 })
    }
    if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: client } = await supabase
      .from('clients').select('id').eq('id', client_id).eq('org_id', orgId).single()
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const { data: org } = await supabase
      .from('organizations')
      .select('tranzila_token_terminal, tranzila_token_password')
      .eq('id', orgId).single()

    if (!org?.tranzila_token_terminal || !org?.tranzila_token_password) {
      return NextResponse.json({ error: 'Tranzila token terminal not configured' }, { status: 400 })
    }

    const installmentAmount = Math.round((total_amount / installments_count) * 100) / 100
    const nextDate = computeNextDate(new Date(), frequency)

    const { data: plan, error: planErr } = await supabase
      .from('payment_installments')
      .insert({
        org_id: orgId, client_id,
        visit_id: visit_id || null, sale_id: sale_id || null,
        total_amount, installment_amount: installmentAmount,
        installments_count, installments_paid: 0,
        frequency, next_due_date: nextDate,
        status: 'active',
        tranzila_token, tranzila_expdate, card_last4: card_last4 || null,
        notes: notes || null,
      })
      .select().single()

    if (planErr || !plan) {
      console.error('[installments POST] plan insert error:', planErr)
      return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 })
    }

    const chargeResult = await chargeInstallment({
      plan,
      terminal: org.tranzila_token_terminal,
      password: org.tranzila_token_password,
      installmentNumber: 1,
      supabase,
      orgId,
    })

    if (!chargeResult.success) {
      await supabase
        .from('payment_installments')
        .update({ status: 'failed' })
        .eq('id', plan.id)

      return NextResponse.json(
        { error: chargeResult.error || 'First payment failed', plan_id: plan.id },
        { status: 422 }
      )
    }

    const newPaidCount = 1
    const newStatus = newPaidCount >= installments_count ? 'completed' : 'active'

    await supabase
      .from('payment_installments')
      .update({ installments_paid: newPaidCount, status: newStatus })
      .eq('id', plan.id)

    return NextResponse.json({
      success: true,
      plan_id: plan.id,
      first_charge: chargeResult.tranzila_doc_id,
      installment_amount: installmentAmount,
      next_due_date: nextDate,
    }, { status: 201 })

  } catch (err: any) {
    console.error('[installments POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
