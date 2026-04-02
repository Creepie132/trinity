import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotifChannels {
  push: boolean
  telegram: boolean
  email: boolean
}

export interface NotificationPreferences {
  [eventKey: string]: NotifChannels
}

const DEFAULT_CHANNELS: NotifChannels = { push: true, telegram: false, email: false }

// ─── GET /api/notifications/preferences ──────────────────────────────────────
// Returns the user's notification preferences for the active org

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user, orgId } = auth

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from('notification_preferences')
      .select('preferences')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('[notif/prefs GET]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // If no record yet — return empty object (frontend uses defaults)
    const preferences: NotificationPreferences = (data?.preferences as NotificationPreferences) ?? {}
    return NextResponse.json({ preferences })
  } catch (err) {
    console.error('[notif/prefs GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── PUT /api/notifications/preferences ──────────────────────────────────────
// Atomically updates a single event+channel toggle (optimistic-UI compatible)

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if ('error' in auth) return auth.error
    const { user, orgId } = auth

    const body = await request.json() as {
      eventKey: string
      channel: keyof NotifChannels
      value: boolean
    }

    const { eventKey, channel, value } = body

    if (!eventKey || !channel || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Sanitize inputs
    const allowedChannels: Array<keyof NotifChannels> = ['push', 'telegram', 'email']
    if (!allowedChannels.includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }
    // eventKey: only alphanumeric + underscores
    if (!/^[a-z_]{1,64}$/.test(eventKey)) {
      return NextResponse.json({ error: 'Invalid eventKey' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // Read current prefs to merge
    const { data: existing } = await service
      .from('notification_preferences')
      .select('preferences')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()

    const currentPrefs: NotificationPreferences =
      (existing?.preferences as NotificationPreferences) ?? {}

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      [eventKey]: {
        ...(currentPrefs[eventKey] ?? DEFAULT_CHANNELS),
        [channel]: value,
      },
    }

    // Upsert — creates row if first time
    const { error } = await service
      .from('notification_preferences')
      .upsert(
        {
          org_id: orgId,
          user_id: user.id,
          preferences: updatedPrefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,user_id' }
      )

    if (error) {
      console.error('[notif/prefs PUT]', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, preferences: updatedPrefs })
  } catch (err) {
    console.error('[notif/prefs PUT]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
