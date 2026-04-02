'use client'

import { useState, useRef, useTransition } from 'react'
import { z } from 'zod'
import {
  Globe, Search, Share2, CheckCircle2,
  AlertCircle, Upload, X, Loader2,
} from 'lucide-react'
import { saveWebsiteSettings, type WebsiteSettingsInput } from '@/app/actions/website-settings'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ─── Validation ───────────────────────────────────────────────────────────────
const schema = z.object({
  hero_title:      z.string().max(255).optional().nullable(),
  hero_subtitle:   z.string().max(1000).optional().nullable(),
  hero_image_url:  z.string().optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
  social_links: z.object({
    instagram: z.string().optional().nullable(),
    facebook:  z.string().optional().nullable(),
    whatsapp:  z.string().optional().nullable(),
  }).optional().default({}),
})

type FormValues = z.infer<typeof schema>

const BUCKET = 'website_assets'
const inputCls  = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all'
const textareaCls = inputCls + ' resize-none'

interface Props { initial: WebsiteSettingsInput | null }

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, error, hint, children }: {
  label: string; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

// ─── Image uploader ───────────────────────────────────────────────────────────
function HeroImageUploader({ value, onChange }: {
  value?: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Только изображения (JPG, PNG, WebP)'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Максимальный размер — 5 МБ'); return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `hero/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer transition-all
          ${value ? 'h-44' : 'h-32'}
          ${uploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Hero preview" className="w-full h-full object-cover rounded-2xl" />
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null) }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-indigo-500">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-sm font-medium">Загрузка...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload className="w-7 h-7" />
            <span className="text-sm font-medium">Перетащите или нажмите для загрузки</span>
            <span className="text-xs">JPG, PNG, WebP — до 5 МБ</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>
      {uploadError && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}
    </div>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveButton({ isPending }: { isPending: boolean }) {
  return (
    <button type="submit" disabled={isPending}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all">
      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      {isPending ? 'Сохраняю...' : 'Сохранить и опубликовать'}
    </button>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────
export function WebsiteSettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult]  = useState<{ success: boolean; error?: string; revalidated?: boolean } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const sl = initial?.social_links as Record<string, string> | undefined

  const [values, setValues] = useState<FormValues>({
    hero_title:      initial?.hero_title      ?? '',
    hero_subtitle:   initial?.hero_subtitle   ?? '',
    hero_image_url:  initial?.hero_image_url  ?? '',
    seo_description: initial?.seo_description ?? '',
    social_links: {
      instagram: sl?.instagram ?? '',
      facebook:  sl?.facebook  ?? '',
      whatsapp:  sl?.whatsapp  ?? '',
    },
  })

  function set<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues(prev => ({ ...prev, [key]: val }))
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }
  function setSocial(key: string, val: string) {
    setValues(prev => ({ ...prev, social_links: { ...prev.social_links, [key]: val } }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.')] = issue.message
      }
      setFieldErrors(errs)
      return
    }
    setResult(null)
    setFieldErrors({})
    startTransition(async () => {
      const res = await saveWebsiteSettings(parsed.data as WebsiteSettingsInput)
      setResult(res)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xl shadow-lg">🌐</div>
          <div>
            <h1 className="text-lg md:text-2xl font-black text-gray-900 leading-tight">Настройки сайта</h1>
            <p className="text-xs text-gray-400 mt-0.5">Управление контентом витрины Beautymania</p>
          </div>
        </div>
        <div className="hidden md:block"><SaveButton isPending={isPending} /></div>
      </div>

      {/* ── Status banner ── */}
      {result && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium border ${
          result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>
            {result.success
              ? result.revalidated ? '✅ Сохранено — сайт обновлён' : '✅ Сохранено (сайт обновится за ~60 сек)'
              : `❌ ${result.error}`}
          </span>
        </div>
      )}

      {/* ── Hero ── */}
      <Section icon={Globe} title="Главный экран (Hero)">
        <Field label="Главный заголовок" error={fieldErrors['hero_title']}>
          <input value={values.hero_title ?? ''} onChange={e => set('hero_title', e.target.value)}
            placeholder="Ваш лучший салон красоты" className={inputCls} />
        </Field>
        <Field label="Подзаголовок" error={fieldErrors['hero_subtitle']}>
          <textarea value={values.hero_subtitle ?? ''} onChange={e => set('hero_subtitle', e.target.value)}
            rows={3} placeholder="Краткое описание под заголовком" className={textareaCls} />
        </Field>
        <Field label="Фоновое изображение" hint="Загружается в Supabase Storage → public URL">
          <HeroImageUploader value={values.hero_image_url}
            onChange={url => set('hero_image_url', url)} />
        </Field>
      </Section>

      {/* ── SEO ── */}
      <Section icon={Search} title="SEO настройки">
        <Field label="Meta Description" error={fieldErrors['seo_description']}
          hint={`${(values.seo_description ?? '').length}/500 символов`}>
          <textarea value={values.seo_description ?? ''} onChange={e => set('seo_description', e.target.value)}
            rows={3} placeholder="Краткое описание сайта для поисковиков (до 160 символов рекомендуется)" className={textareaCls} />
        </Field>
      </Section>

      {/* ── Social ── */}
      <Section icon={Share2} title="Социальные сети">
        <Field label="Instagram" error={fieldErrors['social_links.instagram']}>
          <input value={(values.social_links as Record<string,string>)?.instagram ?? ''}
            onChange={e => setSocial('instagram', e.target.value)}
            placeholder="https://instagram.com/beautymania" className={inputCls} />
        </Field>
        <Field label="Facebook" error={fieldErrors['social_links.facebook']}>
          <input value={(values.social_links as Record<string,string>)?.facebook ?? ''}
            onChange={e => setSocial('facebook', e.target.value)}
            placeholder="https://facebook.com/beautymania" className={inputCls} />
        </Field>
        <Field label="WhatsApp (номер)" error={fieldErrors['social_links.whatsapp']}>
          <input value={(values.social_links as Record<string,string>)?.whatsapp ?? ''}
            onChange={e => setSocial('whatsapp', e.target.value)}
            placeholder="+972501234567" className={inputCls} />
        </Field>
      </Section>

      {/* ── Mobile save button ── */}
      <div className="pb-4 md:hidden">
        <SaveButton isPending={isPending} />
      </div>
    </form>
  )
}
