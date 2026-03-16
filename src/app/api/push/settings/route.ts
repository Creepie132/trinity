import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export interface PushSettings {
  new_visit: boolean       // Новая запись/визит
  visit_reminder: boolean  // Напоминание о визите (за 1 час)
  new_payment: boolean     // Новый платёж
  new_client: boolean      // Новый клиент
  birthday: boolean        // День рождения клиента
}

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  new_visit: true,
  visit_reminder: true,
  new_payment: true,
  new_client: false,
  birthday: false,
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('organizations')
      .select('metadata')
      .eq('id', auth.orgId)
      .single()

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    const pushSettings: PushSettings = {
      ...DEFAULT_PUSH_SETTINGS,
      ...(data?.metadata?.push_settings ?? {}),
    }

    return NextResponse.json({ settings: pushSettings })
  } catch (err) {
    console.error('[push/settings GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error

    const body = await request.json() as { settings: Partial<PushSettings> }
    if (!body.settings) {
      return NextResponse.json({ error: 'Missing settings' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Читаем текущий metadata чтобы не затереть другие поля
    const { data: org } = await service
      .from('organizations')
      .select('metadata')
      .eq('id', auth.orgId)
      .single()

    const currentMetadata = org?.metadata ?? {}
    const currentPushSettings = currentMetadata.push_settings ?? {}

    const newPushSettings: PushSettings = {
      ...DEFAULT_PUSH_SETTINGS,
      ...currentPushSettings,
      ...body.settings,
    }

    const { error } = await service
      .from('organizations')
      .update({
        metadata: {
          ...currentMetadata,
          push_settings: newPushSettings,
        },
      })
      .eq('id', auth.orgId)

    if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    return NextResponse.json({ ok: true, settings: newPushSettings })
  } catch (err) {
    console.error('[push/settings PUT]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
