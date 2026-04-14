import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/auth/confirm/error', req.url))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })

  if (error) {
    console.error('[confirm] verifyOtp error:', error.message)
    return NextResponse.redirect(new URL('/auth/confirm/error', req.url))
  }

  return NextResponse.redirect(new URL('/auth/confirm/success', req.url))
}
