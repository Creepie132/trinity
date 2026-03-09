import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

/**
 * POST /api/care-instructions/upload
 * Upload PDF file to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error
    
    const { orgId, supabase } = auth

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
    const fileName = `${orgId}/${timestamp}_${sanitizedFileName}`

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
