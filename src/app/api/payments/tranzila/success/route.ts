import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ambersol.co.il'

async function handleSuccess(req: NextRequest) {
  // Tranzila шлёт POST с параметрами — просто редиректим на дашборд
  const params = new URL(req.url).searchParams
  const responseCode = params.get('Response')

  if (responseCode === '000') {
    return NextResponse.redirect(`${APP_URL}/dashboard?payment=success`)
  } else {
    return NextResponse.redirect(`${APP_URL}/dashboard?payment=failed&code=${responseCode ?? 'unknown'}`)
  }
}

export async function POST(req: NextRequest) {
  return handleSuccess(req)
}

export async function GET(req: NextRequest) {
  return handleSuccess(req)
}

export const dynamic = 'force-dynamic'
