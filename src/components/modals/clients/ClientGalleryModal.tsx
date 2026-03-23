'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import {
  Images, Upload, Trash2, X, ZoomIn,
  ChevronLeft, ChevronRight, Loader2, Link2, Hash, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { getClientName } from '@/lib/client-utils'
import { VisitDetailModal } from '@/components/visits/VisitDetailModal'

// ─── Сжатие на клиенте ──────────────────────────────────────────────────────
async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      let newW = width, newH = height
      if (width > maxDim || height > maxDim) {
        if (width >= height) { newW = maxDim; newH = Math.round((height / width) * maxDim) }
        else                 { newH = maxDim; newW = Math.round((width / height) * maxDim) }
      }
      const canvas = document.createElement('canvas')
      canvas.width = newW; canvas.height = newH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, newW, newH)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg', quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Photo {
  id: string
  url: string | null
  file_name: string
  file_size: number | null
  caption: string | null
  visit_id: string | null
  visit_label: string | null
  created_at: string
}

interface Visit {
  id: string
  scheduled_at: string | null
  created_at: string
  service_type: string | null
}

// Мини-диалог метаданных перед загрузкой
interface MetaDialogProps {
  files: File[]
  visits: Visit[]
  locale: 'he' | 'ru'
  onConfirm: (caption: string, visitId: string, visitLabel: string) => void
  onCancel: () => void
}

const T = {
  ru: {
    title: 'Галерея',
    upload: 'Загрузить фото',
    empty: 'Фотографий пока нет',
    emptyHint: 'Нажмите «Загрузить» или перетащите файлы сюда',
    uploading: 'Загрузка...',
    deleteConfirm: 'Удалить фотографию?',
    uploadError: 'Ошибка загрузки',
    deleteError: 'Ошибка удаления',
    photos: (n: number) => `${n} фото`,
    dropHint: 'Отпустите для загрузки',
    // meta dialog
    metaTitle: 'Добавить фото',
    captionLabel: 'Описание (необязательно)',
    captionPlaceholder: 'Например: результат после процедуры...',
    visitLabel: 'Привязать к визиту (необязательно)',
    visitNone: 'Без привязки',
    confirm: 'Загрузить',
    cancel: 'Отмена',
    files: (n: number) => `${n} файл${n === 1 ? '' : n < 5 ? 'а' : 'ов'}`,
  },
  he: {
    title: 'גלריה',
    upload: 'העלה תמונה',
    empty: 'אין תמונות עדיין',
    emptyHint: 'לחץ "העלה" או גרור קבצים לכאן',
    uploading: 'מעלה...',
    deleteConfirm: 'למחוק את התמונה?',
    uploadError: 'שגיאת העלאה',
    deleteError: 'שגיאת מחיקה',
    photos: (n: number) => `${n} תמונות`,
    dropHint: 'שחרר להעלאה',
    metaTitle: 'הוסף תמונה',
    captionLabel: 'תיאור (אופציונלי)',
    captionPlaceholder: 'לדוגמה: תוצאה לאחר טיפול...',
    visitLabel: 'קשר לביקור (אופציונלי)',
    visitNone: 'ללא קישור',
    confirm: 'העלה',
    cancel: 'ביטול',
    files: (n: number) => `${n} קבצים`,
  },
}

function formatVisitLabel(v: Visit, locale: 'he' | 'ru'): string {
  const d = new Date(v.scheduled_at || v.created_at)
  const date = d.toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const time = d.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', {
    hour: '2-digit', minute: '2-digit',
  })
  return v.service_type ? `${date} ${time} — ${v.service_type}` : `${date} ${time}`
}

