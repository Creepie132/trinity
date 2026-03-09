import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Находим организации у которых сегодня дата списания
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, billing_amount, billing_due_date, billing_status, tranzila_card_token, tranzila_card_last4')
    .eq('subscription_status', 'active')

  return NextResponse.json({
    today,
    total_orgs: orgs?.length ?? 0,
    would_charge: orgs?.filter(o => o.billing_due_date === today && o.tranzila_card_token && o.billing_amount > 0),
    skipped_no_token: orgs?.filter(o => !o.tranzila_card_token).map(o => o.name),
    skipped_no_amount: orgs?.filter(o => !o.billing_amount || o.billing_amount == 0).map(o => o.name),
    skipped_wrong_date: orgs?.filter(o => o.billing_due_date !== today).map(o => ({ name: o.name, due: o.billing_due_date })),
  })
}
