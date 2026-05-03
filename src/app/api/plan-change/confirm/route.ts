import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createReceipt } from '@/lib/tranzila-invoices'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/plan-change/confirm?token=... (preview for the confirmation page)
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const { data: req, error } = await supabase
    .from('plan_change_requests')
    .select('*, organizations(name, tranzila_card_last4, tranzila_card_token)')
    .eq('confirm_token', token)
    .single()

  if (error || !req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (new Date(req.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })
  if (req.status !== 'pending_confirmation') return NextResponse.json({ status: req.status, error: 'already_processed' }, { status: 409 })

  return NextResponse.json({
    request_id:      req.id,
    org_name:        (req.organizations as any)?.name,
    from_plan:       req.from_plan,
    to_plan:         req.to_plan,
    from_price:      req.from_price,
    to_price:        req.to_price,
    proration_type:  req.proration_type,
    prorated_amount: req.prorated_amount,
    credit_amount:   req.credit_amount,
    days_left:       req.days_left,
    next_billing_date: req.next_billing_date,
    effective_date:  req.effective_date,
    has_card:        !!(req.organizations as any)?.tranzila_card_token,
    card_last4:      (req.organizations as any)?.tranzila_card_last4 ?? null,
  })
}

/**
 * POST /api/plan-change/confirm
 * Клиент подтвердил смену плана (поставил галочку).
 * Выполняем charge (upgrade) или credit (downgrade) и применяем новый план.
 */