// ─── MetaDialog ──────────────────────────────────────────────────────────────
function MetaDialog({ files, visits, locale, onConfirm, onCancel }: MetaDialogProps) {
  const [caption, setCaption] = useState('')
  const [visitId, setVisitId] = useState('')
  const t = T[locale]
  const isHe = locale === 'he'

  const selectedVisit = visits.find(v => v.id === visitId)
  const visitLabelStr = selectedVisit ? formatVisitLabel(selectedVisit, locale) : ''

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        dir={isHe ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Upload className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{t.metaTitle}</h3>
            <p className="text-xs text-muted-foreground">{t.files(files.length)}</p>
          </div>
        </div>

        {/* Превью миниатюр */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {files.slice(0, 6).map((f, i) => (
            <img
              key={i}
              src={URL.createObjectURL(f)}
              alt=""
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-muted"
            />
          ))}
          {files.length > 6 && (
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xs text-muted-foreground font-medium">
              +{files.length - 6}
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
            <Hash className="w-3.5 h-3.5" />{t.captionLabel}
          </label>
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder={t.captionPlaceholder}
            className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        {/* Visit reference */}
        {visits.length > 0 && (
          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              <Link2 className="w-3.5 h-3.5" />{t.visitLabel}
            </label>
            <select
              value={visitId}
              onChange={e => setVisitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">{t.visitNone}</option>
              {visits.map(v => (
                <option key={v.id} value={v.id}>{formatVisitLabel(v, locale)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onConfirm(caption.trim(), visitId, visitLabelStr)}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ClientGalleryModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  const isOpen = isModalOpen('client-gallery')
  const data = getModalData('client-gallery')

  const [photos, setPhotos] = useState<Photo[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  // Pending files waiting for meta confirmation
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  // Visit detail opened from lightbox
  const [visitDetail, setVisitDetail] = useState<any>(null)
  const [visitDetailLoading, setVisitDetailLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const client = data?.client
  const locale: 'he' | 'ru' = data?.locale || 'ru'
  const isHe = locale === 'he'
  const clientName = client ? getClientName(client) : ''
  const t = T[locale]

  // ── Fetch photos & visits ─────────────────────────────────────────────────
  const fetchPhotos = useCallback(async () => {
    if (!client?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/photos`)
      if (res.ok) {
        const data: Photo[] = await res.json()
        // Сортировка: новые сверху
        setPhotos(data.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [client?.id])

  const fetchVisits = useCallback(async () => {
    if (!client?.id) return
    try {
      const res = await fetch(`/api/clients/${client.id}/visits`)
      if (res.ok) setVisits(await res.json())
    } catch { /* silent */ }
  }, [client?.id])

  useEffect(() => {
    if (isOpen && client?.id) { fetchPhotos(); fetchVisits() }
    else { setPhotos([]); setVisits([]) }
  }, [isOpen, client?.id, fetchPhotos, fetchVisits])

  // ── Open visit detail from lightbox ──────────────────────────────────────
  async function openVisitDetail(visitId: string) {
    setVisitDetailLoading(true)
    try {
      const res = await fetch(`/api/visits/${visitId}`)
      if (res.ok) {
        const data = await res.json()
        setVisitDetail(data.visit ?? data)
      } else {
        toast.error(locale === 'ru' ? 'Визит не найден' : 'הביקור לא נמצא')
      }
    } catch {
      toast.error(locale === 'ru' ? 'Ошибка загрузки' : 'שגיאה בטעינה')
    }
    setVisitDetailLoading(false)
  }

  // ── File selection → show meta dialog ────────────────────────────────────
  function handleFileSelect(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) return
    setPendingFiles(arr)
  }

  // ── After meta confirmed → compress & upload ──────────────────────────────
  async function handleConfirmMeta(caption: string, visitId: string, visitLabel: string) {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    setUploading(true)
    for (const raw of files) {
      try {
        const compressed = await compressImage(raw)
        const fd = new FormData()
        fd.append('file', compressed)
        if (caption)    fd.append('caption', caption)
        if (visitId)    fd.append('visit_id', visitId)
        if (visitLabel) fd.append('visit_label', visitLabel)
        const res = await fetch(`/api/clients/${client.id}/photos`, { method: 'POST', body: fd })
        if (!res.ok) throw new Error()
        const photo: Photo = await res.json()
        setPhotos(prev => [photo, ...prev])
      } catch {
        toast.error(t.uploadError)
      }
    }
    setUploading(false)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(photoId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t.deleteConfirm)) return
    try {
      const res = await fetch(
        `/api/clients/${client.id}/photos?photoId=${photoId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      if (lightboxIndex !== null) setLightboxIndex(null)
    } catch {
      toast.error(t.deleteError)
    }
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const closeLightbox = () => setLightboxIndex(null)
  const lightboxPrev  = () => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : photos.length - 1)
  const lightboxNext  = () => setLightboxIndex(i => i !== null && i < photos.length - 1 ? i + 1 : 0)

  useEffect(() => {
    if (lightboxIndex === null) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lightboxIndex])

  if (!isOpen || !client) return null

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  return (
    <>
      {/* ── Meta dialog (shown after file pick) ───────────────────────── */}
      {pendingFiles && (
        <MetaDialog
          files={pendingFiles}
          visits={visits}
          locale={locale}
          onConfirm={handleConfirmMeta}
          onCancel={() => setPendingFiles(null)}
        />
      )}

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
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Upload className="w-4 h-4" />}
            {uploading ? t.uploading : t.upload}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFileSelect(e.target.files)}
          />
        </div>

        {/* Drop zone + grid */}
        <div
          className={`relative min-h-[320px] p-5 transition-colors ${dragOver ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-background'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files) }}
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
              {/* Sorted newest first — already sorted by fetchPhotos */}
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setLightboxIndex(idx)}
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Images className="w-8 h-8 text-muted-foreground opacity-30" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                    <button
                      onClick={e => handleDelete(photo.id, e)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  {/* Caption / visit badge */}
                  {(photo.caption || photo.visit_label) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      {photo.visit_label && (
                        <p className="text-[9px] text-violet-300 truncate flex items-center gap-0.5">
                          <Link2 className="w-2.5 h-2.5 shrink-0" />{photo.visit_label}
                        </p>
                      )}
                      {photo.caption && (
                        <p className="text-white text-[10px] truncate">{photo.caption}</p>
                      )}
                    </div>
                  )}

                  {/* Date badge top-left */}
                  <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] bg-black/60 text-white rounded px-1.5 py-0.5">
                      {new Date(photo.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', {
                        day: '2-digit', month: '2-digit',
                      })}
                    </span>
                  </div>
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
      {currentPhoto?.url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/92 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={e => { e.stopPropagation(); closeLightbox() }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && <>
            <button
              onClick={e => { e.stopPropagation(); lightboxPrev() }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); lightboxNext() }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>}

          <img
            src={currentPhoto.url}
            alt={currentPhoto.file_name}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {/* Visit reference — кликабельная ссылка на визит */}
            {currentPhoto.visit_label && (
              <button
                onClick={e => { e.stopPropagation(); if (currentPhoto.visit_id) { setLightboxIndex(null); openVisitDetail(currentPhoto.visit_id) } }}
                disabled={visitDetailLoading}
                className="text-violet-300 hover:text-violet-100 text-xs bg-black/50 hover:bg-black/70 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
                title={locale === 'ru' ? 'Открыть карточку визита' : 'פתח כרטיס ביקור'}
              >
                {visitDetailLoading
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <ExternalLink className="w-3 h-3" />}
                {currentPhoto.visit_label}
              </button>
            )}
            {/* Caption */}
            {currentPhoto.caption && (
              <p className="text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                {currentPhoto.caption}
              </p>
            )}
            {/* Date */}
            <p className="text-white/40 text-xs">
              {new Date(currentPhoto.created_at).toLocaleDateString(
                isHe ? 'he-IL' : 'ru-RU',
                { day: '2-digit', month: '2-digit', year: 'numeric' }
              )}
            </p>
            <button
              onClick={e => handleDelete(currentPhoto.id, e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isHe ? 'מחק' : 'Удалить'}
            </button>
            {photos.length > 1 && (
              <p className="text-white/40 text-xs">{lightboxIndex! + 1} / {photos.length}</p>
            )}
          </div>
        </div>
      )}
      {/* Visit Detail Modal — открывается из лайтбокса по клику на visit_label */}
      {visitDetail && (
        <VisitDetailModal
          visit={visitDetail}
          isOpen={!!visitDetail}
          onClose={() => setVisitDetail(null)}
          locale={locale}
          clientName={clientName}
          clientPhone={visitDetail?.clients?.phone ?? visitDetail?.client_phone ?? ''}
          onStart={() => {}}
          onComplete={() => {}}
          onCancel={() => {}}
          onEdit={() => {}}
        />
      )}
    </>
  )
}
