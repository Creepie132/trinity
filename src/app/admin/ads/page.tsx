'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useAdStats, useAdCampaigns, useCreateAdCampaign,
  useToggleAdActive, useDeleteAdCampaign, uploadBanner,
} from '@/hooks/useAdmin'
import {
  Megaphone, Plus, Trash, TrendingUp, MousePointerClick, Eye,
  CheckCircle2, Clock, XCircle, Upload, ImageIcon, Link2,
  Tag, CalendarRange, ArrowLeft, ArrowRight, ExternalLink, Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import { AdCampaign } from '@/types/database'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── i18n strings (inline, not from t() because wizard components need them as props) ──

const I18N = {
  he: {
    steps: ['פרטי מפרסם', 'באנר', 'טרגוט ותאריכים'],
    newCampaign: 'קמפיין פרסומי חדש',
    advertiserName: 'שם המפרסם',
    advertiserPlaceholder: 'למשל: חברת ABC',
    targetLink: 'קישור יעד',
    linkPlaceholder: 'https://example.com',
    linkHint: 'הלינק שנפתח כשמשתמש לוחץ על הבאנר',
    bannerImage: 'תמונת באנר',
    dragHere: 'גרור תמונה לכאן',
    orClick: 'או לחץ לבחירת קובץ',
    maxSize: 'JPG, PNG, WebP · מקסימום 5MB',
    bannerRatio: 'יחס מומלץ: 800×320px',
    uploading: 'מעלה...',
    uploaded: 'הועלה בהצלחה',
    targetCategories: 'קטגוריות יעד',
    categoriesHint: 'השאר ריק להצגה לכל הלקוחות',
    startDate: 'תאריך התחלה',
    endDate: 'תאריך סיום',
    summary: 'סיכום קמפיין',
    advertiser: 'מפרסם',
    period: 'תקופה',
    categories: 'קטגוריות',
    allClients: 'כל הלקוחות',
    cancel: 'ביטול',
    back: 'חזור',
    next: 'הבא',
    create: 'צור קמפיין',
    saving: 'שומר...',
    previewLabel: 'תצוגה מקדימה',
    previewInSidebar: 'תצוגה בסייבר',
    advertiserDisplay: 'הבאנר יוצג בשם',
    deleteConfirm: 'למחוק את הקמפיין',
    allCampaigns: 'כל הקמפיינים',
    newCampaignBtn: 'קמפיין חדש',
    pageTitle: 'ניהול פרסומות',
    pageSubtitle: 'קמפיינים ובאנרים פרסומיים',
    activeCampaigns: 'קמפיינים פעילים',
    monthClicks: 'קליקים החודש',
    avgCtr: 'CTR ממוצע',
    statusActive: 'פעיל',
    statusScheduled: 'מתוזמן',
    statusExpired: 'הסתיים',
    statusInactive: 'לא פעיל',
    allTargets: 'הכל',
    noCampaigns: 'אין קמפיינים עדיין',
    noCampaignsHint: 'לחץ "קמפיין חדש" כדי להוסיף',
    colAdvertiser: 'מפרסם', colBanner: 'באנר', colCategories: 'קטגוריות',
    colDates: 'תאריכים', colClicks: 'קליקים', colImpressions: 'חשיפות',
    colStatus: 'סטטוס', colActions: 'פעולות',
    until: 'עד',
    errorTitle: 'שגיאה בטעינת נתונים',
    retry: 'נסה שוב',
  },
  ru: {
    steps: ['Рекламодатель', 'Баннер', 'Таргет и даты'],
    newCampaign: 'Новая рекламная кампания',
    advertiserName: 'Название рекламодателя',
    advertiserPlaceholder: 'Например: Компания ABC',
    targetLink: 'Целевая ссылка',
    linkPlaceholder: 'https://example.com',
    linkHint: 'Ссылка, которая открывается при клике на баннер',
    bannerImage: 'Изображение баннера',
    dragHere: 'Перетащите изображение сюда',
    orClick: 'или нажмите для выбора файла',
    maxSize: 'JPG, PNG, WebP · максимум 5MB',
    bannerRatio: 'Рекомендуемый размер: 800×320px',
    uploading: 'Загрузка...',
    uploaded: 'Загружено успешно',
    targetCategories: 'Целевые категории',
    categoriesHint: 'Оставьте пустым для показа всем клиентам',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    summary: 'Сводка кампании',
    advertiser: 'Рекламодатель',
    period: 'Период',
    categories: 'Категории',
    allClients: 'Все клиенты',
    cancel: 'Отмена',
    back: 'Назад',
    next: 'Далее',
    create: 'Создать кампанию',
    saving: 'Сохранение...',
    previewLabel: 'Предпросмотр',
    previewInSidebar: 'Вид в сайдбаре',
    advertiserDisplay: 'Баннер будет показан от имени',
    deleteConfirm: 'Удалить кампанию',
    allCampaigns: 'Все кампании',
    newCampaignBtn: 'Новая кампания',
    pageTitle: 'Управление рекламой',
    pageSubtitle: 'Рекламные кампании и баннеры',
    activeCampaigns: 'Активных кампаний',
    monthClicks: 'Кликов за месяц',
    avgCtr: 'Средний CTR',
    statusActive: 'Активна',
    statusScheduled: 'Запланирована',
    statusExpired: 'Истекла',
    statusInactive: 'Неактивна',
    allTargets: 'Все',
    noCampaigns: 'Кампаний пока нет',
    noCampaignsHint: 'Нажмите "Новая кампания" чтобы добавить',
    colAdvertiser: 'Рекламодатель', colBanner: 'Баннер', colCategories: 'Категории',
    colDates: 'Даты', colClicks: 'Клики', colImpressions: 'Показы',
    colStatus: 'Статус', colActions: 'Действия',
    until: 'до',
    errorTitle: 'Ошибка загрузки данных',
    retry: 'Попробовать снова',
  },
}

type Strings = typeof I18N.he


// ─── Categories (bilingual) ───────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'salon',      he: '💇 סלון יופי',  ru: '💇 Салон красоты',  color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'carwash',    he: '🚗 שטיפת רכב',  ru: '🚗 Автомойка',      color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'clinic',     he: '🏥 קליניקה',    ru: '🏥 Клиника',        color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'restaurant', he: '🍕 מסעדה',      ru: '🍕 Ресторан',       color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'gym',        he: '💪 כושר',       ru: '💪 Спортзал',       color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'other',      he: '⚡ אחר',         ru: '⚡ Другое',          color: 'bg-gray-50 border-gray-200 text-gray-700' },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, s }: { current: number; s: Strings }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-2">
      {s.steps.map((label, idx) => {
        const id = idx + 1
        const isActive = id === current
        const isDone = id < current
        const icons = [Megaphone, ImageIcon, CalendarRange]
        const Icon = icons[idx]
        return (
          <div key={id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                ${isDone ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : isActive ? 'bg-white/20 border-2 border-white' : 'bg-white/10 border border-white/30'}
              `}>
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : <Icon className="w-4 h-4 text-white" />
                }
              </div>
              <span className={`text-[10px] font-medium text-white transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {label}
              </span>
            </div>
            {idx < s.steps.length - 1 && (
              <div className={`w-10 h-0.5 mb-5 rounded-full transition-all duration-500 ${isDone ? 'bg-white/70' : 'bg-white/20'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}


// ─── Sidebar Preview ─────────────────────────────────────────────────────────

function SidebarPreview({ bannerUrl, advertiserName, s }: { bannerUrl: string; advertiserName: string; s: Strings }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm w-44 flex-shrink-0">
      <div className="bg-gray-50 px-2 py-1 border-b border-gray-100">
        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">{s.previewInSidebar}</p>
      </div>
      <div className="bg-white">
        {bannerUrl ? (
          <img src={bannerUrl} alt="preview" className="w-full h-20 object-cover" />
        ) : (
          <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-300" />
          </div>
        )}
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded shrink-0">פרסומת</span>
            <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[70px]">
              {advertiserName || '—'}
            </span>
          </div>
          <ExternalLink className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}

// ─── Drag & Drop Banner Upload ────────────────────────────────────────────────

function BannerUploader({ value, onChange, uploading, setUploading, s }: {
  value: string; onChange: (url: string) => void
  uploading: boolean; setUploading: (v: boolean) => void; s: Strings
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return }
    try {
      setUploading(true)
      const url = await uploadBanner(file)
      onChange(url)
    } catch (e: any) { alert(e.message) }
    finally { setUploading(false) }
  }, [onChange, setUploading])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-3">
      <div
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden
          ${dragOver ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' : value ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer'}`}
      >
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-600 font-medium">{s.uploading}</p>
            </div>
          </div>
        )}
        {value ? (
          <div className="relative">
            <img src={value} alt="banner" className="w-full h-40 object-cover" />
            <button onClick={e => { e.stopPropagation(); onChange(''); inputRef.current?.click() }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all hover:scale-110">
              <Upload className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
              <p className="text-white text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {s.uploaded}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all ${dragOver ? 'bg-indigo-100 scale-110' : 'bg-gray-100'}`}>
              <Upload className={`w-6 h-6 ${dragOver ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <p className="text-sm font-medium text-gray-700">{s.dragHere}</p>
            <p className="text-xs text-gray-400 mt-1">{s.orClick}</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <span className="text-[11px] font-bold text-indigo-600">5:2</span>
              <span className="text-[10px] text-indigo-500">{s.bannerRatio}</span>
            </div>
            <p className="text-[10px] text-gray-300 mt-2">{s.maxSize}</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}


// ─── Wizard Dialog ────────────────────────────────────────────────────────────

interface CampaignForm {
  advertiser_name: string; banner_url: string; click_url: string
  target_modules: string[]; start_date: string; end_date: string
}
const EMPTY_FORM: CampaignForm = {
  advertiser_name: '', banner_url: '', click_url: '',
  target_modules: [], start_date: '', end_date: '',
}

function CreateCampaignWizard({ open, onClose, s, lang }: {
  open: boolean; onClose: () => void; s: Strings; lang: 'he' | 'ru'
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const createCampaign = useCreateAdCampaign()

  const update = (key: keyof CampaignForm, val: any) => setForm(f => ({ ...f, [key]: val }))
  const toggleCat = (cat: string) => update('target_modules',
    form.target_modules.includes(cat)
      ? form.target_modules.filter(c => c !== cat)
      : [...form.target_modules, cat]
  )
  const canProceed = () => {
    if (step === 1) return form.advertiser_name.trim().length > 0 && form.click_url.trim().length > 0
    if (step === 2) return form.banner_url.length > 0
    if (step === 3) return !!form.start_date && !!form.end_date
    return false
  }
  const handleSubmit = async () => {
    await createCampaign.mutateAsync(form)
    setForm(EMPTY_FORM); setStep(1); onClose()
  }
  const handleClose = () => { setForm(EMPTY_FORM); setStep(1); onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0" dir={lang === 'he' ? 'rtl' : 'ltr'}>

        {/* Gradient header — step indicator on colored bg so it's always visible */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 pt-5 pb-4">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 opacity-80" />
              {s.newCampaign}
            </DialogTitle>
          </DialogHeader>
          <StepIndicator current={step} s={s} />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[320px]">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                  {s.advertiserName} *
                </Label>
                <Input autoFocus value={form.advertiser_name}
                  onChange={e => update('advertiser_name', e.target.value)}
                  placeholder={s.advertiserPlaceholder}
                  className="h-11 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                  {s.targetLink} *
                </Label>
                <Input type="url" value={form.click_url}
                  onChange={e => update('click_url', e.target.value)}
                  placeholder={s.linkPlaceholder}
                  className="h-11 border-gray-200 focus:border-indigo-400" dir="ltr"
                />
                <p className="text-xs text-gray-400">{s.linkHint}</p>
              </div>
              {form.advertiser_name && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <p className="text-xs text-indigo-700">{s.advertiserDisplay}: <strong>{form.advertiser_name}</strong></p>
                </div>
              )}
            </div>
          )}


          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                {s.bannerImage} *
              </Label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <BannerUploader value={form.banner_url} onChange={url => update('banner_url', url)}
                    uploading={uploading} setUploading={setUploading} s={s} />
                </div>
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <p className="text-xs text-gray-400 font-medium">{s.previewLabel}</p>
                  <SidebarPreview bannerUrl={form.banner_url} advertiserName={form.advertiser_name} s={s} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  {s.targetCategories}
                </Label>
                <p className="text-xs text-gray-400">{s.categoriesHint}</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const isSelected = form.target_modules.includes(cat.value)
                    return (
                      <button key={cat.value} type="button" onClick={() => toggleCat(cat.value)}
                        className={`px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150 text-right
                          ${isSelected ? `${cat.color} border-current shadow-sm scale-[1.02]` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {lang === 'he' ? cat.he : cat.ru}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />
                    {s.startDate} *
                  </Label>
                  <Input type="date" value={form.start_date}
                    onChange={e => update('start_date', e.target.value)}
                    className="h-11 border-gray-200 focus:border-indigo-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">{s.endDate} *</Label>
                  <Input type="date" value={form.end_date} min={form.start_date}
                    onChange={e => update('end_date', e.target.value)}
                    className="h-11 border-gray-200 focus:border-indigo-400" />
                </div>
              </div>
              {form.start_date && form.end_date && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
                  <p className="text-xs font-semibold text-emerald-800 mb-1.5">✅ {s.summary}</p>
                  <div className="text-xs text-emerald-700 space-y-0.5">
                    <p>• {s.advertiser}: <strong>{form.advertiser_name}</strong></p>
                    <p>• {s.period}: {form.start_date} → {form.end_date}</p>
                    <p>• {s.categories}: {form.target_modules.length === 0 ? s.allClients : form.target_modules.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="ghost" onClick={step === 1 ? handleClose : () => setStep(s => s - 1)}
            className="gap-1.5 text-gray-600">
            {step === 1 ? s.cancel : <><ArrowRight className="w-4 h-4" />{s.back}</>}
          </Button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300
                ${i === step ? 'w-5 h-2 bg-indigo-600' : i < step ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-gray-200'}`} />
            ))}
          </div>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              {s.next} <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || createCampaign.isPending || uploading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 min-w-[130px]">
              {createCampaign.isPending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{s.saving}</>
                : <><CheckCircle2 className="w-4 h-4" />{s.create}</>
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────

function AdsPageContent() {
  const { language } = useLanguage()
  const s = I18N[language] ?? I18N.he
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: stats } = useAdStats()
  const { data: campaigns, isLoading, error } = useAdCampaigns()
  const toggleActive = useToggleAdActive()
  const deleteCampaign = useDeleteAdCampaign()

  const handleToggle = (id: string, isActive: boolean) => toggleActive.mutate({ id, isActive })
  const handleDelete = (id: string, name: string) => {
    if (confirm(`${s.deleteConfirm} "${name}"?`)) deleteCampaign.mutate(id)
  }

  const getStatus = (c: AdCampaign) => {
    const now = new Date()
    if (!c.is_active)                                      return { label: s.statusInactive,  icon: XCircle,       color: 'text-gray-400' }
    if (c.start_date && now < new Date(c.start_date))     return { label: s.statusScheduled, icon: Clock,         color: 'text-amber-600' }
    if (c.end_date   && now > new Date(c.end_date))       return { label: s.statusExpired,   icon: XCircle,       color: 'text-gray-400' }
    return                                                        { label: s.statusActive,    icon: CheckCircle2,  color: 'text-emerald-600' }
  }

  if (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-800 font-semibold mb-1">{s.errorTitle}</p>
        <p className="text-red-600 text-sm">{msg}</p>
        <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">{s.retry}</Button>
      </div>
    )
  }

  const statCards = [
    { label: s.activeCampaigns, value: stats?.activeCampaigns ?? 0,  icon: Megaphone,        color: 'emerald' },
    { label: s.monthClicks,     value: stats?.monthClicks ?? 0,       icon: MousePointerClick, color: 'blue' },
    { label: s.avgCtr,          value: `${stats?.avgCtr ?? '0.00'}%`, icon: TrendingUp,       color: 'purple' },
  ]

  return (
    <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{s.pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">{s.pageSubtitle}</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
          <Plus className="w-4 h-4" />{s.newCampaignBtn}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-3xl font-bold text-${color}-600 mt-1`}>{value}</p>
                </div>
                <div className={`bg-${color}-100 p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* Campaigns */}
      <Card>
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-indigo-500" />
            {s.allCampaigns}
            {campaigns && <Badge variant="secondary" className="mr-2 text-xs">{campaigns.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">{s.noCampaigns}</p>
              <p className="text-gray-300 text-sm mt-1">{s.noCampaignsHint}</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-50">
                {campaigns.map((c: AdCampaign) => {
                  const st = getStatus(c); const SI = st.icon
                  return (
                    <div key={c.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img src={c.banner_url} alt="" className="w-16 h-10 object-cover rounded-lg border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{c.advertiser_name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.click_url}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                          <SI className="w-3 h-3" />{st.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!c.is_active} onCheckedChange={v => handleToggle(c.id, v)} />
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id, c.advertiser_name)} className="mr-auto">
                          <Trash className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      {[s.colAdvertiser, s.colBanner, s.colCategories, s.colDates, s.colStatus, s.colActions].map(h => (
                        <TableHead key={h} className="text-right font-semibold">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c: AdCampaign) => {
                      const st = getStatus(c); const SI = st.icon
                      return (
                        <TableRow key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <p className="font-semibold text-gray-800">{c.advertiser_name}</p>
                            <a href={c.click_url ?? '#'} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5">
                              {(c.click_url ?? '').replace(/^https?:\/\//, '').slice(0, 28)}<ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <img src={c.banner_url} alt="" className="w-20 h-12 object-cover rounded-lg border shadow-sm" />
                          </TableCell>
                          <TableCell>
                            {!c.target_modules || c.target_modules.length === 0
                              ? <Badge variant="outline" className="text-xs">{s.allTargets}</Badge>
                              : <div className="flex flex-wrap gap-1">
                                  {c.target_modules.map(cat => <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>)}
                                </div>
                            }
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">{c.start_date ? format(new Date(c.start_date), 'dd/MM/yy') : '—'}</p>
                            <p className="text-xs text-gray-400">{s.until} {c.end_date ? format(new Date(c.end_date), 'dd/MM/yy') : '—'}</p>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 text-sm font-medium ${st.color}`}>
                              <SI className="w-3.5 h-3.5" />{st.label}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={!!c.is_active} onCheckedChange={v => handleToggle(c.id, v)} />
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id, c.advertiser_name)} className="hover:bg-red-50">
                                <Trash className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateCampaignWizard open={wizardOpen} onClose={() => setWizardOpen(false)} s={s} lang={language} />
    </div>
  )
}

export default function AdsPage() {
  return <ErrorBoundary><AdsPageContent /></ErrorBoundary>
}
