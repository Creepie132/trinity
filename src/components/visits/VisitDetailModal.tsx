'use client'

import {
  Phone, MessageCircle, MessageSquare, Pencil, X, Plus, Clock,
  Calendar, Scissors, FileText, History, ArrowLeft, Download,
  Package, ChevronRight, Loader2, CheckCircle, Play,
} from 'lucide-react'
import { useVisitServices, useRemoveVisitService } from '@/hooks/useVisitServices'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'

interface VisitDetailModalProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clientName: string
  clientPhone?: string
  clientEmail?: string
  serviceName?: string
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
  onEdit: () => void
  onAddService?: (serviceId: string) => void
  lastVisitDate?: string
  onShowHistory?: () => void
}

interface CareInstruction {
  id: string; title: string; title_ru: string; content: string; content_ru: string
  file_url?: string; service_id?: string
  services?: { id: string; name: string; name_ru: string }
}

type ViewMode = 'main' | 'instructions' | 'send-instruction' | 'services' | 'add-menu' | 'add-service' | 'add-product'
interface ServiceItem { id: string; name: string; name_ru?: string; price?: number; duration_minutes?: number }
interface ProductItem { id: string; name: string; sell_price: number; quantity: number; image_url?: string; category?: string }

const STATUS_CONFIG: Record<string, { ru: string; he: string; cls: string; dot: string }> = {
  scheduled:   { ru: 'Запланирован', he: 'מתוכנן',  cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',   dot: 'bg-blue-400' },
  in_progress: { ru: 'В процессе',   he: 'בתהליך',  cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-400' },
  completed:   { ru: 'Завершён',     he: 'הושלם',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-400' },
  cancelled:   { ru: 'Отменён',      he: 'בוטל',    cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' },
  no_show:     { ru: 'Не пришёл',    he: 'לא הגיע', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_COLORS: Record<string, string> = {
  scheduled:   'from-blue-400 to-blue-600',
  in_progress: 'from-amber-400 to-orange-500',
  completed:   'from-emerald-400 to-teal-500',
  cancelled:   'from-slate-300 to-slate-400',
}

export function VisitDetailModal(props: VisitDetailModalProps) {
  const {
    visit, isOpen, onClose, locale, clientName, clientPhone, clientEmail,
    serviceName, onStart, onComplete, onCancel, onEdit, onAddService,
    lastVisitDate, onShowHistory,
  } = props

  const { data: visitServices = [] } = useVisitServices(visit?.id || '')
  const removeVisitService = useRemoveVisitService(visit?.id || '')
  const queryClient = useQueryClient()

  const [priceOffset, setPriceOffset] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [instructions, setInstructions] = useState<CareInstruction[]>([])
  const [selectedInstruction, setSelectedInstruction] = useState<CareInstruction | null>(null)
  const [loading, setLoading] = useState(false)
  const [servicesList, setServicesList] = useState<ServiceItem[]>([])
  const [productsList, setProductsList] = useState<ProductItem[]>([])
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [serviceSearch, setServiceSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [servicePage, setServicePage] = useState(1)
  const [productPage, setProductPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (isOpen && viewMode === 'instructions' && instructions.length === 0) fetchInstructions()
  }, [isOpen, viewMode])

  useEffect(() => {
    if (!isOpen) {
      setViewMode('main'); setSelectedInstruction(null); setPriceOffset(0)
      setServiceSearch(''); setProductSearch(''); setServicePage(1); setProductPage(1)
    }
  }, [isOpen])

  const fetchInstructions = async () => {
    try { setLoading(true); const r = await fetch('/api/care-instructions'); const d = await r.json(); if (d.instructions) setInstructions(d.instructions) }
    catch { toast.error(locale === 'ru' ? 'Ошибка загрузки' : 'שגיאה בטעינה') }
    finally { setLoading(false) }
  }
  const fetchServices = async () => {
    try { setLoading(true); const r = await fetch('/api/services'); const d = await r.json(); setServicesList(d.services || []) }
    catch { toast.error(locale === 'ru' ? 'Ошибка загрузки' : 'שגיאה בטעינה') }
    finally { setLoading(false) }
  }
  const fetchProducts = async () => {
    try { setLoading(true); const r = await fetch('/api/products'); const d = await r.json(); setProductsList((d.products || []).filter((p: ProductItem) => p.quantity > 0)) }
    catch { toast.error(locale === 'ru' ? 'Ошибка загрузки' : 'שגיאה בטעינה') }
    finally { setLoading(false) }
  }

  const handleAddService = async (service: ServiceItem) => {
    if (addingItem) return; setAddingItem(service.id)
    try {
      const r = await fetch(`/api/visits/${visit.id}/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: service.id, service_name: service.name, service_name_ru: service.name_ru || service.name, price: service.price || 0, duration_minutes: service.duration_minutes || 0 }) })
      if (!r.ok) throw new Error()
      queryClient.invalidateQueries({ queryKey: ['visit-services', visit.id] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      setPriceOffset(p => p + (service.price || 0))
      toast.success(locale === 'ru' ? `Добавлено: ${service.name_ru || service.name}` : `נוסף: ${service.name}`)
      setViewMode('services')
    } catch { toast.error(locale === 'ru' ? 'Ошибка' : 'שגיאה') }
    finally { setAddingItem(null) }
  }

  const handleAddProduct = async (product: ProductItem) => {
    if (addingItem) return; setAddingItem(product.id)
    try {
      const r = await fetch(`/api/visits/${visit.id}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: product.id }) })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      queryClient.invalidateQueries({ queryKey: ['visit-services', visit.id] })
      setPriceOffset(p => p + product.sell_price)
      toast.success(locale === 'ru' ? `Добавлено: ${product.name}` : `נוסף: ${product.name}`)
      setViewMode('services')
    } catch (e: any) { toast.error(e.message || (locale === 'ru' ? 'Ошибка' : 'שגיאה')) }
    finally { setAddingItem(null) }
  }

  if (!visit || !isOpen) return null

  const isHe = locale === 'he'
  const date = new Date(visit.scheduled_at)
  const locStr = isHe ? 'he-IL' : 'ru-RU'
  const displayServiceName = visit.services ? (isHe ? visit.services.name : (visit.services.name_ru || visit.services.name)) : serviceName
  const totalDuration = visitServices.reduce((s, vs) => s + (vs.duration_minutes || 0), 0)
  const endTime = totalDuration > 0 ? new Date(date.getTime() + totalDuration * 60000) : visit.duration_minutes ? new Date(date.getTime() + visit.duration_minutes * 60000) : null
  const statusCfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.cancelled
  const statusLabel = isHe ? statusCfg.he : statusCfg.ru
  const avatarGradient = AVATAR_COLORS[visit.status] || AVATAR_COLORS.cancelled

  const formatDuration = (min: number) => {
    if (!min) return ''
    if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m > 0 ? `${h}${isHe ? 'ש׳' : 'ч'} ${m}${isHe ? 'ד׳' : 'мин'}` : `${h}${isHe ? 'ש׳' : 'ч'}` }
    return `${min} ${isHe ? 'ד׳' : 'мин'}`
  }

  const getInstructionTitle = (i: CareInstruction) => isHe ? i.title : (i.title_ru || i.title)
  const getInstructionContent = (i: CareInstruction) => isHe ? i.content : (i.content_ru || i.content)

  const sendViaWhatsApp = async (instruction: CareInstruction) => {
    if (!clientPhone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет номера телефона'); return }
    const phone = clientPhone.replace(/[^0-9]/g, '')
    const fp = phone.startsWith('972') ? phone : `972${phone.replace(/^0/, '')}`
    if (instruction.file_url) {
      try {
        const r = await fetch(instruction.file_url); const blob = await r.blob()
        const url = URL.createObjectURL(blob); const a = document.createElement('a')
        a.href = url; a.download = `${getInstructionTitle(instruction)}.pdf`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        window.open(`https://wa.me/${fp}?text=${encodeURIComponent(isHe ? 'ההוראה מוכנה לשליחה.' : 'Инструкция готова.')}`, '_blank')
      } catch { toast.error(isHe ? 'שגיאה' : 'Ошибка') }
    } else {
      window.open(`https://wa.me/${fp}?text=${encodeURIComponent(getInstructionContent(instruction))}`, '_blank')
    }
  }

  const SubHeader = ({ title, back }: { title: string; back: ViewMode }) => (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
      <button onClick={() => setViewMode(back)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
  )

  const renderMainView = () => {
    const timeStr = date.toLocaleTimeString(locStr, { hour: '2-digit', minute: '2-digit' })
    const dateStr = date.toLocaleDateString(locStr, { day: 'numeric', month: 'long', year: 'numeric' })
    const dur = totalDuration > 0 ? totalDuration : (visit.duration_minutes || 0)
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm`}>
            {getInitials(clientName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{clientName}</h2>
            {clientPhone && <p className="text-sm text-gray-400 mt-0.5">{clientPhone}</p>}
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium border flex items-center gap-1.5 flex-shrink-0 ${statusCfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Calendar className="w-3.5 h-3.5" />, label: isHe ? 'תאריך' : 'Дата', value: dateStr },
            { icon: <Clock className="w-3.5 h-3.5" />, label: isHe ? 'שעה' : 'Время', value: timeStr },
            endTime ? { icon: <Clock className="w-3.5 h-3.5" />, label: isHe ? 'סיום' : 'Окончание', value: endTime.toLocaleTimeString(locStr, { hour: '2-digit', minute: '2-digit' }) } : null,
            dur > 0 ? { icon: <Clock className="w-3.5 h-3.5" />, label: isHe ? 'משך' : 'Длительность', value: formatDuration(dur) } : null,
          ].filter(Boolean).map((item: any, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">{item.icon}<span className="text-xs">{item.label}</span></div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
            </div>
          ))}
        </div>
        {(displayServiceName || visitServices.length > 0) && (
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl overflow-hidden">
            {displayServiceName && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-4 h-4 text-theme-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{isHe ? 'שירות' : 'Услуга'}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayServiceName}</p>
                </div>
                {visit.price ? <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-shrink-0">₪{visit.price}</span> : null}
              </div>
            )}
            {visitServices.map((vs, idx) => {
              const name = isHe ? vs.service_name : (vs.service_name_ru || vs.service_name)
              const isProduct = !vs.service_id && vs.duration_minutes === 0
              return (
                <div key={vs.id} className={`flex items-center gap-3 px-4 py-2.5 ${displayServiceName || idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isProduct ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                    {isProduct ? <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Scissors className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                    {vs.duration_minutes > 0 && <p className="text-xs text-gray-400">{formatDuration(vs.duration_minutes)}</p>}
                  </div>
                  {vs.price > 0 && <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">₪{vs.price}</span>}
                  <button onClick={() => { removeVisitService.mutate(vs.id); setPriceOffset(p => p - vs.price) }}
                    className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              )
            })}
            {visitServices.length > 1 && (
              <div className="flex justify-between items-center px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{isHe ? 'סה״כ' : 'Итого'}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₪{visitServices.reduce((s, vs) => s + (vs.price || 0), 0)}</span>
              </div>
            )}
          </div>
        )}
        {visit.notes && (
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{isHe ? 'הערות' : 'Заметки'}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.notes}</p>
            </div>
          </div>
        )}

        {lastVisitDate && (
          <button onClick={onShowHistory} className="w-full flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl px-4 py-3 transition-colors group">
            <History className="w-4 h-4 text-gray-400" />
            <div className="flex-1 text-start">
              <p className="text-xs text-gray-400 dark:text-gray-500">{isHe ? 'ביקור אחרון' : 'Последний визит'}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{lastVisitDate}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
          </button>
        )}
        {visit.status === 'scheduled' && (
          <div className="space-y-2 pt-1">
            <button onClick={onStart}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 active:scale-98 transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30 flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-white" />{isHe ? 'התחל ביקור' : 'Начать визит'}
            </button>
            {clientPhone && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => (window.location.href = `tel:${clientPhone}`)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95 transition-all text-sm font-medium">
                  <Phone className="w-4 h-4" />{isHe ? 'התקשר' : 'Позвонить'}
                </button>
                <button onClick={() => {
                  const msg = isHe
                    ? `שלום ${clientName}! תזכורת לביקור ב-${dateStr} בשעה ${timeStr}. מחכים לך! 💇`
                    : `Здравствуйте, ${clientName}! Напоминаем о визите ${dateStr} в ${timeStr}. Ждём вас! 💇`
                  window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all text-sm font-medium">
                  <MessageCircle className="w-4 h-4" />WhatsApp
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onEdit} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all text-sm font-medium">
                <Pencil className="w-3.5 h-3.5" />{isHe ? 'ערוך' : 'Редактировать'}
              </button>
              <button onClick={() => { onCancel(); onClose() }} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-95 transition-all text-sm font-medium">
                <X className="w-3.5 h-3.5" />{isHe ? 'בטל' : 'Отменить'}
              </button>
            </div>
          </div>
        )}
        {visit.status === 'in_progress' && (
          <div className="space-y-2 pt-1">
            <button onClick={onComplete}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 active:scale-98 transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />{isHe ? 'סיים ביקור' : 'Завершить визит'}
            </button>
            {clientPhone && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => (window.location.href = `tel:${clientPhone}`)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95 transition-all text-sm font-medium">
                  <Phone className="w-4 h-4" />{isHe ? 'התקשר' : 'Позвонить'}
                </button>
                <button onClick={() => {
                  const msg = isHe
                    ? `שלום ${clientName}! תזכורת לביקור ב-${dateStr} בשעה ${timeStr}. מחכים לך! 💇`
                    : `Здравствуйте, ${clientName}! Напоминаем о визите ${dateStr} в ${timeStr}. Ждём вас! 💇`
                  window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all text-sm font-medium">
                  <MessageCircle className="w-4 h-4" />WhatsApp
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setViewMode('services'); if (servicesList.length === 0) fetchServices(); if (productsList.length === 0) fetchProducts() }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 active:scale-95 transition-all text-sm font-medium">
                <Plus className="w-3.5 h-3.5" />{isHe ? 'הוסף' : 'Добавить'}
              </button>
              <button onClick={() => { onCancel(); onClose() }} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 active:scale-95 transition-all text-sm font-medium">
                <X className="w-3.5 h-3.5" />{isHe ? 'בטל' : 'Отменить'}
              </button>
            </div>
          </div>
        )}
        {visit.status === 'completed' && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => {
                const txt = isHe ? `קבלה: ביקור ${dateStr}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!` : `Квитанция: визит ${dateStr}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
                if (clientPhone) window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(txt)}`, '_blank')
              }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all text-sm font-medium">
                <MessageCircle className="w-3.5 h-3.5" />{isHe ? 'קבלה WA' : 'Квитанция WA'}
              </button>
              <button onClick={() => {
                const txt = isHe ? `קבלה: ביקור ${dateStr}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!` : `Квитанция: визит ${dateStr}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
                if (clientPhone) window.location.href = `sms:${clientPhone}?body=${encodeURIComponent(txt)}`
              }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 active:scale-95 transition-all text-sm font-medium">
                <MessageSquare className="w-3.5 h-3.5" />SMS
              </button>
            </div>
            <button onClick={() => setViewMode('instructions')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-theme-primary/30 bg-theme-primary/5 text-theme-primary hover:bg-theme-primary/10 active:scale-95 transition-all text-sm font-medium">
              <FileText className="w-3.5 h-3.5" />{isHe ? 'מסמך נלווה' : 'Сопроводительный документ'}
            </button>
          </div>
        )}
        {visit.status === 'cancelled' && (
          <button onClick={onEdit} className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all text-sm font-medium flex items-center justify-center gap-2">
            <Pencil className="w-3.5 h-3.5" />{isHe ? 'ערוך' : 'Редактировать'}
          </button>
        )}
      </div>
    )
  }

  const renderInstructionsList = () => (
    <div>
      <SubHeader title={isHe ? 'בחר הוראה' : 'Выберите инструкцию'} back="main" />
      {loading ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      : instructions.length === 0 ? <p className="py-12 text-center text-sm text-gray-400">{isHe ? 'אין הוראות זמינות' : 'Нет доступных инструкций'}</p>
      : <div className="space-y-2">{instructions.map(inst => (
        <button key={inst.id} onClick={() => { setSelectedInstruction(inst); setViewMode('send-instruction') }}
          className="w-full text-start p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-98 transition-all group">
          <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-theme-primary transition-colors">{getInstructionTitle(inst)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{inst.services ? (isHe ? inst.services.name : (inst.services.name_ru || inst.services.name)) : (isHe ? 'כללי' : 'Общее')}</p>
        </button>
      ))}</div>}
    </div>
  )

  const renderSendInstruction = () => {
    if (!selectedInstruction) return null
    return (
      <div>
        <SubHeader title={isHe ? 'שלח הוראה' : 'Отправить инструкцию'} back="instructions" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{getInstructionTitle(selectedInstruction)}</p>
        <div className="space-y-2">
          {[
            { label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100', fn: () => sendViaWhatsApp(selectedInstruction) },
            { label: 'SMS', icon: <MessageSquare className="w-4 h-4" />, cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100', fn: () => { if (clientPhone) window.location.href = `sms:${clientPhone}&body=${encodeURIComponent(getInstructionContent(selectedInstruction))}` } },
            { label: isHe ? 'הורד' : 'Скачать', icon: <Download className="w-4 h-4" />, cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600', fn: () => {
              const title = getInstructionTitle(selectedInstruction); const content = getInstructionContent(selectedInstruction)
              const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `${title}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
            }},
          ].map((btn, i) => (
            <button key={i} onClick={btn.fn} className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold active:scale-95 transition-all ${btn.cls}`}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderServices = () => {
    const total = visitServices.reduce((s, vs) => s + (vs.price || 0), 0)
    return (
      <div className="flex flex-col" style={{ minHeight: '55vh' }}>
        <SubHeader title={isHe ? 'שירותים ומוצרים' : 'Услуги и товары'} back="main" />
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {visitServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600">
              <Scissors className="w-10 h-10 mb-3" /><p className="text-sm">{isHe ? 'לא נוספו שירותים' : 'Нет добавленных услуг'}</p>
            </div>
          ) : visitServices.map(vs => {
            const name = isHe ? vs.service_name : (vs.service_name_ru || vs.service_name)
            const isProduct = !vs.service_id && vs.duration_minutes === 0
            return (
              <div key={vs.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isProduct ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                  {isProduct ? <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
                  {vs.duration_minutes > 0 && <p className="text-xs text-gray-400">{formatDuration(vs.duration_minutes)}</p>}
                </div>
                {vs.price > 0 && <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-shrink-0">₪{vs.price}</span>}
                <button onClick={() => { removeVisitService.mutate(vs.id); setPriceOffset(p => p - vs.price) }}
                  className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            )
          })}
        </div>
        {visitServices.length > 0 && (
          <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-700 mb-3">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{isHe ? 'סה״כ' : 'Итого'}</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₪{total}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setServiceSearch(''); setServicePage(1); setViewMode('add-service'); if (servicesList.length === 0) fetchServices() }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 active:scale-95 transition-all text-sm font-semibold">
            <Plus className="w-4 h-4" />{isHe ? 'שירות' : 'Услуга'}
          </button>
          <button onClick={() => { setProductSearch(''); setProductPage(1); setViewMode('add-product'); if (productsList.length === 0) fetchProducts() }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 active:scale-95 transition-all text-sm font-semibold">
            <Plus className="w-4 h-4" />{isHe ? 'מוצר' : 'Товар'}
          </button>
        </div>
      </div>
    )
  }

  const renderAddService = () => {
    const filtered = servicesList.filter(s => { if (serviceSearch.length < 2) return true; const q = serviceSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.name_ru || '').toLowerCase().includes(q) })
    const totalPg = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((servicePage - 1) * PAGE_SIZE, servicePage * PAGE_SIZE)
    return (
      <div className="flex flex-col" style={{ minHeight: '55vh' }}>
        <SubHeader title={isHe ? 'הוסף שירות' : 'Добавить услугу'} back="services" />
        <input type="text" value={serviceSearch} onChange={e => { setServiceSearch(e.target.value); setServicePage(1) }}
          placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 mb-3" />
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          : paged.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{isHe ? 'אין שירותים' : 'Нет услуг'}</p>
          : paged.map(s => {
            const name = isHe ? s.name : (s.name_ru || s.name)
            return (
              <button key={s.id} onClick={() => handleAddService(s)} disabled={!!addingItem}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-98 transition-all disabled:opacity-60 group">
                <div className="text-start">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{name}</p>
                  {s.duration_minutes ? <p className="text-xs text-gray-400 mt-0.5">{formatDuration(s.duration_minutes)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {(s.price || 0) > 0 && <span className="text-sm font-bold text-gray-600 dark:text-gray-300">₪{s.price}</span>}
                  {addingItem === s.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Plus className="w-4 h-4 text-blue-400" />}
                </div>
              </button>
            )
          })}
        </div>
        {totalPg > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
            <button onClick={() => setServicePage(p => Math.max(1, p - 1))} disabled={servicePage === 1}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /></button>
            <span>{(servicePage - 1) * PAGE_SIZE + 1}–{Math.min(servicePage * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <button onClick={() => setServicePage(p => Math.min(totalPg, p + 1))} disabled={servicePage === totalPg}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    )
  }

  const renderAddProduct = () => {
    const filtered = productsList.filter(p => productSearch.length < 2 || p.name.toLowerCase().includes(productSearch.toLowerCase()))
    const totalPg = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((productPage - 1) * PAGE_SIZE, productPage * PAGE_SIZE)
    return (
      <div className="flex flex-col" style={{ minHeight: '55vh' }}>
        <SubHeader title={isHe ? 'הוסף מוצר' : 'Добавить товар'} back="services" />
        <input type="text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setProductPage(1) }}
          placeholder={isHe ? 'חיפוש...' : 'Поиск...'}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 mb-3" />
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          : paged.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{isHe ? 'אין מוצרים' : 'Нет товаров'}</p>
          : paged.map(p => (
            <button key={p.id} onClick={() => handleAddProduct(p)} disabled={!!addingItem}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-98 transition-all disabled:opacity-60 group">
              <div className="flex items-center gap-3 text-start min-w-0">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-amber-500 dark:text-amber-400" /></div>}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{p.name}</p>
                  {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">₪{p.sell_price}</span>
                {addingItem === p.id ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Plus className="w-4 h-4 text-amber-400" />}
              </div>
            </button>
          ))}
        </div>
        {totalPg > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
            <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /></button>
            <span>{(productPage - 1) * PAGE_SIZE + 1}–{Math.min(productPage * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <button onClick={() => setProductPage(p => Math.min(totalPg, p + 1))} disabled={productPage === totalPg}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={undefined} width="480px" dir={isHe ? 'rtl' : 'ltr'} showCloseButton={viewMode === 'main'}>
      {viewMode === 'main'             && renderMainView()}
      {viewMode === 'instructions'     && renderInstructionsList()}
      {viewMode === 'send-instruction' && renderSendInstruction()}
      {viewMode === 'services'         && renderServices()}
      {viewMode === 'add-service'      && renderAddService()}
      {viewMode === 'add-product'      && renderAddProduct()}
    </Modal>
  )
}
