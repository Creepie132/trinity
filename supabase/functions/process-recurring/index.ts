/**
 * Supabase Edge Function: process-recurring
 *
 * Cron: ежедневно в 09:00 Israel time (06:00 UTC)
 * Находит организации с billing_due_date = сегодня и вызывает charge-subscription
 *
 * Deploy:
 *   supabase functions deploy process-recurring
 *
 * Schedule (в Supabase Dashboard → Edge Functions → Schedules):
 *   0 6 * * *
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Защита — только от Supabase Scheduler или вручную с ключом
  const authHeader = req.headers.get('authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const appUrl = Deno.env.get('APP_URL') || 'https://app.ambersol.co.il'

  const supabase = createClient(supabaseUrl, supabaseServiceKey!)

  const today = new Date().toISOString().split('T')[0]

  console.log(`[process-recurring] Starting. Date: ${today}`)

  const results: Array<{
    org_id: string
    org_name: string
    status: 'success' | 'failed' | 'skipped'
    error?: string
  }> = []

  try {
    // Находим организации у которых:
    // 1. billing_due_date = сегодня
    // 2. subscription_status = 'active'
    // 3. Есть сохранённый токен карты
    const { data: orgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, tranzila_card_token, billing_amount, billing_due_date')
      .eq('billing_due_date', today)
      .in('subscription_status', ['active', 'manual'])
      .not('tranzila_card_token', 'is', null)

    if (fetchError) {
      console.error('[process-recurring] Fetch error:', fetchError.message)
      throw fetchError
    }

    if (!orgs?.length) {
      console.log('[process-recurring] No organizations due today')
      return new Response(
        JSON.stringify({ message: 'No billing due today', date: today, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[process-recurring] Found ${orgs.length} orgs to process`)

    // Вызываем charge-subscription для каждой организации
    for (const org of orgs) {
      console.log(`[process-recurring] Processing: ${org.name} (${org.id})`)

      if (!org.billing_amount || org.billing_amount <= 0) {
        results.push({ org_id: org.id, org_name: org.name, status: 'skipped', error: 'No billing amount' })
        continue
      }

      try {
        const chargeResponse = await fetch(`${appUrl}/api/payments/charge-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ org_id: org.id }),
        })

        const chargeData = await chargeResponse.json()

        if (chargeResponse.ok && chargeData.success) {
          results.push({ org_id: org.id, org_name: org.name, status: 'success' })
          console.log(`[process-recurring] ✅ ${org.name}: ${org.billing_amount}₪`)
        } else {
          results.push({
            org_id: org.id,
            org_name: org.name,
            status: 'failed',
            error: chargeData.error || `HTTP ${chargeResponse.status}`,
          })
          console.error(`[process-recurring] ❌ ${org.name}:`, chargeData.error)
        }
      } catch (err: any) {
        results.push({ org_id: org.id, org_name: org.name, status: 'failed', error: err.message })
        console.error(`[process-recurring] Exception for ${org.name}:`, err.message)
      }
    }

    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length

    console.log(`[process-recurring] Done: ${successful} success, ${failed} failed, ${skipped} skipped`)

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        summary: { total: orgs.length, successful, failed, skipped },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[process-recurring] Fatal error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
