import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = {
    api: true,
    supabase: false,
    sms: false,
    payments: false,
    timestamp: new Date().toISOString(),
  }

  try {
    // Check Supabase connection
    const { error: supabaseError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    
    checks.supabase = !supabaseError

    // Check SMS Provider (InforU)
    const inforuToken = process.env.INFORU_API_TOKEN
    checks.sms = !!inforuToken && inforuToken.length > 0

    // Check Payment Provider (Tranzilla)
    const tranzillaTerminal = process.env.TRANZILLA_TERMINAL_ID
    checks.payments = !!tranzillaTerminal && tranzillaTerminal.length > 0

    const allHealthy = checks.supabase && checks.sms && checks.payments

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    }, {
      status: allHealthy ? 200 : 503,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      checks,
      error: error.message,
    }, {
      status: 500,
    })
  }
}
