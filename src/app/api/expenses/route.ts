import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'
import {
  validateBody,
  createExpenseSchema,
  updateExpenseSchema,
} from '@/lib/validations'

/**
 * GET /api/expenses
 * Список расходов для текущей org.
 * Query: ?month=YYYY-MM &category=... &limit=50
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const month    = searchParams.get('month')
  const category = searchParams.get('category')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)

  const service = createSupabaseServiceClient()
  let query = service
    .from('expenses')
    .select('*')
    .eq('org_id', orgId)
    .order('expense_date', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(limit)

  if (month) {
    const start = `${month}-01`
    const end   = new Date(
      new Date(start).getFullYear(),
      new Date(start).getMonth() + 1,
      0
    ).toISOString().split('T')[0]
    query = query.gte('expense_date', start).lte('expense_date', end)
  }
  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data ?? [] })
}

/**
 * POST /api/expenses
 * Ручное создание расхода (без чека).
 *
 * Zero Trust:
 *   - orgId только из getAuthContext()
 *   - Zod: amount > 0, category из enum, date YYYY-MM-DD
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId, user } = auth

    const body = await request.json()
    const { data, error: validationError } = validateBody(createExpenseSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { vendor, amount, expense_date, category, description, notes } = data
    const roundedAmount = Math.round(amount * 100) / 100

    const service = createSupabaseServiceClient()
    const { data: expense, error: insertErr } = await service
      .from('expenses')
      .insert({
        org_id:       orgId,
        created_by:   user.id,
        vendor:       vendor.trim(),
        amount:       roundedAmount,
        currency:     'ILS',
        expense_date,
        category,
        description:  description?.trim() || null,
        notes:        notes?.trim() || null,
        verified:     false,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[API] POST /api/expenses insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/expenses exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/expenses
 * Обновление расхода. Ранее не имело Zod-валидации — исправлено.
 *
 * Zero Trust:
 *   - orgId только из getAuthContext()
 *   - Zod: updateExpenseSchema — все поля optional, id обязателен
 *   - ownership check: expense.eq('org_id', orgId)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { orgId } = auth

    const body = await request.json()
    const { data, error: validationError } = validateBody(updateExpenseSchema, body)
    if (validationError || !data) {
      return NextResponse.json({ error: validationError || 'Validation failed' }, { status: 400 })
    }

    const { id, vendor, amount, expense_date, category, description, verified, notes, order_number } = data

    // Строим объект обновления только из пришедших полей
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (vendor        !== undefined) updateData.vendor        = vendor.trim()
    if (amount        !== undefined) updateData.amount        = Math.round(amount * 100) / 100
    if (expense_date  !== undefined) updateData.expense_date  = expense_date
    if (category      !== undefined) updateData.category      = category
    if (description   !== undefined) updateData.description   = description?.trim() || null
    if (verified      !== undefined) updateData.verified      = verified
    if (notes         !== undefined) updateData.notes         = notes?.trim() || null
    if (order_number  !== undefined) updateData.order_number  = order_number?.trim() || null

    const service = createSupabaseServiceClient()
    const { data: expense, error } = await service
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)   // ownership check встроен в запрос
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('[API] PATCH /api/expenses exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/expenses
 * Удаление расхода + файла из Storage.
 * Без изменений — уже корректен.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createSupabaseServiceClient()

  // Получаем путь к файлу для удаления из Storage
  const { data: expense } = await service
    .from('expenses')
    .select('receipt_storage_path')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (expense?.receipt_storage_path) {
    await service.storage.from('receipts').remove([expense.receipt_storage_path])
  }

  const { error } = await service
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
