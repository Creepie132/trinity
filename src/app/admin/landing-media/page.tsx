'use client'

import { useState, useEffect, useRef } from 'react'
import { Image as ImageIcon, Upload, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface Screenshot {
  slot: number
  url: string
  alt_he: string
  alt_ru: string
}

export default function LandingMediaPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [uploading, setUploading] = useState<number | null>(null)
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/pricing-config').then(r=>r.json()).then(d => {
      const shots: Screenshot[] = d.landing_screenshots || [
        {slot:1,url:'/screenshot-1.jpg',alt_he:'צילום מסך 1',alt_ru:'Скриншот 1'},
        {slot:2,url:'/screenshot-2.jpg',alt_he:'צילום מסך 2',alt_ru:'Скриншот 2'},
        {slot:3,url:'/screenshot-3.jpg',alt_he:'צילום מסך 3',alt_ru:'Скриншот 3'},
        {slot:4,url:'/screenshot-4.jpg',alt_he:'צילום מסך 4',alt_ru:'Скриншот 4'},
      ]
      setScreenshots(shots)
    }).catch(()=>toast.error(l?'שגיאה':'Ошибка'))
  }, [])

  const handleFileSelect = async (slot: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(l?'קבצי תמונה בלבד':'Только изображения'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(l?'מקסימום 5MB':'Максимум 5MB'); return
    }

    // Local preview
    const reader = new FileReader()
    reader.onload = e => setPreviews(p => ({ ...p, [slot]: e.target?.result as string }))
    reader.readAsDataURL(file)

    setUploading(slot)
    try {
      const form = new FormData()
      form.append('slot', String(slot))
      form.append('file', file)

      const res = await fetch('/api/admin/landing-screenshot', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setScreenshots(prev => prev.map(s => s.slot === slot ? { ...s, url: data.url } : s))
      toast.success(l?`✓ צילום מסך ${slot} עודכן`:`✓ Скриншот ${slot} обновлён`)
    } catch (err: any) {
      toast.error(err.message || (l?'שגיאה':'Ошибка'))
      setPreviews(p => { const n={...p}; delete n[slot]; return n })
    } finally {
      setUploading(null)
    }
  }

  const handleDrop = (slot: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(slot, file)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ImageIcon className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {l?'מדיה לנדינג':'Медиа лендинга'}
          </h1>
          <p className="text-sm text-slate-500">
            {l?'החלפת צילומי מסך בגלריית הפרויקטים':'Замена скриншотов в галерее проектов'}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">{l?'שינויים מתעדכנים באופן מיידי':'Изменения применяются немедленно'}</p>
          <p className="text-blue-600">
            {l
              ? 'התמונות יופיעו בגלריה של הלנדינג מיד לאחר ההעלאה. גודל מקסימלי: 5MB. פורמטים: JPG, PNG, WebP.'
              : 'Изображения появятся в галерее лендинга сразу после загрузки. Максимум 5MB. Форматы: JPG, PNG, WebP.'}
          </p>
        </div>
      </div>

      {/* Screenshots grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(screenshots.length > 0 ? screenshots : [1,2,3,4].map(slot=>({slot,url:`/screenshot-${slot}.jpg`,alt_he:`צילום מסך ${slot}`,alt_ru:`Скриншот ${slot}`}))).map(shot => {
          const isUploading = uploading === shot.slot
          const previewUrl = previews[shot.slot] || shot.url

          return (
            <div key={shot.slot}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              onDrop={handleDrop(shot.slot)}
              onDragOver={handleDragOver}>

              {/* Slot label */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {l?`צילום מסך ${shot.slot}`:`Скриншот ${shot.slot}`}
                </span>
                {previews[shot.slot] && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={12}/>{l?'עודכן':'Обновлён'}
                  </span>
                )}
              </div>

              {/* Image preview */}
              <div className="relative">
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={l ? shot.alt_he : shot.alt_ru}
                    className="w-full h-full object-cover transition-opacity"
                    onError={e => { (e.target as HTMLImageElement).src = '/screenshot-placeholder.jpg' }}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">
                          {l?'מעלה...':'Загружаю...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drag overlay */}
                <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors rounded-none flex items-center justify-center pointer-events-none">
                  <p className="text-amber-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
                    {l?'גרור תמונה לכאן':'Перетащи изображение сюда'}
                  </p>
                </div>
              </div>

              {/* Upload button */}
              <div className="p-4">
                <input
                  ref={el => { inputRefs.current[shot.slot] = el }}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if(f) handleFileSelect(shot.slot, f); e.target.value='' }}
                />
                <button
                  disabled={isUploading}
                  onClick={() => inputRefs.current[shot.slot]?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-slate-200 hover:border-amber-400 text-slate-500 hover:text-amber-600 rounded-xl text-sm font-semibold transition-all hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                  {isUploading
                    ? <><Loader2 size={16} className="animate-spin"/>{l?'מעלה...':'Загружаю...'}</>
                    : <><Upload size={16}/>{l?`החלף צילום מסך ${shot.slot}`:`Заменить скриншот ${shot.slot}`}</>
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