export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // Загружаем запрос + организацию
  const { data: req, error: reqError } = await supabase
    .from('plan_change_requests')
    .select('*')
    .eq('confirm_token', token)
    .eq('status', 'pending_confirmation')
    .single()

  if (reqError || !req) return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
  if (new Date(req.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 })

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, owner_email, owner_name, tranzila_card_token, tranzila_card_last4, tranzila_card_expiry')
    .eq('id', req.org_id)
    .single()

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Отмечаем как "в процессе"
  await supabase
    .from('plan_change_requests')
    .update({ status: 'charging', confirmed_at: new Date().toISOString() })
    .eq('id', req.id)

  try {
    if (req.proration_type === 'upgrade' && req.prorated_amount > 0) {
      // ── UPGRADE: charge с токена ──────────────────────────────────────────
      if (org.tranzila_card_token) {
        const chargeResult = await chargeWithToken({
          orgId:       org.id,
          amount:      req.prorated_amount,
          cardToken:   org.tranzila_card_token,
          cardExpiry:  org.tranzila_card_expiry,
          description: `Trinity CRM upgrade to ${req.to_plan} (${req.days_left}d proration)`,
        })

        if (!chargeResult.success) {
          await supabase.from('plan_change_requests').update({
            status: 'failed',
            charge_result: chargeResult,
          }).eq('id', req.id)

          return NextResponse.json({
            ok: false,
            error: 'charge_failed',
            message: chargeResult.error,
          }, { status: 422 })
        }

        // Charge успешен — применяем план
        await applyPlanChange(req)

        // Создаём квитанцию
        try {
          await createReceipt({
            clientName:    org.owner_name || org.name,
            clientEmail:   org.owner_email || undefined,
            items: [{
              name: `Trinity CRM — שדרוג ל-${req.to_plan} (${req.days_left} ימים)`,
              quantity: 1,
              unit_price: req.prorated_amount,
            }],
            totalAmount:   req.prorated_amount,
            paymentMethod: 'credit_card',
          })
        } catch (e) {
          console.error('[plan-change/confirm] Receipt failed (non-fatal):', e)
        }

        await supabase.from('plan_change_requests').update({
          status: 'completed',
          charge_result: chargeResult,
        }).eq('id', req.id)

        return NextResponse.json({ ok: true, type: 'upgrade_charged', transaction_id: chargeResult.transaction_id })

      } else {
        // Нет токена — генерируем Tranzila ссылку и возвращаем её
        const paymentUrl = buildTranzilaUrl({
          amount:      req.prorated_amount,
          orgId:       org.id,
          toPlan:      req.to_plan,
          toPrice:     req.to_price,
          reqId:       req.id,
          ownerEmail:  org.owner_email,
        })

        await supabase.from('plan_change_requests').update({
          status: 'pending_confirmation', // остаётся pending до оплаты через link
          charge_result: { method: 'payment_link', url: paymentUrl },
        }).eq('id', req.id)

        return NextResponse.json({ ok: true, type: 'payment_link_required', payment_url: paymentUrl })
      }

    } else if (req.proration_type === 'downgrade') {
      // ── DOWNGRADE: credit note + применить план сразу ─────────────────────
      await supabase.from('org_credits').insert({
        org_id:    req.org_id,
        amount:    req.credit_amount,
        reason:    'downgrade_proration',
        source_id: req.id,
      })

      await applyPlanChange(req)

      await supabase.from('plan_change_requests').update({
        status: 'completed',
        charge_result: { credit_applied: req.credit_amount },
      }).eq('id', req.id)

      // Email об успешном downgrade
      if (org.owner_email) {
        await resend.emails.send({
          from:    'Trinity CRM <notifications@ambersol.co.il>',
          to:      org.owner_email,
          subject: `מנוי עודכן — ${org.name}`,
          headers: getEmailHeaders(),
          tags:    getEmailTags('transactional'),
          html: buildSuccessEmail({
            orgName:     org.name,
            toPlan:      req.to_plan,
            toPrice:     req.to_price,
            type:        'downgrade',
            creditAmount: req.credit_amount,
            nextBilling: req.next_billing_date,
          }),
        })
      }

      return NextResponse.json({ ok: true, type: 'downgrade_credited', credit_amount: req.credit_amount })

    } else {
      // ── SAME: просто обновить ─────────────────────────────────────────────
      await applyPlanChange(req)
      await supabase.from('plan_change_requests').update({ status: 'completed' }).eq('id', req.id)
      return NextResponse.json({ ok: true, type: 'same_updated' })
    }

  } catch (err: any) {
    console.error('[plan-change/confirm] Unexpected error:', err)
    await supabase.from('plan_change_requests').update({ status: 'failed' }).eq('id', req.id)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function applyPlanChange(req: any) {
  await supabase.from('organizations').update({
    plan:              req.to_plan,
    billing_amount:    req.to_price,
    pending_plan:      null,
    pending_plan_price: null,
    pending_plan_date:  null,
  }).eq('id', req.org_id)
}

async function chargeWithToken(p: {
  orgId: string; amount: number; cardToken: string;
  cardExpiry: string | null; description: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  const params = new URLSearchParams({
    supplier:               process.env.TRANZILA_TOKEN_TERMINAL || process.env.TRANZILA_TERMINAL_ID || '',
    TranzilaPW:             process.env.TRANZILA_TOKEN_PASSWORD  || process.env.TRANZILA_TERMINAL_PASSWORD || '',
    TranzilaTK:             p.cardToken,
    expdate:                p.cardExpiry || '0000',
    sum:                    p.amount.toFixed(2),
    currency:               '1',
    tranmode:               'A',
    pdesc:                  p.description,
    response_return_format: 'json',
    cField1:                p.orgId,
  })

  try {
    const res  = await fetch('https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.ambersol.co.il',
        'Origin':  'https://www.ambersol.co.il',
      },
      body: params.toString(),
    })
    const text = await res.text()
    let result: any = {}
    try { result = JSON.parse(text) } catch { result = Object.fromEntries(new URLSearchParams(text)) }

    if (result.Response === '000') {
      return { success: true, transaction_id: result.ConfirmationCode || result.index }
    }
    return { success: false, error: result.error || result.error_msg || `Response: ${result.Response}` }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

function buildTranzilaUrl(p: {
  amount: number; orgId: string; toPlan: string; toPrice: number;
  reqId: string; ownerEmail: string | null;
}): string {
  const terminal = process.env.TRANZILA_TERMINAL_ID || ''
  const password = process.env.TRANZILA_TERMINAL_PASSWORD || ''
  const params   = new URLSearchParams({
    TranzilaPW:          password,
    sum:                 p.amount.toFixed(2),
    currency:            '1',
    pdesc:               `Trinity CRM upgrade to ${p.toPlan}`,
    lang:                'il',
    success_url_address: `${BASE_URL}/api/payments/tranzila-success?org_id=${p.orgId}&plan_change=${p.toPlan}`,
    fail_url_address:    `${BASE_URL}/api/payments/tranzila-failed`,
    notify_url_address:  `${BASE_URL}/api/payments/tranzila-notify`,
    cField1:             p.orgId,
    cField2:             `plan_change:${p.toPlan}:${p.toPrice}`,
    ...(p.ownerEmail ? { contact_email: p.ownerEmail } : {}),
  })
  return `https://directng.tranzila.com/${terminal}/iframenew.php?${params.toString()}`
}

function buildSuccessEmail(p: {
  orgName: string; toPlan: string; toPrice: number;
  type: 'upgrade' | 'downgrade'; creditAmount?: number; nextBilling: string;
}) {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;direction:rtl;">
  <div style="background:linear-gradient(135deg,#1a237e 0%,#283593 50%,#3949ab 100%);padding:32px;border-radius:16px 16px 0 0;">
    <h1 style="color:white;margin:0;font-size:22px;">Trinity CRM</h1>
  </div>
  <div style="background:#f8fafc;padding:32px;border-radius:0 0 16px 16px;">
    <h2 style="color:#1e293b;margin:0 0 8px;">המנוי עודכן בהצלחה ✅</h2>
    <p style="color:#64748b;margin:0 0 20px;">${p.orgName}</p>
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #e2e8f0;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:#64748b;">תוכנית חדשה</span>
        <strong>${p.toPlan.toUpperCase()} — ₪${p.toPrice}/חודש</strong>
      </div>
      ${p.type === 'downgrade' && p.creditAmount ? `
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:#64748b;">זיכוי לחיוב ב-${p.nextBilling}</span>
        <strong style="color:#6366f1;">₪${p.creditAmount}</strong>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#64748b;">חיוב הבא</span>
        <strong>${p.nextBilling}</strong>
      </div>
    </div>
  </div>
</div>`
}
