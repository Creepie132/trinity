import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/admin/payments/[id]
// Только для суперадмина — требует пароль подтверждения
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { password } = await req.json()

    const adminPassword = process.env.ADMIN_DELETE_PASSWORD
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 403 })
    }

    const { id: paymentId } = await params
    if (!paymentId) {
      return NextResponse.json({ error: 'ID не указан' }, { status: 400 })
    }

    // Убираем FK ссылку из inventory_transactions
    await supabaseAdmin
      .from('inventory_transactions')
      .update({ related_payment_id: null })
      .eq('related_payment_id', paymentId)

    // Удаляем платёж
    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
