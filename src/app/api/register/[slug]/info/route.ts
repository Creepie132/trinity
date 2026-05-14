import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API — no auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url, registration_enabled, privacy_policy_url, registration_logo_url, registration_subtitle, registration_photo_url')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!org.registration_enabled) {
      return NextResponse.json(
        { error: 'Self-registration is not enabled for this organization' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      name: org.name,
      logo_url: org.logo_url,
      privacy_policy_url: org.privacy_policy_url,
      registration_logo_url: org.registration_logo_url,
      registration_subtitle: org.registration_subtitle,
      registration_photo_url: org.registration_photo_url,
    })
  } catch (err: any) {
    console.error('[Register Info API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
