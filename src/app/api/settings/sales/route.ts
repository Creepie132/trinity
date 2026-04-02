import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// GET /api/settings/sales — читаем текущие настройки продаж из features
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const supabase = createSupabaseServiceClient()
  const { data: org, error } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    sale_always_paid: org?.features?.sale_always_paid ?? false,
  })
}

// PATCH /api/settings/sales — обновляем настройки продаж в features
export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext(request)
  if ('error' in auth) return auth.error
  const { orgId } = auth

  const body = await request.json()
  const supabase = createSupabaseServiceClient()

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', orgId)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const updatedFeatures = {
    ...(org?.features ?? {}),
    ...(typeof body.sale_always_paid === 'boolean'
      ? { sale_always_paid: body.sale_always_paid }
      : {}),
  }

  const { error } = await supabase
    .from('organizations')
    .update({ features: updatedFeatures })
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, sale_always_paid: updatedFeatures.sale_always_paid })
}
