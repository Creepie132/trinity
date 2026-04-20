import { NextRequest, NextResponse } from 'next/server'
import { createTranzilaPaymentLink } from '@/lib/tranzila'
import { checkAuthAndFeature } from '@/lib/api-auth'
import { ratelimitStrict } from '@/lib/ratelimit'
import { validateBody, createPaymentSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { queuePushNotification } from '@/lib/push-notify'
import { getClientIp } from '@/lib/ratelimit'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import { fireWaTrigger } from '@/lib/wa/fire-trigger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ✅ Проверка авторизации и доступа к фиче "payments"
    const authResult = await checkAuthAndFeature('payments')
    if (!authResult.success) {
      return (authResult as { success: false; response: NextResponse }).response
    }

    // ✅ Rate limiting (Upstash Redis)
    const { success: rateLimitOk } = await ratelimitStrict.limit(
      `payment:${authResult.data.email}`
    )
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const { org_id } = authResult.data
    const supabase = createSupabaseServiceClient()

    const body = await request.json()

    // ✅ Zod validation
    const { data, error: validationError } = validateBody(createPaymentSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { client_id, amount, description, visit_id, sale_id } = data

    // SECURITY: Verify client belongs to user's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, org_id')
      .eq('id', client_id)
      .eq('org_id', org_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 403 }
      )
    }

    // Создаём payment — включаем sale_id для последующего обновления статуса сделки
    // триггером trg_recalculate_sale_status (AFTER UPDATE OF status ON payments)
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert([{
        org_id,
        client_id,
        visit_id:        visit_id || null,
        sale_id:         sale_id  || null,
        amount,
        currency:        'ILS',
        status:          'pending',
        provider:        'tranzila',
        payment_method:  'credit_card',
      }])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    // Загружаем credentials организации
    const { data: org } = await supabase
      .from('organizations')
      .select('tranzila_terminal, tranzila_password')
      .eq('id', org_id)
      .single()

    // SECURITY: Never use platform owner credentials as fallback
    if (!org?.tranzila_terminal) {
      return NextResponse.json(
        { error: 'Платёжный терминал не настроен для вашей организации. Обратитесь к администратору.' },
        { status: 400 }
      )
    }

    const origin = request.nextUrl.origin

    const tranzilaResult = await createTranzilaPaymentLink({
      amount,
      description: description || 'תשלום',
      paymentId:   payment.id,
      successUrl:  `${origin}/api/payments/tranzila-success`,
      failUrl:     `${origin}/api/payments/tranzila-failed`,
      terminal:    org.tranzila_terminal,
      password:    org.tranzila_password || undefined,
    })

    const paymentLink = tranzilaResult.url

    // Update payment record with link
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_link:   paymentLink,
        transaction_id: null,
      })
      .eq('id', payment.id)
      .eq('org_id', org_id)

    if (updateError) {
      console.error('Failed to update payment link:', updateError)
    }

    // ── WA триггер payment_link_created (fire-and-forget) ────────────────────
    // Отправляем клиенту WhatsApp с ссылкой на оплату, если триггер включён
    void (async () => {
      try {
        const { data: clientRow } = await supabase
          .from('clients')
          .select('first_name, phone')
          .eq('id', data.client_id)
          .eq('org_id', org_id)
          .single()

        if (!clientRow?.phone) return

        const { data: orgRow } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', org_id)
          .single()

        await fireWaTrigger({
          orgId:       org_id,
          triggerType: 'payment_link_created',
          clientPhone: clientRow.phone,
          clientId:    data.client_id,
          vars: {
            client_name:  clientRow.first_name ?? '',
            org_name:     orgRow?.name ?? '',
            amount:       amount.toFixed(2),
            payment_link: `${request.nextUrl.origin}/pay/${payment.id}`,
          },
          entityId: payment.id,
        })
      } catch (err) {
        console.error('[/api/payments/create-link] fireWaTrigger error (non-critical):', err)
      }
    })()
    // ─────────────────────────────────────────────────────────────────────────

    // ✅ Audit log
    await logAudit({
      org_id,
      user_id:    authResult.data.user.id,
      user_email: authResult.data.email,
      action:     'create',
      entity_type: 'payment',
      entity_id:  payment.id,
      new_data:   { amount, currency: 'ILS', client_id: data.client_id, sale_id: sale_id ?? null },
      ip_address: getClientIp(request),
    })

    // Push notification
    await queuePushNotification({
      org_id,
      user_id:      authResult.data.user.id,
      type:         'new_payment',
      title:        '💰 תשלום חדש',
      body:         `₪${amount}`,
      link:         '/payments',
      reference_id: payment.id,
    })

    return NextResponse.json({
      success:      true,
      payment_id:   payment.id,
      payment_link: paymentLink,
      amount,
      currency:     'ILS',
    })
  } catch (error: any) {
    console.error('Create payment link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
