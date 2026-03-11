import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

/**
 * POST /api/org/link-user
 * 
 * Auto-link org_users.user_id after first Google login
 * 
 * Problem: When creating org/invitation, we only have email (user_id = null)
 * Solution: After first login, update org_users.user_id = auth.uid where email matches
 * 
 * Flow:
 * 1. User clicks "Login with Google"
 * 2. Google OAuth → auth.users entry created with uid
 * 3. This endpoint links org_users.user_id = uid (where user_id was null)
 * 4. Now access checks work (org_users.user_id = auth.uid())
 */
export async function POST() {
  try {
    // Step 1: Get current user session (regular client)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      console.error('[link-user] ❌ Unauthorized:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[link-user] ✅ User authenticated:', {
      uid: user.id,
      email: user.email,
    })

    // Step 2: Use service role client to bypass RLS
    const svc = createSupabaseServiceClient()
    const email = user.email.toLowerCase()

    console.log('[link-user] 🔍 Searching for org_users with email:', email)

    // Step 3: Find org_users entries with this email but no user_id
    const { data: pendingEntries, error: findError } = await svc
      .from('org_users')
      .select('id, org_id, email, role')
      .eq('email', email)
      .is('user_id', null)

    if (findError) {
      console.error('[link-user] ❌ Error finding pending entries:', findError)
      return NextResponse.json({ error: findError.message }, { status: 400 })
    }

    if (!pendingEntries || pendingEntries.length === 0) {
      console.log('[link-user] ℹ️  No pending entries found (already linked or no invitation)')
      return NextResponse.json({
        ok: true,
        linked: false,
        message: 'No pending entries found',
      })
    }

    console.log('[link-user] 📋 Found pending entries:', pendingEntries.length)

    // Step 4: Update user_id for all matching entries
    const { data: updated, error: updateError } = await svc
      .from('org_users')
      .update({ user_id: user.id })
      .eq('email', email)
      .is('user_id', null)
      .select('org_id, role, email')

    if (updateError) {
      console.error('[link-user] ❌ Error updating user_id:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('[link-user] ✅ Successfully linked user_id:', {
      user_id: user.id,
      email: email,
      updated_count: updated?.length || 0,
      organizations: updated?.map(u => u.org_id),
    })

    // Step 5: Notify org owners for non-owner roles
    const staffPhone = user.user_metadata?.phone || user.user_metadata?.mobile || null
    const staffName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

    for (const entry of (updated || [])) {
      if (entry.role === 'owner') continue

      try {
        // Get org name
        const { data: org } = await svc
          .from('organizations')
          .select('name')
          .eq('id', entry.org_id)
          .single()

        const orgName = org?.name || ''

        // Find all owners of this org
        const { data: owners } = await svc
          .from('org_users')
          .select('user_id')
          .eq('org_id', entry.org_id)
          .eq('role', 'owner')
          .not('user_id', 'is', null)

        if (!owners || owners.length === 0) continue

        const now = new Date()
        const dateStr = now.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

        const notifications = owners.map((owner: any) => ({
          org_id: entry.org_id,
          user_id: owner.user_id,
          type: 'access_request',
          title: 'בקשת גישה חדשה',
          body: `${staffName} (${email}) ביקש גישה לארגון "${orgName}" — ${dateStr}`,
          is_read: false,
          metadata: {
            staff_email: email,
            staff_user_id: user.id,
            staff_name: staffName,
            staff_phone: staffPhone,
            org_id: entry.org_id,
            org_name: orgName,
          },
        }))

        await svc.from('notifications').insert(notifications)
        console.log('[link-user] 📨 Notifications sent to', owners.length, 'owner(s) for org', entry.org_id)
      } catch (notifErr) {
        console.error('[link-user] Failed to send owner notification:', notifErr)
      }
    }

    // Step 6: Return success with org info
    return NextResponse.json({
      ok: true,
      linked: true,
      user_id: user.id,
      email: email,
      organizations: updated || [],
      count: updated?.length || 0,
    })
  } catch (error: any) {
    console.error('[link-user] ❌ Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
