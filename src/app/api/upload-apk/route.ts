import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get('filename')
  if (!filename) {
    return NextResponse.json({ error: 'filename required' }, { status: 400 })
  }

  const blob = await put(filename, request.body!, {
    access: 'public',
    contentType: 'application/vnd.android.package-archive',
  })

  return NextResponse.json(blob)
}
