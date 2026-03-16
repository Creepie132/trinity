import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple in-memory rate limiter: max 5 registrations per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().+]/g, '')
  return /^(05\d{8}|972\d{9}|9725\d{8})$/.test(cleaned)
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

// Public API — no auth required
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Rate limiting by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const { slug } = await params
    const body = await request.json()

    const { first_name, last_name, phone, email, date_of_birth, consent } = body

    // Validate required fields
    if (!first_name?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }
    if (!last_name?.trim()) {
      return NextResponse.json({ error: 'Last name is required' }, { status: 400 })
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }
    if (!date_of_birth?.trim()) {
      return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!consent) {
      return NextResponse.json({ error: 'Consent is required' }, { status: 400 })
    }

    // Validate phone format
    if (!isValidIsraeliPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a valid Israeli number (e.g. 050-123-4567).' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Resolve org by slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, registration_enabled')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (!org.registration_enabled) {
      return NextResponse.json(
        { error: 'Self-registration is not enabled for this organization' },
        { status: 403 }
      )
    }

    const normalizedPhone = normalizePhone(phone)

    // Check for duplicate phone in this org
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'already_registered' },
        { status: 409 }
      )
    }

    // Insert new client — get the new client id back
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        org_id: org.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: normalizedPhone,
        email: email.trim().toLowerCase(),
        date_of_birth,
        loyalty_balance: 0,
      })
      .select('id')
      .single()

    if (insertError || !newClient) {
      console.error('[Register API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to register. Please try again.' }, { status: 500 })
    }

    // Notify all users of this org
    try {
      const { data: orgUsers } = await supabase
        .from('org_users')
        .select('user_id')
        .eq('org_id', org.id)

      if (orgUsers && orgUsers.length > 0) {
        const clientFullName = `${first_name.trim()} ${last_name.trim()}`
        const notifications = orgUsers.map((u: { user_id: string }) => ({
          org_id: org.id,
          user_id: u.user_id,
          type: 'client_registered',
          title: `🆕 ${clientFullName}`,
          body: `${normalizedPhone}${email ? ` · ${email.trim().toLowerCase()}` : ''}`,
          link: `/clients/${newClient.id}`,
          reference_id: newClient.id,
          is_read: false,
        }))
        await supabase.from('notifications').insert(notifications)
      }
    } catch (notifErr) {
      // Non-fatal — client already created, just log
      console.error('[Register API] Notification error:', notifErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Register API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
