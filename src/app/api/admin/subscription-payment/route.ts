import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ambersol.co.il'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/admin/subscription-payment
 * Управляет оплатой подписки через Tranzila.
 *
 * Логика:
 * - Нет токена → генерирует URL на iframe ambersolt с tranmode=AK
 *   (платёж + сохранение токена карты), отправляет email клиенту.
 *   Tranzila вернёт TranzilaTK в success_url_address → /api/payments/tranzila-success?org_id=...
 *
 * - Есть токен → server-to-server CGI списание через ambersolttok (tranmode=A).
 *   Клиент не нужен. Обновляет billing прямо здесь.
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  try {
    const { org_id, amount, billing_due_date } = await request.json()

    if (!org_id || !amount) {
      return NextResponse.json({ error: 'org_id and amount are required' }, { status: 400 })
    }

    // Загружаем организацию
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        features,
        tranzila_card_token,
        tranzila_token_terminal,
        tranzila_token_password,
        org_users!inner (email, role)
      `)
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const ownerEmail =
      (org.org_users as any[])?.find((u: any) => u.role === 'owner')?.email ||
      (org.features as any)?.business_info?.email

    if (!ownerEmail) {
      return NextResponse.json({ error: 'No owner email found for organization' }, { status: 400 })
    }

    // Сохраняем сумму и дату следующего платежа
    await supabase
      .from('organizations')
      .update({
        billing_amount: amount,
        billing_due_date: billing_due_date || null,
        billing_status: 'pending',
      })
      .eq('id', org_id)

    const hasToken = !!(org as any).tranzila_card_token

    // success_url включает org_id — обработчик сохранит токен нужной организации
    const successUrl = `${BASE_URL}/api/payments/tranzila-success?org_id=${org_id}`
    const failUrl = `${BASE_URL}/api/payments/tranzila-failed`

    let paymentUrl: string

    if (hasToken) {
      // Токен уже есть — рекуррентное server-to-server списание через CGI
      // НЕ через iframe (клиент не нужен)
      const terminal =
        (org as any).tranzila_token_terminal ||
        process.env.TRANZILA_TOKEN_TERMINAL ||
        ''
      const password =
        (org as any).tranzila_token_password ||
        process.env.TRANZILA_TOKEN_PASSWORD ||
        ''

      const cgParams = new URLSearchParams({
        supplier: terminal,
        TranzilaPW: password,
        TranzilaTK: (org as any).tranzila_card_token,
        sum: String(amount),
        currency: '1',
        tranmode: 'A', // реальное списание, не верификация
        pdesc: `Trinity CRM подписка — ${org.name}`,
        response_return_format: 'json',
      })

      const cgRes = await fetch('https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cgParams.toString(),
      })
      const cgText = await cgRes.text()
      let cgData: any = {}
      try { cgData = JSON.parse(cgText) } catch { cgData = Object.fromEntries(new URLSearchParams(cgText)) }

      if (cgData.Response !== '000') {
        console.error('[subscription-payment] Token charge failed:', cgData)
        return NextResponse.json(
          { error: `Tranzila error ${cgData.Response}: ${cgData.error || cgData.error_msg || 'Payment failed'}` },
          { status: 422 }
        )
      }

      // Обновляем billing
      const nextBilling = new Date()
      nextBilling.setDate(nextBilling.getDate() + 30)
      const nextBillingStr = nextBilling.toISOString().split('T')[0]
      await supabase.from('organizations').update({
        billing_status: 'paid',
        billing_due_date: nextBillingStr,
        subscription_status: 'active',
        last_billing_date: new Date().toISOString().split('T')[0],
      }).eq('id', org_id)

      return NextResponse.json({
        success: true,
        charged: true,
        amount,
        transaction_id: cgData.ConfirmationCode || cgData.index,
        next_billing_date: nextBillingStr,
      })

    } else {
      // Первый платёж — обычный терминал ambersolt + tranmode=AK (платёж + сохранить карту)
      // success_url_address — правильный параметр Tranzila (не success_url!)
      const terminal = process.env.TRANZILA_TERMINAL_ID || ''
      const password = process.env.TRANZILA_TERMINAL_PASSWORD || ''

      paymentUrl =
        `https://direct.tranzila.com/${terminal}/iframenew.php?` +
        new URLSearchParams({
          sum: String(amount),
          currency: '1',
          TranzilaPW: password,
          // AK = проводит платёж И сохраняет токен карты
          tranmode: 'AK',
          pdesc: `Trinity CRM подписка — ${org.name}`,
          // Правильные имена параметров success/fail URL в Tranzila
          success_url_address: successUrl,
          fail_url_address: failUrl,
          lang: 'il',
        }).toString()
    }

    // Отправляем email
    const { error: emailError } = await resend.emails.send({
      from: 'Trinity CRM <notifications@ambersol.co.il>',
      to: ownerEmail,
      subject: 'Оплата подписки Trinity CRM',
      headers: getEmailHeaders(),
      tags: getEmailTags('transactional'),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:32px;border-radius:16px 16px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">Trinity CRM</h1>
          </div>
          <div style="background:#f8fafc;padding:32px;border-radius:0 0 16px 16px;">
            <h2 style="color:#1e293b;margin:0 0 16px;">Подключение автоплатежа</h2>
            <p style="color:#64748b;font-size:16px;line-height:1.6;">Здравствуйте!</p>
            <p style="color:#64748b;font-size:16px;line-height:1.6;">
              Для подключения автоматической оплаты подписки <strong>${org.name}</strong>,
              пожалуйста, перейдите по ссылке и введите данные вашей карты.
            </p>
            <p style="color:#1e293b;font-size:18px;font-weight:600;margin:24px 0;">Сумма: ₪${amount}/месяц</p>
            <a href="${paymentUrl}"
               style="display:inline-block;background:#4F46E5;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
              Оплатить и подключить
            </a>
            <p style="color:#94a3b8;font-size:14px;margin-top:32px;">
              После оплаты ваша карта будет сохранена для автоматических списаний.
            </p>
          </div>
        </div>
      `,
    })

    if (emailError) {
      console.error('[subscription-payment] Email error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', details: emailError }, { status: 500 })
    }

    console.log('[subscription-payment] Link sent to:', ownerEmail, '| hasToken:', hasToken)

    return NextResponse.json({
      success: true,
      email_sent_to: ownerEmail,
      payment_url: paymentUrl,
    })
  } catch (error: any) {
    console.error('[subscription-payment] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
