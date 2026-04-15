import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const rateMap = new Map<string, { count: number; resetAt: number }>()
function checkRate(ip: string): boolean {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + 900_000 }); return true }
  if (e.count >= 3) return false
  e.count++; return true
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRate(ip)) {
      return NextResponse.json({ ok: true })
    }
    const body = await req.json()
    const email: string = (body.email ?? '').trim().toLowerCase()
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.ambersol.co.il/auth/reset-password',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password] error:', err)
    return NextResponse.json({ ok: true })
  }
}
