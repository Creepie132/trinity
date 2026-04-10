import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect(new URL('https://www.ambersol.co.il/demo-boris-portal.html'), {
    status: 301,
  })
}
