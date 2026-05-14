import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

// Public — no auth. GET /api/register/[slug]/lookup?phone=050...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const phone = request.nextUrl.searchParams.get('phone')
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: org } = await supabase
      .from('organizations')
      .select('id, registration_enabled')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!org.registration_enabled) return NextResponse.json({ error: 'Disabled' }, { status: 403 })

    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name, phone, email, date_of_birth, avatar_url')
      .eq('org_id', org.id)
      .eq('phone', normalizePhone(phone))
      .maybeSingle()

    if (!client) return NextResponse.json({ found: false })
    return NextResponse.json({ found: true, client })
  } catch (err) {
    console.error('[Lookup API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
