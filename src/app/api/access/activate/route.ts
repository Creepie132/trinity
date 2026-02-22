import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    console.log('=== INVITATION ACTIVATION ===')
    console.log('User:', user.email)
    console.log('Token:', token)

    // Find invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (inviteError || !invitation) {
      console.error('Invitation not found or already used:', inviteError)
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 })
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    console.log('Invitation marked as accepted')

    // Find user's organization
    const { data: orgUser } = await supabaseAdmin
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (orgUser) {
      // Activate 14-day trial
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 14)

      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'trial',
          subscription_expires_at: expiresAt.toISOString(),
          trial_started_at: new Date().toISOString(),
        })
        .eq('id', orgUser.org_id)

      console.log('Trial activated for org:', orgUser.org_id)
      console.log('Expires at:', expiresAt.toISOString())

      return NextResponse.json({
        success: true,
        message: 'Invitation activated successfully',
        trialExpiresAt: expiresAt.toISOString(),
      })
    } else {
      console.log('No organization found for user, invitation accepted but no trial activated')
      return NextResponse.json({
        success: true,
        message: 'Invitation accepted',
      })
    }
  } catch (error: any) {
    console.error('=== ACTIVATION ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
