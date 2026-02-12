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

    // Step 5: Return success with org info
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
