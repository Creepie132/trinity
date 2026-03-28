import { NextRequest, NextResponse } from 'next/server'
import { createSubscriptionPaymentUrl } from '@/lib/tranzila'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import type { SetupOption } from '@/hooks/usePricingPlans'

/**
 * POST /api/demo/create-payment-link
 *
 * SECURITY: Фронтенд передаёт только setupId ('full'|'standart'|'self').
 * Бэкенд сам читает цену из pricing_config в БД и вычисляет итоговую сумму.
 * Это защищает от Price Tampering — клиент не может подменить сумму.
 *
 * Body: { setupId, monthlyAmount, moduleCount, description, email, plan }
 */
export async function POST(request: NextRequest) {
  try {
    const {
      setupId,          // 'full' | 'standart' | 'self' — ID из БД
      monthlyAmount,    // ежемесячная подписка (приходит с фронта, не цена сетапа)
      moduleCount,      // для расчёта скидки
      description,
      email,
      plan,
    } = await request.json()

    if (!setupId) {
      return NextResponse.json({ error: 'setupId is required' }, { status: 400 })
    }

    // ── Читаем цены из БД (единый источник правды) ──────────────────────────
    const service = createSupabaseServiceClient()
    const { data: configRow, error: configErr } = await service
      .from('pricing_config')
      .select('setup_options, demo_discount_pct, demo_discount_threshold')
      .single()

    if (configErr || !configRow) {
      console.error('[create-payment-link] pricing_config not found:', configErr)
      return NextResponse.json({ error: 'Pricing config unavailable' }, { status: 500 })
    }

    // Fallback цены если БД пустая
    const FALLBACK: Record<string, { price: number; discount_eligible: boolean }> = {
      full:     { price: 2000, discount_eligible: true },
      standart: { price: 1300, discount_eligible: true },
      self:     { price: 300,  discount_eligible: false },
    }

    const setupOptions: SetupOption[] = configRow.setup_options ?? []
    const opt = setupOptions.find(o => o.id === setupId) ?? (() => {
      const fb = FALLBACK[setupId]
      if (!fb) return null
      return { id: setupId, price: fb.price, discount_eligible: fb.discount_eligible } as SetupOption
    })()

    if (!opt) {
      return NextResponse.json({ error: `Unknown setupId: ${setupId}` }, { status: 400 })
    }

    // ── Вычисляем итоговую цену с учётом скидки ──────────────────────────────
    const discountPct       = configRow.demo_discount_pct       ?? 15
    const discountThreshold = configRow.demo_discount_threshold ?? 5
    const count = Number(moduleCount) || 0

    const discountApplied = opt.discount_eligible && count >= discountThreshold
    const setupAmount = discountApplied
      ? Math.round(opt.price * (1 - discountPct / 100))
      : opt.price

    console.log('[create-payment-link] Setup price calculated:', {
      setupId, basePrice: opt.price, discountApplied, finalPrice: setupAmount,
      moduleCount: count, discountPct,
    })

    if (setupAmount <= 0) {
      return NextResponse.json({ error: 'Invalid setup amount' }, { status: 400 })
    }

    // ── Генерируем ссылку Tranzila ───────────────────────────────────────────
    const baseUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://ambersol.co.il'
    const tempId     = `demo-${Date.now()}`

    // Подписка стартует через 30 дней (после сетап-платежа)
    const d = new Date(); d.setDate(d.getDate() + 30)
    const recurStartDate = [
      String(d.getDate()).padStart(2, '0'),
      String(d.getMonth() + 1).padStart(2, '0'),
      d.getFullYear(),
    ].join('/')

    const url = createSubscriptionPaymentUrl({
      amount:        setupAmount,
      recurSum:      monthlyAmount ? Number(monthlyAmount) : undefined,
      recurStartDate,
      orgId:         tempId,
      orgName:       description || `Trinity CRM — ${plan}`,
      plan:          plan || undefined,
      ownerEmail:    email  || undefined,
      notifyUrl:     `${baseUrl}/api/payments/tranzila-notify`,
      successUrl:    `${baseUrl}/payment-success?type=demo-setup`,
      failUrl:       `${baseUrl}/payment-failed?type=demo-setup`,
    })

    return NextResponse.json({ url, setupAmount })
  } catch (err: any) {
    console.error('[demo/create-payment-link]', err?.message)
    return NextResponse.json({ url: null, error: err?.message })
  }
}
