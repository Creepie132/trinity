/**
 * POST /api/mobile/payments/create-link
 * Создаёт Tranzila платёжную ссылку для клиента организации.
 *
 * Auth: Bearer токен (mobile) или cookie (web)
 * Body: { client_id, amount, description?, visit_id?, sale_id? }
 * Returns: { payment_id, payment_link, amount }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { createTranzilaPaymentLink } from '@/lib/tranzila'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { client_id, amount, description, visit_id, sale_id } =
      body as {
        client_id?: string
        amount?: number
        description?: string
        visit_id?: string
        sale_id?: string
      }

    if (!client_id || typeof client_id !== 'string') {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // SECURITY: клиент должен принадлежать org
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, org_id')
      .eq('id', client_id)
      .eq('org_id', orgId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 })
    }

    // Загружаем Tranzila-реквизиты орга + проверка модуля processing
    const { data: org } = await supabase
      .from('organizations')
      .select('tranzila_terminal, tranzila_password, features')
      .eq('id', orgId)
      .single()

    // МОДУЛЬ processing (Tranzila) — если выключен, ссылка недоступна
    const processingEnabled = org?.features?.modules?.processing === true
    if (!processingEnabled) {
      return NextResponse.json(
        { error: 'Модуль кредитных карт (Tranzila) не подключён для вашей организации.' },
        { status: 403 }
      )
    }

    if (!org?.tranzila_terminal) {
      return NextResponse.json(
        { error: 'Платёжный терминал не настроен. Обратитесь к администратору.' },
        { status: 400 }
      )
    }

    // Создаём запись платежа в БД (status = pending)
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([{
        org_id:         orgId,
        client_id,
        visit_id:       visit_id  || null,
        sale_id:        sale_id   || null,
        amount,
        currency:       'ILS',
        status:         'pending',
        provider:       'tranzila',
        payment_method: 'credit_card',
      }])
      .select()
      .single()

    if (dbError) {
      console.error('[mobile/payments/create-link] DB insert:', dbError)
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
    }

    const origin = 'https://www.ambersol.co.il'

    const tranzilaResult = await createTranzilaPaymentLink({
      amount,
      description: description || 'תשלום',
      paymentId:   payment.id,
      successUrl:  `${origin}/api/payments/tranzila-success`,
      failUrl:     `${origin}/api/payments/tranzila-failed`,
      terminal:    org.tranzila_terminal,
      password:    org.tranzila_password || undefined,
    })

    // Сохраняем ссылку в payment
    await supabase
      .from('payments')
      .update({ payment_link: tranzilaResult.url })
      .eq('id', payment.id)
      .eq('org_id', orgId)

    return NextResponse.json({
      success:      true,
      payment_id:   payment.id,
      payment_link: tranzilaResult.url,
      amount,
      currency:     'ILS',
    })
  } catch (e) {
    console.error('[mobile/payments/create-link] unexpected:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
