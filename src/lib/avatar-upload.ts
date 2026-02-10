import { supabase } from './supabase'

/**
 * Upload a user avatar to Supabase Storage
 * @param file - Image file (jpeg, png, webp, gif)
 * @param userId - User ID for folder organization
 * @returns Public URL of the uploaded avatar
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.')
  }

  // Validate file size (2MB)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size: 2MB')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const fileName = `${userId}/avatar_${timestamp}.${fileExt}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Replace if exists
    })

  if (error) {
    console.error('Avatar upload error:', error)
    
    if (error.message.includes('Bucket not found')) {
      throw new Error('Storage bucket "avatars" not found. Please create it in Supabase Dashboard -> Storage.')
    }
    
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Delete old avatar from storage (cleanup)
 * @param avatarUrl - Full public URL of the avatar
 */
export async function deleteAvatar(avatarUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(avatarUrl)
    const pathMatch = url.pathname.match(/\/avatars\/(.+)/)
    
    if (!pathMatch) {
      console.warn('Invalid avatar URL format')
      return
    }

    const filePath = pathMatch[1]

    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath])

    if (error) {
      console.error('Avatar delete error:', error)
    }
  } catch (err) {
    console.error('Failed to delete avatar:', err)
  }
}
