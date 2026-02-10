'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { uploadAvatar, deleteAvatar } from '@/lib/avatar-upload'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userName: string
  onUploadSuccess?: (newAvatarUrl: string) => void
}

export function AvatarUpload({ 
  currentAvatarUrl, 
  userName,
  onUploadSuccess 
}: AvatarUploadProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setUploading(true)

      // Upload to Supabase Storage
      const publicUrl = await uploadAvatar(file, user.id)

      // Update org_users table
      const { error } = await supabase
        .from('org_users')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id)

      if (error) throw error

      // Delete old avatar if exists
      if (currentAvatarUrl && currentAvatarUrl !== publicUrl) {
        await deleteAvatar(currentAvatarUrl)
      }

      // Update preview
      setAvatarPreview(publicUrl)
      
      // Notify parent
      onUploadSuccess?.(publicUrl)

      alert('תמונת הפרופיל עודכנה בהצלחה!')
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      alert(`שגיאה בהעלאת תמונה: ${error.message}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user || !currentAvatarUrl) return

    if (!confirm('האם למחוק את תמונת הפרופיל?')) return

    try {
      setUploading(true)

      // Delete from storage
      await deleteAvatar(currentAvatarUrl)

      // Update database
      const { error } = await supabase
        .from('org_users')
        .update({ avatar_url: null })
        .eq('user_id', user.id)

      if (error) throw error

      setAvatarPreview(null)
      onUploadSuccess?.(null as any)

      alert('תמונת הפרופיל הוסרה')
    } catch (error: any) {
      console.error('Avatar remove error:', error)
      alert(`שגיאה במחיקת תמונה: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const userInitial = userName?.[0]?.toUpperCase() || '?'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative group">
        <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
          <AvatarImage src={avatarPreview || undefined} alt={userName} />
          <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {userInitial}
          </AvatarFallback>
        </Avatar>

        {/* Camera overlay on hover */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
          <Camera className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Upload Controls */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          size="sm"
          variant="default"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              מעלה...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 ml-2" />
              {avatarPreview ? 'שנה תמונה' : 'העלה תמונה'}
            </>
          )}
        </Button>

        {avatarPreview && (
          <Button
            onClick={handleRemoveAvatar}
            disabled={uploading}
            size="sm"
            variant="destructive"
          >
            <X className="w-4 h-4 ml-2" />
            הסר
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        תמונות בפורמט JPG, PNG, WEBP או GIF<br />
        גודל מקסימלי: 2MB
      </p>
    </div>
  )
}
