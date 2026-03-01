import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/care-instructions/upload
 * Upload PDF file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/care-instructions/upload - Start')
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[API] User check:', user ? `User: ${user.id}` : 'No user', userError ? `Error: ${userError.message}` : '')
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgUser) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${orgUser.org_id}/${timestamp}_${sanitizedFileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    console.log('[API] Uploading file:', fileName, 'size:', buffer.length)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('care-instructions')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[API] File upload error:', JSON.stringify(uploadError, null, 2))
      console.error('[API] Upload details - fileName:', fileName, 'bufferSize:', buffer.length)
      return NextResponse.json({ 
        error: uploadError.message,
        details: uploadError,
      }, { status: 500 })
    }
    
    console.log('[API] File uploaded successfully:', uploadData)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('care-instructions')
      .getPublicUrl(fileName)

    return NextResponse.json({ 
      file_url: urlData.publicUrl,
      file_path: fileName 
    }, { status: 200 })

  } catch (error) {
    console.error('[API] POST /api/care-instructions/upload exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
