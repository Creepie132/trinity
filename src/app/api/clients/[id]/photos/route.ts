import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

// GET /api/clients/[id]/photos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if ('error' in auth) return NextResponse.json([], { status: 401 })
    const { orgId, supabase } = auth

    const { data, error } = await supabase
      .from('client_photos')
      .select('id, storage_path, file_name, file_size, caption, created_at')
      .eq('org_id', orgId)
      .eq('client_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const photosWithUrls = await Promise.all(
      (data || []).map(async (photo) => {
        const { data: urlData } = await supabase.storage
          .from('client-photos')
          .createSignedUrl(photo.storage_path, 3600)
        return { ...photo, url: urlData?.signedUrl || null }
      })
    )
    return NextResponse.json(photosWithUrls)
  } catch (error) {
    console.error('Error fetching client photos:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// POST /api/clients/[id]/photos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getAuthContext()
    if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId, user, supabase } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caption = formData.get('caption') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${orgId}/${id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('client-photos')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: record, error: dbError } = await supabase
      .from('client_photos')
      .insert({
        org_id: orgId,
        client_id: id,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        caption: caption || null,
        created_by: user.id,
      })
      .select('id, storage_path, file_name, file_size, caption, created_at')
      .single()

    if (dbError) throw dbError

    const { data: urlData } = await supabase.storage
      .from('client-photos')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json({ ...record, url: urlData?.signedUrl || null })
  } catch (error) {
    console.error('Error uploading client photo:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// DELETE /api/clients/[id]/photos?photoId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

    const auth = await getAuthContext()
    if ('error' in auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId, supabase } = auth

    const { data: photo, error: fetchError } = await supabase
      .from('client_photos')
      .select('storage_path')
      .eq('id', photoId)
      .eq('org_id', orgId)
      .eq('client_id', id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await supabase.storage.from('client-photos').remove([photo.storage_path])

    const { error: deleteError } = await supabase
      .from('client_photos')
      .delete()
      .eq('id', photoId)
      .eq('org_id', orgId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client photo:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
