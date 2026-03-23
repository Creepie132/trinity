'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { Images, Upload, Trash2, X, ZoomIn, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getClientName } from '@/lib/client-utils'

// Сжатие изображения на клиенте перед отправкой
// Максимум 1200px по длинной стороне, качество 0.82 (JPEG) — хорошо читается, но лёгкое
async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      let newW = width
      let newH = height
      if (width > maxDim || height > maxDim) {
        if (width >= height) { newW = maxDim; newH = Math.round((height / width) * maxDim) }
        else { newH = maxDim; newW = Math.round((width / height) * maxDim) }
      }
      const canvas = document.createElement('canvas')
      canvas.width = newW
      canvas.height = newH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, newW, newH)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

interface Photo {
  id: string
  url: string | null
  file_name: string
  file_size: number | null
  caption: string | null
  created_at: string
}

export function ClientGalleryModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const isOpen = isModalOpen('client-gallery')
  const data = getModalData('client-gallery')

  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const client = data?.client
  const locale: 'he' | 'ru' = data?.locale || 'ru'
  const isHe = locale === 'he'
  const clientName = client ? getClientName(client) : ''

  const T = {
    ru: {
      title: 'Галерея',
      upload: 'Загрузить фото',
      empty: 'Фотографий пока нет',
      emptyHint: 'Нажмите «Загрузить» или перетащите файлы сюда',
      uploading: 'Загрузка...',
      compressing: 'Сжатие...',
      deleteConfirm: 'Удалить фотографию?',
      uploadError: 'Ошибка загрузки',
      deleteError: 'Ошибка удаления',
      photos: (n: number) => `${n} ${n === 1 ? 'фото' : n < 5 ? 'фото' : 'фото'}`,
      dropHint: 'Отпустите для загрузки',
    },
    he: {
      title: 'גלריה',
      upload: 'העלה תמונה',
      empty: 'אין תמונות עדיין',
      emptyHint: 'לחץ "העלה" או גרור קבצים לכאן',
      uploading: 'מעלה...',
      compressing: 'דוחס...',
      deleteConfirm: 'למחוק את התמונה?',
      uploadError: 'שגיאת העלאה',
      deleteError: 'שגיאת מחיקה',
      photos: (n: number) => `${n} תמונות`,
      dropHint: 'שחרר להעלאה',
    },
  }
  const t = T[locale]

  const fetchPhotos = useCallback(async () => {
    if (!client?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/photos`)
      if (res.ok) setPhotos(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [client?.id])

  useEffect(() => {
    if (isOpen && client?.id) fetchPhotos()
    else setPhotos([])
  }, [isOpen, client?.id, fetchPhotos])

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!arr.length) return
    setUploading(true)
    for (const raw of arr) {
      try {
        const compressed = await compressImage(raw)
        const fd = new FormData()
        fd.append('file', compressed)
        const res = await fetch(`/api/clients/${client.id}/photos`, { method: 'POST', body: fd })
        if (!res.ok) throw new Error()
        const photo = await res.json()
        setPhotos((prev) => [photo, ...prev])
      } catch {
        toast.error(t.uploadError)
      }
    }
    setUploading(false)
  }

  async function handleDelete(photoId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t.deleteConfirm)) return
    try {
      const res = await fetch(`/api/clients/${client.id}/photos?photoId=${photoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      if (lightboxIndex !== null) setLightboxIndex(null)
    } catch {
      toast.error(t.deleteError)
    }
  }

  function openLightbox(idx: number) { setLightboxIndex(idx) }
  function closeLightbox() { setLightboxIndex(null) }
  function lightboxPrev() { setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1)) }
  function lightboxNext() { setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0)) }

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex])

  if (!isOpen || !client) return null

  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => { setLightboxIndex(null); closeModal('client-gallery') }}
        showCloseButton={true}
        darkHeader={false}
        width="700px"
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="!p-0"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Images className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">{t.title} — {clientName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t.photos(photos.length)}</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t.uploading : t.upload}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {/* Drop zone + grid */}
        <div
          className={`min-h-[320px] p-5 transition-colors ${dragOver ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-background'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        >
          {dragOver && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-semibold shadow-xl">
                {t.dropHint}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : photos.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted rounded-2xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Images className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-muted-foreground">{t.empty}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => openLightbox(idx)}
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Images className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                    <button
                      onClick={(e) => handleDelete(photo.id, e)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  {/* Caption */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-white text-[10px] truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
              {/* Upload tile */}
              <div
                className="aspect-square rounded-xl border-2 border-dashed border-muted hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 flex flex-col items-center justify-center cursor-pointer transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-muted-foreground/50 mb-1" />
                <span className="text-xs text-muted-foreground/50">+</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex]?.url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox() }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev() }}
                className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext() }}
                className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIndex].url!}
            alt={photos[lightboxIndex].file_name}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {photos[lightboxIndex].caption && (
              <p className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {photos[lightboxIndex].caption}
              </p>
            )}
            <button
              onClick={(e) => handleDelete(photos[lightboxIndex!].id, e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isHe ? 'מחק' : 'Удалить'}
            </button>
            {photos.length > 1 && (
              <p className="text-white/50 text-xs">
                {lightboxIndex + 1} / {photos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
