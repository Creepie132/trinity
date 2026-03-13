import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/payments/charge-subscription
 *
 * Этот роут больше не нужен — Tranzila My Billing автоматически
 * списывает каждый месяц и шлёт notify на /api/payments/tranzila-notify.
 *
 * Оставлен как заглушка для обратной совместимости.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'Recurring billing is now handled automatically by Tranzila My Billing.',
    ok: true,
  })
}
