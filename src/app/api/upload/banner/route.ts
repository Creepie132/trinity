import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL not configured' }, { status: 500 })
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Add it to .env.local and restart server.' 
      }, { status: 500 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `banners/${fileName}`

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('ad-banners')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data } = supabase.storage
      .from('ad-banners')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: data.publicUrl })

  } catch (error: any) {
    console.error('Banner upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
