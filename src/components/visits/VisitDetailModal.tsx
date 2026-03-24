'use client'

import {
  Phone, MessageCircle, MessageSquare, Pencil, X, Plus, Clock,
  Calendar, Scissors, ShoppingBag, FileText, History, ArrowLeft, Download,
  Package, ChevronRight, Loader2, CheckCircle, Play, MapPin, Video, Navigation, ExternalLink,
} from 'lucide-react'
import { useVisitServices, useRemoveVisitService } from '@/hooks/useVisitServices'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'

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

const STATUS_CONFIG: Record<string, { ru: string; he: string; cls: string; dot: string; color: string }> = {
  scheduled:   { ru: 'Запланирован', he: 'מתוכנן',  cls: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-400',    color: '#60a5fa' },
  in_progress: { ru: 'В процессе',   he: 'בתהליך',  cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400',   color: '#fbbf24' },
  completed:   { ru: 'Завершён',     he: 'הושלם',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', color: '#34d399' },
  cancelled:   { ru: 'Отменён',      he: 'בוטל',    cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400',   color: '#64748b' },
  no_show:     { ru: 'Не пришёл',    he: 'לא הגיע', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400',   color: '#64748b' },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_COLORS: Record<string, [string, string]> = {
  scheduled:   ['#60a5fa', '#38bdf8'],
  in_progress: ['#fbbf24', '#f97316'],
  completed:   ['#34d399', '#0d9488'],
  cancelled:   ['#94a3b8', '#64748b'],
}

export function VisitDetailModal(props: VisitDetailModalProps) {
  const {
    visit, isOpen, onClose, locale, clientName, clientPhone, clientEmail,
    serviceName, onStart, onComplete, onCancel, onEdit, onAddService,
    lastVisitDate, onShowHistory,
  } = props

  const { data: visitServicesFromHook } = useVisitServices(visit?.id || '')
  const visitServices = visitServicesFromHook ?? visit?.visit_services ?? []
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
  const dir = isHe ? 'rtl' : 'ltr'
  const date = new Date(visit.scheduled_at)
  const locStr = isHe ? 'he-IL' : 'ru-RU'
  const displayServiceName = visit.services ? (isHe ? visit.services.name : (visit.services.name_ru || visit.services.name)) : serviceName
  const additionalDuration = visitServices.reduce((s: number, vs: any) => s + (vs.duration_minutes || 0), 0)
  const totalDuration = (visit.duration_minutes || 0) + additionalDuration
  const endTime = totalDuration > 0 ? new Date(date.getTime() + totalDuration * 60000) : null
  const statusCfg = STATUS_CONFIG[visit.status] || STATUS_CONFIG.cancelled
  const statusLabel = isHe ? statusCfg.he : statusCfg.ru
  const [g1, g2] = AVATAR_COLORS[visit.status] || AVATAR_COLORS.cancelled
  const timeStr = date.toLocaleTimeString(locStr, { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString(locStr, { day: 'numeric', month: 'long', year: 'numeric' })

  const formatDuration = (min: number) => {
    if (!min) return ''
    if (min >= 60) { const h = Math.floor(min / 60), m = min % 60; return m > 0 ? `${h}${isHe ? 'ש׳' : 'ч'} ${m}${isHe ? 'ד׳' : 'мин'}` : `${h}${isHe ? 'ש׳' : 'ч'}` }
    return `${min} ${isHe ? 'ד׳' : 'мин'}`
  }

  const getInstructionTitle = (i: CareInstruction) => isHe ? i.title : (i.title_ru || i.title)
  const getInstructionContent = (i: CareInstruction) => isHe ? i.content : (i.content_ru || i.content)

  const sendViaWhatsApp = (instruction: CareInstruction) => {
    if (!clientPhone) { toast.error(isHe ? 'אין מספר טלפון' : 'Нет номера телефона'); return }
    const phone = clientPhone.replace(/[^0-9]/g, '')
    const fp = phone.startsWith('972') ? phone : `972${phone.replace(/^0/, '')}`
    const title = getInstructionTitle(instruction)
    let message: string
    if (instruction.file_url) {
      message = `היי ${clientName}! 👋\n\nתודה שביקרת.\n\n*${title}*\n\n📄 ${instruction.file_url}\n\nנשמח לראותך שוב! 🌟`
    } else {
      message = `היי ${clientName}! 👋\n\nתודה על הביקור.\n\n*${title}*\n\n${getInstructionContent(instruction)}\n\nנשמח לראותך שוב! 🌟`
    }
    window.open(`https://wa.me/${fp}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const SubHeader = ({ title, back }: { title: string; back: ViewMode }) => (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
      <button onClick={() => setViewMode(back)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
  )

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {getInitials(clientName)}
        </div>
      </div>
      {clientPhone && (
        <a href={`tel:${clientPhone}`} dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 8, textDecoration: 'none' }}>
          <Phone size={11} />{clientPhone}
        </a>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, marginBottom: 12, alignSelf: 'center', background: `${statusCfg.color}20`, border: `0.5px solid ${statusCfg.color}50` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: statusCfg.color }}>{statusLabel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{timeStr}</div>
          <div style={{ fontSize: 8, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{isHe ? 'שעה' : 'Время'}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{date.toLocaleDateString(locStr, { day: 'numeric', month: 'short' })}</div>
          <div style={{ fontSize: 8, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{isHe ? 'תאריך' : 'Дата'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visit.status === 'scheduled' && (
          <button onClick={onStart} style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.2)',color:'#34d399',fontSize:12,fontWeight:600,marginBottom:2 }}>
            <Play size={13} className="fill-current" />{isHe ? 'התחל ביקור' : 'Начать визит'}
          </button>
        )}
        {visit.status === 'in_progress' && (
          <button onClick={onComplete} style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.2)',color:'#34d399',fontSize:12,fontWeight:600,marginBottom:2 }}>
            <CheckCircle size={13} />{isHe ? 'סיים ביקור' : 'Завершить визит'}
          </button>
        )}
        {clientPhone && (
          <button onClick={() => {
            const msg = isHe
              ? `שלום ${clientName}! תזכורת לביקור ב-${dateStr} בשעה ${timeStr}. מחכים לך! 💇`
              : `Здравствуйте, ${clientName}! Напоминаем о визите ${dateStr} в ${timeStr}. Ждём вас! 💇`
            window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
          }} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.15)',color:'#34d399',fontSize:11,fontWeight:600 }}>
            <MessageCircle size={13} />WhatsApp
          </button>
        )}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '2px 0 4px' }} />
        {clientPhone && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 4 }}>
            <button onClick={() => window.location.href = `tel:${clientPhone}`} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.08)',background:'transparent',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:600 }}>
              <Phone size={14} />{isHe ? 'שיחה' : 'Звонок'}
            </button>
            <button onClick={() => { if (clientPhone) window.location.href = `sms:${clientPhone}` }} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.08)',background:'transparent',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:600 }}>
              <MessageSquare size={14} />SMS
            </button>
          </div>
        )}
        {visit.status === 'in_progress' && (
          <button onClick={() => { setViewMode('services'); if (servicesList.length === 0) fetchServices(); if (productsList.length === 0) fetchProducts() }}
            style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,border:'0.5px solid rgba(167,139,250,0.25)',background:'rgba(167,139,250,0.1)',cursor:'pointer',width:'100%',color:'#a78bfa',fontSize:11,fontWeight:600 }}>
            <Plus size={13} />{isHe ? 'הוסף שירות/מוצר' : 'Добавить'}
          </button>
        )}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '2px 0 4px' }} />
        {visit.status !== 'completed' && (
          <button onClick={onEdit} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.07)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:500 }}>
            <Pencil size={12} />{isHe ? 'ערוך' : 'Редактировать'}
          </button>
        )}
        {(visit.status === 'scheduled' || visit.status === 'in_progress') && (
          <button onClick={() => { onCancel(); onClose() }} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,border:'0.5px solid rgba(248,113,113,0.2)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(248,113,113,0.5)',fontSize:11,fontWeight:500,marginTop:2 }}>
            <X size={12} />{isHe ? 'בטל ביקור' : 'Отменить визит'}
          </button>
        )}
        {visit.status === 'completed' && clientPhone && (
          <>
            <button onClick={() => {
              const txt = isHe ? `קבלה: ביקור ${dateStr}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!` : `Квитанция: визит ${dateStr}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
              window.open(`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(txt)}`, '_blank')
            }} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.15)',color:'#34d399',fontSize:11,fontWeight:600 }}>
              <MessageCircle size={13} />{isHe ? 'קבלה WA' : 'Квитанция WA'}
            </button>
            <button onClick={() => {
              const txt = isHe ? `קבלה: ביקור ${dateStr}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!` : `Квитанция: визит ${dateStr}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
              window.location.href = `sms:${clientPhone}?body=${encodeURIComponent(txt)}`
            }} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,border:'0.5px solid rgba(96,165,250,0.25)',background:'rgba(96,165,250,0.1)',cursor:'pointer',width:'100%',color:'#60a5fa',fontSize:11,fontWeight:600 }}>
              <MessageSquare size={13} />SMS
            </button>
          </>
        )}
      </div>
    </div>
  )

  // ── Main content ──────────────────────────────────────────────────────────
  const renderMainContent = () => (
    <div className="space-y-4" style={{ padding: '16px 16px 20px' }}>
      {(displayServiceName || visitServices.length > 0) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{isHe ? 'שירותים' : 'Услуги'}</p>
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e8edf4', overflow: 'hidden' }}>
            {displayServiceName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Scissors size={13} color="#3b82f6" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', flex: 1 }}>{displayServiceName}</span>
                {visit.price ? <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>₪{visit.price}</span> : null}
              </div>
            )}
            {visitServices.map((vs: any) => {
              const name = isHe ? vs.service_name : (vs.service_name_ru || vs.service_name)
              const isProduct = !vs.service_id && vs.duration_minutes === 0
              return (
                <div key={vs.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: '0.5px solid #f1f5f9' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: isProduct ? '#fef9c3' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isProduct ? <Package size={13} color="#ca8a04" /> : <Scissors size={13} color="#3b82f6" />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', flex: 1 }}>{name}</span>
                  {vs.price > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>₪{vs.price}</span>}
                  <button onClick={() => { removeVisitService.mutate(vs.id); setPriceOffset(p => p - vs.price) }}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )
            })}
            {visitServices.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderTop: '0.5px solid #e8edf4' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isHe ? 'סה״כ' : 'Итого'}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>₪{(visit.price || 0) + visitServices.reduce((s: number, vs: any) => s + (vs.price || 0), 0)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {visit.notes && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{isHe ? 'הערות' : 'Заметки'}</p>
          <div style={{ padding: '10px 12px', background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>{visit.notes}</div>
        </div>
      )}
      {visit.event_type === 'meeting' && visit.meeting_link && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ecfdf5', border: '0.5px solid #a7f3d0', borderRadius: 10, padding: '10px 12px' }}>
          <Video size={14} color="#059669" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: '#059669', fontWeight: 600, margin: '0 0 2px' }}>{isHe ? 'קישור לפגישה' : 'Ссылка на встречу'}</p>
            <p style={{ fontSize: 11, color: '#065f46', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visit.meeting_link}</p>
          </div>
          <button onClick={() => window.open(visit.meeting_link!, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <ExternalLink size={11} />{isHe ? 'הצטרף' : 'Войти'}
          </button>
        </div>
      )}
      {visit.event_type !== 'meeting' && visit.notes && (() => {
        const lines = visit.notes.split('\n')
        const addrLine = lines.find((l: string) => l.startsWith('Адрес:') || l.startsWith('כתובת:'))
        const cityLine = lines.find((l: string) => l.startsWith('Город:') || l.startsWith('עיר:'))
        const location = [cityLine?.split(': ')[1], addrLine?.split(': ')[1]].filter(Boolean).join(', ')
        if (!location) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 10, padding: '10px 12px' }}>
            <MapPin size={14} color="#2563eb" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, margin: '0 0 2px' }}>{isHe ? 'כתובת' : 'Адрес'}</p>
              <p style={{ fontSize: 11, color: '#1e40af', margin: 0 }} dir="rtl">{location}</p>
            </div>
            <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(location)}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Navigation size={11} />{isHe ? 'נווט' : 'Навигация'}
            </button>
          </div>
        )
      })()}
      {lastVisitDate && (
        <button onClick={onShowHistory} className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 transition-colors group">
          <History className="w-4 h-4 text-gray-400" />
          <div className="flex-1 text-start">
            <p className="text-xs text-gray-400">{isHe ? 'ביקור אחרון' : 'Последний визит'}</p>
            <p className="text-sm font-medium text-gray-700">{lastVisitDate}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </button>
      )}
      {visit.status === 'completed' && (
        <button onClick={() => setViewMode('instructions')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition text-sm font-medium">
          <FileText className="w-4 h-4" />{isHe ? 'מסמך נלווה' : 'Сопроводительный документ'}
        </button>
      )}
    </div>
  )

  // ── Sub-view renderers ─────────────────────────────────────────────────────
  const renderInstructionsList = () => (
    <div style={{ padding: '16px 16px 20px' }}>
      <SubHeader title={isHe ? 'בחר הוראה' : 'Выберите инструкцию'} back="main" />
      {loading ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      : instructions.length === 0 ? <p className="py-12 text-center text-sm text-gray-400">{isHe ? 'אין הוראות זמינות' : 'Нет доступных инструкций'}</p>
      : <div className="space-y-2">{instructions.map(inst => (
        <button key={inst.id} onClick={() => { setSelectedInstruction(inst); setViewMode('send-instruction') }}
          className="w-full text-start p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-98 transition-all group">
          <p className="font-medium text-gray-900 dark:text-gray-100">{getInstructionTitle(inst)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{inst.services ? (isHe ? inst.services.name : (inst.services.name_ru || inst.services.name)) : (isHe ? 'כללי' : 'Общее')}</p>
        </button>
      ))}</div>}
    </div>
  )

  const renderSendInstruction = () => {
    if (!selectedInstruction) return null
    return (
      <div style={{ padding: '16px 16px 20px' }}>
        <SubHeader title={isHe ? 'שלח הוראה' : 'Отправить инструкцию'} back="instructions" />
        <p className="text-sm text-gray-500 mb-4">{getInstructionTitle(selectedInstruction)}</p>
        <div className="space-y-2">
          {[
            { label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', fn: () => sendViaWhatsApp(selectedInstruction) },
            { label: 'SMS', icon: <MessageSquare className="w-4 h-4" />, cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100', fn: () => { if (clientPhone) window.location.href = `sms:${clientPhone}&body=${encodeURIComponent(getInstructionContent(selectedInstruction))}` } },
            { label: isHe ? 'הורד' : 'Скачать', icon: <Download className="w-4 h-4" />, cls: 'bg-gray-100 text-gray-700 hover:bg-gray-200', fn: () => {
              const blob = new Blob([`${getInstructionTitle(selectedInstruction)}\n\n${getInstructionContent(selectedInstruction)}`], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${getInstructionTitle(selectedInstruction)}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
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
    const total = (visit.price || 0) + visitServices.reduce((s: number, vs: any) => s + (vs.price || 0), 0)
    return (
      <div className="flex flex-col" style={{ minHeight: '55vh', padding: '16px 16px 20px' }}>
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {displayServiceName && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><Scissors className="w-4 h-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayServiceName}</p>
                {visit.duration_minutes > 0 && <p className="text-xs text-gray-400">{formatDuration(visit.duration_minutes)}</p>}
              </div>
              {(visit.price || 0) > 0 && <span className="text-sm font-bold text-gray-700 flex-shrink-0">₪{visit.price}</span>}
            </div>
          )}
          {visitServices.length === 0 && !displayServiceName
            ? <div className="flex flex-col items-center justify-center py-12 text-gray-300"><Scissors className="w-10 h-10 mb-3" /><p className="text-sm">{isHe ? 'לא נוספו שירותים' : 'Нет добавленных услуг'}</p></div>
            : visitServices.map((vs: any) => {
              const name = isHe ? vs.service_name : (vs.service_name_ru || vs.service_name)
              const isProduct = !vs.service_id && vs.duration_minutes === 0
              return (
                <div key={vs.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isProduct ? 'bg-amber-100' : 'bg-blue-100'}`}>
                    {isProduct ? <Package className="w-4 h-4 text-amber-600" /> : <Scissors className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                    {vs.duration_minutes > 0 && <p className="text-xs text-gray-400">{formatDuration(vs.duration_minutes)}</p>}
                  </div>
                  {vs.price > 0 && <span className="text-sm font-bold text-gray-700 flex-shrink-0">₪{vs.price}</span>}
                  <button onClick={() => { removeVisitService.mutate(vs.id); setPriceOffset(p => p - vs.price) }} className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )
            })
          }
        </div>
        {(visitServices.length > 0 || (visit.price || 0) > 0) && (
          <div className="flex justify-between items-center py-2 border-t border-gray-100 mb-3">
            <span className="text-sm font-semibold text-gray-500">{isHe ? 'סה״כ' : 'Итого'}</span>
            <span className="text-base font-bold text-emerald-600">₪{total}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setServiceSearch(''); setServicePage(1); setViewMode('add-service'); if (servicesList.length === 0) fetchServices() }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all text-sm font-semibold"><Plus className="w-4 h-4" />{isHe ? 'שירות' : 'Услуга'}</button>
          <button onClick={() => { setProductSearch(''); setProductPage(1); setViewMode('add-product'); if (productsList.length === 0) fetchProducts() }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all text-sm font-semibold"><Plus className="w-4 h-4" />{isHe ? 'מוצר' : 'Товар'}</button>
        </div>
      </div>
    )
  }

  const renderAddService = () => {
    const filtered = servicesList.filter(s => { if (serviceSearch.length < 2) return true; const q = serviceSearch.toLowerCase(); return s.name.toLowerCase().includes(q) || (s.name_ru || '').toLowerCase().includes(q) })
    const totalPg = Math.ceil(filtered.length / PAGE_SIZE)
    const paged = filtered.slice((servicePage - 1) * PAGE_SIZE, servicePage * PAGE_SIZE)
    return (
      <div className="flex flex-col" style={{ minHeight: '55vh', padding: '16px 16px 20px' }}>
        <input type="text" value={serviceSearch} onChange={e => { setServiceSearch(e.target.value); setServicePage(1) }} placeholder={isHe ? 'חיפוש...' : 'Поиск...'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3" />
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          : paged.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{isHe ? 'אין שירותים' : 'Нет услуг'}</p>
          : paged.map(s => {
            const name = isHe ? s.name : (s.name_ru || s.name)
            return (
              <button key={s.id} onClick={() => handleAddService(s)} disabled={!!addingItem} className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-98 transition-all disabled:opacity-60 group">
                <div className="text-start"><p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{name}</p>{s.duration_minutes ? <p className="text-xs text-gray-400 mt-0.5">{formatDuration(s.duration_minutes)}</p> : null}</div>
                <div className="flex items-center gap-2">{(s.price || 0) > 0 && <span className="text-sm font-bold text-gray-600">₪{s.price}</span>}{addingItem === s.id ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Plus className="w-4 h-4 text-blue-400" />}</div>
              </button>
            )
          })}
        </div>
        {totalPg > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400">
            <button onClick={() => setServicePage(p => Math.max(1, p - 1))} disabled={servicePage === 1} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /></button>
            <span>{(servicePage - 1) * PAGE_SIZE + 1}–{Math.min(servicePage * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <button onClick={() => setServicePage(p => Math.min(totalPg, p + 1))} disabled={servicePage === totalPg} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
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
      <div className="flex flex-col" style={{ minHeight: '55vh', padding: '16px 16px 20px' }}>
        <input type="text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setProductPage(1) }} placeholder={isHe ? 'חיפוש...' : 'Поиск...'} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-200 mb-3" />
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          : paged.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{isHe ? 'אין מוצרים' : 'Нет товаров'}</p>
          : paged.map(p => (
            <button key={p.id} onClick={() => handleAddProduct(p)} disabled={!!addingItem} className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-98 transition-all disabled:opacity-60 group">
              <div className="flex items-center gap-3 text-start min-w-0">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-amber-500" /></div>}
                <div className="min-w-0"><p className="font-semibold text-sm text-gray-900 truncate group-hover:text-amber-600 transition-colors">{p.name}</p>{p.category && <p className="text-xs text-gray-400">{p.category}</p>}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-gray-600">₪{p.sell_price}</span>
                {addingItem === p.id ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Plus className="w-4 h-4 text-amber-400" />}
              </div>
            </button>
          ))}
        </div>
        {totalPg > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400">
            <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /></button>
            <span>{(productPage - 1) * PAGE_SIZE + 1}–{Math.min(productPage * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <button onClick={() => setProductPage(p => Math.min(totalPg, p + 1))} disabled={productPage === totalPg} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    )
  }

  // ── Sidebar for sub-views (compact, no action buttons) ────────────────────
  const subViewTitle: Record<string, { ru: string; he: string }> = {
    services:        { ru: 'Услуги и товары', he: 'שירותים ומוצרים' },
    'add-service':   { ru: 'Добавить услугу', he: 'הוסף שירות' },
    'add-product':   { ru: 'Добавить товар',  he: 'הוסף מוצר' },
    instructions:    { ru: 'Инструкции',      he: 'הוראות' },
    'send-instruction': { ru: 'Отправить',    he: 'שלח' },
  }

  const subSidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {getInitials(clientName)}
        </div>
      </div>
      {clientPhone && (
        <a href={`tel:${clientPhone}`} dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 8, textDecoration: 'none' }}>
          <Phone size={11} />{clientPhone}
        </a>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, marginBottom: 12, alignSelf: 'center', background: `${statusCfg.color}20`, border: `0.5px solid ${statusCfg.color}50` }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.color }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: statusCfg.color }}>{statusLabel}</span>
      </div>
      {/* Total for services subview */}
      {(visitServices.length > 0 || (visit.price || 0) > 0) && (
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>
            ₪{(visit.price || 0) + visitServices.reduce((s: number, vs: any) => s + (vs.price || 0), 0)}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{isHe ? 'סה״כ' : 'Итого'}</div>
        </div>
      )}
      <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '4px 0 10px' }} />
      <button onClick={() => setViewMode('main')} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 10px',borderRadius:9,border:'0.5px solid rgba(255,255,255,0.1)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:500 }}>
        <ArrowLeft size={13} />{isHe ? 'חזרה לביקור' : 'Назад к визиту'}
      </button>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  const isSubView = viewMode !== 'main'
  const isSimpleSubView = viewMode === 'instructions' || viewMode === 'send-instruction'
  const subTitle = subViewTitle[viewMode] ? (isHe ? subViewTitle[viewMode].he : subViewTitle[viewMode].ru) : ''

  return (
    <Modal open={isOpen} onClose={onClose} title={undefined} width="680px" dir={dir} showCloseButton darkHeader contentClassName="!p-0">
      {isSimpleSubView ? (
        // Instructions sub-views: simple layout (no sidebar needed)
        <div style={{ background: '#f8f9fc', minHeight: 400 }}>
          {viewMode === 'instructions'     && renderInstructionsList()}
          {viewMode === 'send-instruction' && renderSendInstruction()}
        </div>
      ) : isSubView ? (
        // Services sub-views: TrinityModalShell with compact sidebar
        <TrinityModalShell
          open={isOpen}
          onClose={onClose}
          icon={<Scissors />}
          title={clientName}
          subtitle={subTitle}
          dir={dir}
          sidebarExtra={subSidebarContent}
        >
          {viewMode === 'services'    && renderServices()}
          {viewMode === 'add-service' && renderAddService()}
          {viewMode === 'add-product' && renderAddProduct()}
        </TrinityModalShell>
      ) : (
        // Main view
        <TrinityModalShell
          open={isOpen}
          onClose={onClose}
          icon={<Calendar />}
          title={clientName}
          subtitle={displayServiceName || (isHe ? 'פרטי ביקור' : 'Детали визита')}
          dir={dir}
          sidebarExtra={sidebarContent}
        >
          {renderMainContent()}
        </TrinityModalShell>
      )}
    </Modal>
  )
}
