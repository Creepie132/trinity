import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { calcProration, PLAN_PRICES } from '@/lib/proration'
import { resend, getEmailHeaders, getEmailTags } from '@/lib/resend'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ambersol.co.il'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/admin/prorate?org_id=...&to_plan=...&to_price=...
 * Превью расчёта — не применяет изменений.
 */
export async function GET(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const orgId   = searchParams.get('org_id')
  const toPlan  = searchParams.get('to_plan')
  const toPrice = searchParams.get('to_price') ? parseFloat(searchParams.get('to_price')!) : undefined

  if (!orgId || !toPlan) {
    return NextResponse.json({ error: 'org_id and to_plan required' }, { status: 400 })
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, plan, billing_amount, billing_due_date, subscription_expires_at')
    .eq('id', orgId)
    .single()

  if (error || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const billingDate = org.billing_due_date || org.subscription_expires_at || new Date().toISOString()
  const fromPrice   = org.billing_amount ?? PLAN_PRICES[org.plan ?? 'base'] ?? 199

  const preview = calcProration(org.plan ?? 'base', toPlan, billingDate, fromPrice, toPrice)
  return NextResponse.json({ preview })
}

/**
 * POST /api/admin/prorate
 * Применить смену плана:
 *   upgrade  → Tranzila prorated charge + email
 *   downgrade → schedule для следующего периода, без charge
 *   same     → обновить billing_amount
 */
export async function POST(request: NextRequest) {
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { org_id, to_plan, to_price } = body

  if (!org_id || !to_plan) {
    return NextResponse.json({ error: 'org_id and to_plan required' }, { status: 400 })
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(`id, name, plan, billing_amount, billing_due_date, subscription_expires_at, owner_email, owner_name, org_users!inner (email, role)`)
    .eq('id', org_id)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const ownerEmail =
    (org.org_users as any[])?.find((u: any) => u.role === 'owner')?.email ||
    (org as any).owner_email

  const billingDate = (org as any).billing_due_date || (org as any).subscription_expires_at || new Date().toISOString()
  const fromPrice   = (org as any).billing_amount ?? PLAN_PRICES[(org as any).plan ?? 'base'] ?? 199
  const newPrice    = to_price ?? PLAN_PRICES[to_plan] ?? 199

  const preview = calcProration((org as any).plan ?? 'base', to_plan, billingDate, fromPrice, newPrice)

  // ── UPGRADE ──────────────────────────────────────────────────────────────
  if (preview.type === 'upgrade') {
    await supabase.from('organizations').update({
      pending_plan: to_plan, pending_plan_price: newPrice, billing_status: 'prorate_pending',
    }).eq('id', org_id)

    if (preview.proratedAmount > 0 && ownerEmail) {
      const successUrl = `${BASE_URL}/api/payments/tranzila-success?org_id=${org_id}&plan_change=${to_plan}`
      const failUrl    = `${BASE_URL}/api/payments/tranzila-failed?org_id=${org_id}`
      const notifyUrl  = `${BASE_URL}/api/payments/tranzila-notify`

      const params = new URLSearchParams({
        TranzilaPW:          process.env.TRANZILA_TERMINAL_PASSWORD || '',
        sum:                 preview.proratedAmount.toFixed(2),
        currency:            '1',
        pdesc:               `Trinity CRM upgrade to ${to_plan} (${preview.daysLeft}d proration)`,
        lang:                'il',
        success_url_address: successUrl,
        fail_url_address:    failUrl,
        notify_url_address:  notifyUrl,
        cField1:             org_id,
        cField2:             `plan_change:${to_plan}:${newPrice}`,
        ...(ownerEmail ? { contact_email: ownerEmail } : {}),
      })

      const paymentUrl = `https://directng.tranzila.com/${process.env.TRANZILA_TERMINAL_ID}/iframenew.php?${params.toString()}`

      await resend.emails.send({
        from:    'Trinity CRM <notifications@ambersol.co.il>',
        to:      ownerEmail,
        subject: `שדרוג מנוי Trinity CRM — ${(org as any).name}`,
        headers: getEmailHeaders(),
        tags:    getEmailTags('transactional'),
        html:    buildUpgradeEmail({ orgName: (org as any).name, fromPlan: preview.fromPlan, toPlan: preview.toPlan, proratedAmount: preview.proratedAmount, daysLeft: preview.daysLeft, newMonthlyPrice: newPrice, nextBillingDate: preview.nextBillingDate, paymentUrl }),
      })

      return NextResponse.json({ ok: true, type: 'upgrade', preview, payment_url: paymentUrl, email_sent: !!ownerEmail })
    }

    // Upgrade с prorated=0 — применяем сразу
    await applyPlanChange(org_id, to_plan, newPrice, preview.nextBillingDate)
    return NextResponse.json({ ok: true, type: 'upgrade_immediate', preview })
  }

  // ── DOWNGRADE ─────────────────────────────────────────────────────────────
  if (preview.type === 'downgrade') {
    await supabase.from('organizations').update({
      pending_plan: to_plan, pending_plan_price: newPrice, pending_plan_date: preview.effectiveDate,
    }).eq('id', org_id)
    return NextResponse.json({ ok: true, type: 'downgrade_scheduled', preview })
  }

  // ── SAME ─────────────────────────────────────────────────────────────────
  await supabase.from('organizations').update({ plan: to_plan, billing_amount: newPrice }).eq('id', org_id)
  return NextResponse.json({ ok: true, type: 'same_updated', preview })
}

async function applyPlanChange(orgId: string, plan: string, price: number, nextBillingDate: string) {
  await supabase.from('organizations').update({
    plan, billing_amount: price, billing_status: 'paid', billing_due_date: nextBillingDate,
    pending_plan: null, pending_plan_price: null, pending_plan_date: null,
  }).eq('id', orgId)
}

function buildUpgradeEmail(p: { orgName: string; fromPlan: string; toPlan: string; proratedAmount: number; daysLeft: number; newMonthlyPrice: number; nextBillingDate: string; paymentUrl: string }) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#1a237e 0%,#283593 50%,#3949ab 100%);padding:32px;border-radius:16px 16px 0 0;">
      <h1 style="color:white;margin:0;font-size:22px;">Trinity CRM</h1>
    </div>
    <div style="background:#f8fafc;padding:32px;border-radius:0 0 16px 16px;">
      <h2 style="color:#1e293b;margin:0 0 16px;">שדרוג מנוי — ${p.orgName}</h2>
      <div style="background:white;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #e2e8f0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#64748b;">שדרוג</span><strong>${p.fromPlan.toUpperCase()} → ${p.toPlan.toUpperCase()}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#64748b;">ימים שנותרו</span><strong>${p.daysLeft} ימים</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="color:#64748b;">תוספת תשלום</span><strong style="font-size:20px;">₪${p.proratedAmount}</strong></div>
        <div style="border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;"><span style="color:#64748b;">חיוב חודשי מ-${p.nextBillingDate}</span><strong>₪${p.newMonthlyPrice}/חודש</strong></div>
      </div>
      <a href="${p.paymentUrl}" style="display:block;background:#059669;color:white;padding:16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;text-align:center;margin:24px 0;">לתשלום ← ₪${p.proratedAmount}</a>
      <p style="color:#94a3b8;font-size:13px;text-align:center;">לאחר התשלום תופעל גישה למנוי ${p.toPlan.toUpperCase()} מיידית.</p>
    </div>
  </div>`
}
