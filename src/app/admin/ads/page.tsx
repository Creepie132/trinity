'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAdStats,
  useAdCampaigns,
  useCreateAdCampaign,
  useToggleAdActive,
  useDeleteAdCampaign,
  uploadBanner,
} from '@/hooks/useAdmin'
import {
  Megaphone,
  Plus,
  Trash,
  TrendingUp,
  MousePointerClick,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  ImageIcon,
  Link2,
  Tag,
  CalendarRange,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { AdCampaign } from '@/types/database'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Wizard Steps ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'פרטי מפרסם', icon: Megaphone },
  { id: 2, label: 'באנר', icon: ImageIcon },
  { id: 3, label: 'טרגוט ותאריכים', icon: CalendarRange },
]

const CATEGORIES = [
  { value: 'salon', label: '💇 סלון יופי', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'carwash', label: '🚗 שטיפת רכב', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'clinic', label: '🏥 קליניקה', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'restaurant', label: '🍕 מסעדה', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'gym', label: '💪 כושר', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'other', label: '⚡ אחר', color: 'bg-gray-50 border-gray-200 text-gray-700' },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const isActive = step.id === current
        const isDone = step.id < current
        const Icon = step.icon
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                ${isDone ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-gray-100'}
              `}>
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                }
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-10 h-0.5 mb-4 rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}


// ─── Sidebar Preview ─────────────────────────────────────────────────────────

function SidebarPreview({ bannerUrl, advertiserName }: { bannerUrl: string; advertiserName: string }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm w-48">
      <div className="bg-gray-50 px-2 py-1 border-b border-gray-100">
        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">תצוגה בסייבר</p>
      </div>
      <div className="bg-white">
        {bannerUrl ? (
          <div className="relative overflow-hidden group cursor-pointer">
            <img src={bannerUrl} alt="preview" className="w-full h-20 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-300" />
          </div>
        )}
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">פרסומת</span>
            <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[80px]">
              {advertiserName || 'שם מפרסם'}
            </span>
          </div>
          <ExternalLink className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}


// ─── Drag & Drop Banner Upload ────────────────────────────────────────────────

function BannerUploader({ value, onChange, uploading, setUploading }: {
  value: string
  onChange: (url: string) => void
  uploading: boolean
  setUploading: (v: boolean) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { alert('אנא העלה קובץ תמונה'); return }
    if (file.size > 5 * 1024 * 1024) { alert('מקסימום 5MB'); return }
    try {
      setUploading(true)
      const url = await uploadBanner(file)
      onChange(url)
    } catch (e: any) {
      alert(`שגיאה: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }, [onChange, setUploading])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-3">
      <div
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden
          ${dragOver ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' : value ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 cursor-pointer'}
        `}
      >
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-600 font-medium">מעלה...</p>
            </div>
          </div>
        )}
        {value ? (
          <div className="relative">
            <img src={value} alt="banner" className="w-full h-40 object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onChange(''); inputRef.current?.click() }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all hover:scale-110"
            >
              <Upload className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
              <p className="text-white text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> הועלה בהצלחה
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-200 ${dragOver ? 'bg-indigo-100 scale-110' : 'bg-gray-100'}`}>
              <Upload className={`w-6 h-6 ${dragOver ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <p className="text-sm font-medium text-gray-700">גרור תמונה לכאן</p>
            <p className="text-xs text-gray-400 mt-1">או לחץ לבחירת קובץ</p>
            <p className="text-[10px] text-gray-300 mt-2">JPG, PNG, WebP · מקסימום 5MB</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}


// ─── Create Campaign Wizard Dialog ───────────────────────────────────────────

interface CampaignForm {
  advertiser_name: string
  banner_url: string
  link_url: string
  target_categories: string[]
  start_date: string
  end_date: string
}

const EMPTY_FORM: CampaignForm = {
  advertiser_name: '',
  banner_url: '',
  link_url: '',
  target_categories: [],
  start_date: '',
  end_date: '',
}

function CreateCampaignWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [animDir, setAnimDir] = useState<'left' | 'right'>('right')
  const createCampaign = useCreateAdCampaign()

  const update = (key: keyof CampaignForm, val: any) =>
    setForm(f => ({ ...f, [key]: val }))

  const toggleCategory = (cat: string) =>
    update('target_categories',
      form.target_categories.includes(cat)
        ? form.target_categories.filter(c => c !== cat)
        : [...form.target_categories, cat]
    )

  const goNext = () => { setAnimDir('right'); setStep(s => s + 1) }
  const goPrev = () => { setAnimDir('left'); setStep(s => s - 1) }

  const canProceed = () => {
    if (step === 1) return form.advertiser_name.trim().length > 0 && form.link_url.trim().length > 0
    if (step === 2) return form.banner_url.length > 0
    if (step === 3) return form.start_date && form.end_date
    return false
  }

  const handleSubmit = async () => {
    await createCampaign.mutateAsync(form)
    setForm(EMPTY_FORM)
    setStep(1)
    onClose()
  }

  const handleClose = () => {
    setForm(EMPTY_FORM)
    setStep(1)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 pt-5 pb-6">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-white/80" />
              קמפיין פרסומי חדש
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <StepIndicator current={step} total={3} />
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 min-h-[320px]">

          {/* Step 1: Advertiser info */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                  שם המפרסם *
                </Label>
                <Input
                  autoFocus
                  value={form.advertiser_name}
                  onChange={e => update('advertiser_name', e.target.value)}
                  placeholder="למשל: חברת ABC"
                  className="h-11 text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                  קישור יעד *
                </Label>
                <Input
                  type="url"
                  value={form.link_url}
                  onChange={e => update('link_url', e.target.value)}
                  placeholder="https://example.com"
                  className="h-11 text-base border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                  dir="ltr"
                />
                <p className="text-xs text-gray-400">הלינק שנפתח כשמשתמש לוחץ על הבאנר</p>
              </div>
              {/* Live preview small */}
              {form.advertiser_name && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <p className="text-xs text-indigo-700">
                    הבאנר יוצג בשם: <strong>{form.advertiser_name}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Banner upload */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex gap-5 items-start">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    תמונת באנר *
                  </Label>
                  <BannerUploader
                    value={form.banner_url}
                    onChange={url => update('banner_url', url)}
                    uploading={uploading}
                    setUploading={setUploading}
                  />
                </div>
                {/* Live sidebar preview */}
                <div className="flex-shrink-0">
                  <p className="text-xs text-gray-400 font-medium mb-2 text-center">תצוגה מקדימה</p>
                  <SidebarPreview bannerUrl={form.banner_url} advertiserName={form.advertiser_name} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Targeting & dates */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  קטגוריות יעד
                </Label>
                <p className="text-xs text-gray-400">השאר ריק להצגה לכל הלקוחות</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const isSelected = form.target_categories.includes(cat.value)
                    return (
                      <button key={cat.value} type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`
                          px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150 text-right
                          ${isSelected ? `${cat.color} border-current shadow-sm scale-[1.02]` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}
                        `}>
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />
                    תאריך התחלה *
                  </Label>
                  <Input type="date" value={form.start_date}
                    onChange={e => update('start_date', e.target.value)}
                    className="h-11 border-gray-200 focus:border-indigo-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">תאריך סיום *</Label>
                  <Input type="date" value={form.end_date}
                    onChange={e => update('end_date', e.target.value)}
                    min={form.start_date}
                    className="h-11 border-gray-200 focus:border-indigo-400"
                  />
                </div>
              </div>
              {/* Summary card */}
              {form.start_date && form.end_date && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
                  <p className="text-xs font-semibold text-emerald-800 mb-1">✅ סיכום קמפיין</p>
                  <div className="text-xs text-emerald-700 space-y-0.5">
                    <p>• מפרסם: <strong>{form.advertiser_name}</strong></p>
                    <p>• תקופה: {form.start_date} → {form.end_date}</p>
                    <p>• קטגוריות: {form.target_categories.length === 0 ? 'כל הלקוחות' : form.target_categories.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>{/* end content */}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="ghost" onClick={step === 1 ? handleClose : goPrev}
            className="gap-1.5 text-gray-600">
            {step === 1 ? 'ביטול' : <><ArrowRight className="w-4 h-4" />חזור</>}
          </Button>
          <div className="flex items-center gap-2">
            {STEPS.map(s => (
              <div key={s.id} className={`rounded-full transition-all duration-300 ${s.id === step ? 'w-5 h-2 bg-indigo-600' : s.id < step ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-gray-200'}`} />
            ))}
          </div>
          {step < 3 ? (
            <Button onClick={goNext} disabled={!canProceed()}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              הבא <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}
              disabled={!canProceed() || createCampaign.isPending || uploading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 min-w-[120px]">
              {createCampaign.isPending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> שומר...</>
                : <><CheckCircle2 className="w-4 h-4" /> צור קמפיין</>
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
  const { t } = useLanguage()
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: stats } = useAdStats()
  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useAdCampaigns()
  const toggleActive = useToggleAdActive()
  const deleteCampaign = useDeleteAdCampaign()

  const handleToggleActive = (id: string, isActive: boolean) =>
    toggleActive.mutate({ id, isActive })

  const handleDelete = (id: string, name: string) => {
    if (confirm(`למחוק את הקמפיין "${name}"?`)) deleteCampaign.mutate(id)
  }

  const calculateCTR = (clicks: number, impressions: number) =>
    impressions === 0 ? '0.00' : ((clicks / impressions) * 100).toFixed(2)

  const getCampaignStatus = (campaign: AdCampaign) => {
    const now = new Date()
    const start = new Date(campaign.start_date)
    const end = new Date(campaign.end_date)
    if (!campaign.is_active) return { label: 'לא פעיל', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-500' }
    if (now < start) return { label: 'מתוזמן', variant: 'default' as const, icon: Clock, color: 'text-amber-600' }
    if (now > end) return { label: 'הסתיים', variant: 'secondary' as const, icon: XCircle, color: 'text-gray-400' }
    return { label: 'פעיל', variant: 'default' as const, icon: CheckCircle2, color: 'text-emerald-600' }
  }

  if (campaignsError) {
    const msg = campaignsError instanceof Error ? campaignsError.message : String(campaignsError)
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-800 font-semibold mb-1">שגיאה בטעינת נתונים</p>
        <p className="text-red-600 text-sm">{msg}</p>
        <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">נסה שוב</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">ניהול פרסומות</h1>
          <p className="text-gray-500 text-sm mt-1">קמפיינים ובאנרים פרסומיים</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
          <Plus className="w-4 h-4" />
          קמפיין חדש
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'קמפיינים פעילים', value: stats?.activeCampaigns || 0, icon: Megaphone, color: 'emerald' },
          { label: 'קליקים החודש', value: stats?.monthClicks || 0, icon: MousePointerClick, color: 'blue' },
          { label: 'CTR ממוצע', value: `${stats?.avgCtr || '0.00'}%`, icon: TrendingUp, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }) => (
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


      {/* Campaigns table */}
      <Card>
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="w-4 h-4 text-indigo-500" />
            כל הקמפיינים
            {campaigns && <Badge variant="secondary" className="mr-2 text-xs">{campaigns.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaignsLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">טוען...</span>
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="text-center py-16">
              <Megaphone className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">אין קמפיינים עדיין</p>
              <p className="text-gray-300 text-sm mt-1">לחץ "קמפיין חדש" כדי להוסיף</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-50">
                {campaigns.map((campaign: AdCampaign) => {
                  const status = getCampaignStatus(campaign)
                  const StatusIcon = status.icon
                  return (
                    <div key={campaign.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img src={campaign.banner_url} alt="" className="w-16 h-10 object-cover rounded-lg border flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{campaign.advertiser_name}</p>
                          <p className="text-xs text-gray-400 truncate">{campaign.link_url}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{campaign.clicks}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{campaign.impressions}</span>
                        <span className="font-semibold text-purple-600">{calculateCTR(campaign.clicks, campaign.impressions)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={campaign.is_active} onCheckedChange={v => handleToggleActive(campaign.id, v)} />
                        <span className="text-xs text-gray-400">{campaign.is_active ? 'פעיל' : 'כבוי'}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id, campaign.advertiser_name)} className="mr-auto">
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
                      <TableHead className="text-right font-semibold">מפרסם</TableHead>
                      <TableHead className="text-right font-semibold">באנר</TableHead>
                      <TableHead className="text-right font-semibold">קטגוריות</TableHead>
                      <TableHead className="text-right font-semibold">תאריכים</TableHead>
                      <TableHead className="text-right font-semibold">קליקים</TableHead>
                      <TableHead className="text-right font-semibold">חשיפות</TableHead>
                      <TableHead className="text-right font-semibold">CTR</TableHead>
                      <TableHead className="text-right font-semibold">סטטוס</TableHead>
                      <TableHead className="text-right font-semibold">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign: AdCampaign) => {
                      const status = getCampaignStatus(campaign)
                      const StatusIcon = status.icon
                      return (
                        <TableRow key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <p className="font-semibold text-gray-800">{campaign.advertiser_name}</p>
                            <a href={campaign.link_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5">
                              {campaign.link_url.replace(/^https?:\/\//, '').slice(0, 30)}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </TableCell>
                          <TableCell>
                            <img src={campaign.banner_url} alt="" className="w-20 h-12 object-cover rounded-lg border shadow-sm" />
                          </TableCell>
                          <TableCell>
                            {campaign.target_categories.length === 0
                              ? <Badge variant="outline" className="text-xs">הכל</Badge>
                              : <div className="flex flex-wrap gap-1">
                                  {campaign.target_categories.map(c => (
                                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                                  ))}
                                </div>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              <p>{format(new Date(campaign.start_date), 'dd/MM/yy')}</p>
                              <p className="text-gray-400 text-xs">עד {format(new Date(campaign.end_date), 'dd/MM/yy')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 flex items-center gap-1">
                              <MousePointerClick className="w-3.5 h-3.5" />{campaign.clicks}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600 flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />{campaign.impressions}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-purple-600">{calculateCTR(campaign.clicks, campaign.impressions)}%</span>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={campaign.is_active} onCheckedChange={v => handleToggleActive(campaign.id, v)} />
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id, campaign.advertiser_name)}
                                className="hover:bg-red-50">
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

      {/* Wizard */}
      <CreateCampaignWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}

export default function AdsPage() {
  return (
    <ErrorBoundary>
      <AdsPageContent />
    </ErrorBoundary>
  )
}
