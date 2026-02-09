import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const paymentId = searchParams.get('contact') || searchParams.get('order_id')

  // Redirect to payments page with status
  const baseUrl = request.nextUrl.origin
  
  if (status === 'success') {
    return NextResponse.redirect(
      `${baseUrl}/payments?status=success&payment_id=${paymentId || ''}`
    )
  } else {
    return NextResponse.redirect(
      `${baseUrl}/payments?status=failed&payment_id=${paymentId || ''}`
    )
  }
}

export async function POST(request: NextRequest) {
  // Handle POST callback (same as GET)
  return GET(request)
}
