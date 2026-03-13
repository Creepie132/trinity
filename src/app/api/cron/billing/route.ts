import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/billing
 *
 * Этот cron больше не нужен — Tranzila My Billing автоматически
 * списывает каждый месяц и шлёт notify на /api/payments/tranzila-notify.
 *
 * Оставлен как заглушка для обратной совместимости.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    message: 'Billing is now handled automatically by Tranzila My Billing. See /api/payments/tranzila-notify.',
    ok: true,
  })
}
