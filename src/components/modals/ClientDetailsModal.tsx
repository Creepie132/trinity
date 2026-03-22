'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { Pencil, Phone, MessageCircle, MessageSquare, Trash2, ShoppingCart, X, ChevronRight, Images, FileText } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl, buildVisitRef } from '@/lib/message-utils'

const AVATAR_GRADIENTS: [string, string][] = [
  ['#818cf8', '#a78bfa'],
  ['#34d399', '#0d9488'],
  ['#fbbf24', '#f97316'],
  ['#f472b6', '#ec4899'],
  ['#60a5fa', '#38bdf8'],
  ['#a78bfa', '#818cf8'],
]
function avGrad(name: string): [string, string] {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const [showGdprDialog, setShowGdprDialog] = useState(false)
  const { templates } = useOrgTemplates()

  const [showPicker, setShowPicker]       = useState(false)
  const [pickerType, setPickerType]       = useState<'visit' | 'product' | null>(null)
  const [pickerItems, setPickerItems]     = useState<any[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pendingVars, setPendingVars]     = useState<Record<string, string>>({})

  const isOpen = isModalOpen('client-details')
  const data   = getModalData('client-details')

  if (!data?.client || !isOpen) return null

  const { client, locale = 'he' } = data
  const clientName = getClientName(client)
  const initials   = getClientInitials(client)
  const [g1, g2]   = avGrad(clientName || '?')
  const isHe       = locale === 'he'

  const visitsCount = client.visits_count || client.total_visits || 0
  const totalPaid   = client.total_paid   || 0

  const T = {
    he: { information:'מידע', visits:'ביקורים', totalPaid:'שולם', gallery:'גלריה', documents:'מסמכים',
          notes:'הערות', description:'תיאור', createdAt:'תאריך יצירה', edit:'ערוך', sale:'עסקה',
          delete:'מחק', active:'פעיל', call:'התקשר', whatsapp:'WhatsApp', sms:'SMS',
          address:'כתובת', birthday:'יום הולדת', open:'פתח' },
    ru: { information:'Информация', visits:'Визитов', totalPaid:'Оплачено', gallery:'Галерея',
          documents:'Документы', notes:'Заметки', description:'Описание', createdAt:'Дата создания',
          edit:'Редактировать', sale:'Продажа', delete:'Удалить', active:'Активен',
          call:'Позвонить', whatsapp:'WhatsApp', sms:'SMS', address:'Адрес', birthday:'День рождения', open:'Открыть' },
    en:  { information:'Information', visits:'Visits', totalPaid:'Paid', gallery:'Gallery',
          documents:'Documents', notes:'Notes', description:'Description', createdAt:'Created',
          edit:'Edit', sale:'Sale', delete:'Delete', active:'Active',
          call:'Call', whatsapp:'WhatsApp', sms:'SMS', address:'Address', birthday:'Birthday', open:'Open' },
  }
  const t = T[locale as keyof typeof T] || T.he

  const handleEditClick   = () => { closeModal('client-details'); openModal('client-edit',  { client, locale }) }
  const handleSaleClick   = () => { closeModal('client-details'); openModal('client-sale',  { client, locale }) }
  const handleCall        = () => { if (client.phone) window.location.href = `tel:${client.phone}` }
  const handleSMS         = () => { if (client.phone) window.location.href = `sms:${client.phone}` }
  const handleDeleteClick = () => setShowGdprDialog(true)

  const needsVisitRef   = templates?.whatsapp_template?.includes('{visit_ref}')
  const needsProductRef = templates?.whatsapp_template?.includes('{product_ref}')

  async function openWhatsAppWithVars(vars: Record<string, string>) {
    if (!client.phone) return
    const msg = templates?.whatsapp_template
      ? buildMessage(templates.whatsapp_template, { client_name: clientName, org_name: templates.org_name, ...vars })
      : undefined
    window.open(buildWhatsAppUrl(client.phone, msg), '_blank')
  }

  async function handleWhatsApp() {
    if (!client.phone) return
    if (needsVisitRef) {
      setPickerLoading(true); setPickerType('visit'); setShowPicker(true); setPendingVars({})
      try { const r = await fetch(`/api/clients/${client.id}/visits`); setPickerItems(r.ok ? (await r.json()).slice(0,10) : []) }
      catch { setPickerItems([]) }
      setPickerLoading(false); return
    }
    if (needsProductRef) {
      setPickerLoading(true); setPickerType('product'); setShowPicker(true); setPendingVars({})
      try { const r = await fetch('/api/products'); const d = r.ok ? await r.json() : []; setPickerItems((d.products||d).slice(0,20)) }
      catch { setPickerItems([]) }
      setPickerLoading(false); return
    }
    openWhatsAppWithVars({})
  }

  function handlePickerSelect(item: any) {
    setShowPicker(false)
    if (pickerType === 'visit') {
      const visitRef = buildVisitRef({ date: item.scheduled_at || item.created_at, locale: locale as 'he'|'ru' })
      const vars = { ...pendingVars, visit_ref: visitRef }
      if (needsProductRef) {
        setPendingVars(vars); setPickerLoading(true); setPickerType('product'); setShowPicker(true)
        fetch('/api/products').then(r=>r.ok?r.json():[]).then(d=>{setPickerItems((d.products||d).slice(0,20));setPickerLoading(false)}).catch(()=>{setPickerItems([]);setPickerLoading(false)})
        return
      }
      openWhatsAppWithVars(vars)
    } else if (pickerType === 'product') {
      openWhatsAppWithVars({ ...pendingVars, product_ref: item.name })
    }
  }

  function handlePickerSkip() {
    setShowPicker(false)
    if (pickerType === 'visit' && needsProductRef) {
      setPickerLoading(true); setPickerType('product'); setShowPicker(true)
      fetch('/api/products').then(r=>r.ok?r.json():[]).then(d=>{setPickerItems((d.products||d).slice(0,20));setPickerLoading(false)}).catch(()=>{setPickerItems([]);setPickerLoading(false)})
      return
    }
    openWhatsAppWithVars(pendingVars)
  }

  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => closeModal('client-details')}
        showCloseButton={true}
        width="640px"
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="!p-0"
        footer={
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <button onClick={handleEditClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95">
              <Pencil className="w-5 h-5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-700">{t.edit}</span>
            </button>
            <button onClick={handleSaleClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 transition-all active:scale-95">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">{t.sale}</span>
            </button>
            <button onClick={handleDeleteClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-red-50 hover:bg-red-100 transition-all active:scale-95">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span className="text-[11px] font-semibold text-red-700">{t.delete}</span>
            </button>
            {client.phone && <>
              <button onClick={handleCall}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-all active:scale-95">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-[11px] font-semibold text-blue-700">{t.call}</span>
              </button>
              <button onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-green-50 hover:bg-green-100 transition-all active:scale-95">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-[11px] font-semibold text-green-700">WhatsApp</span>
              </button>
              <button onClick={handleSMS}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-purple-50 hover:bg-purple-100 transition-all active:scale-95">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="text-[11px] font-semibold text-purple-700">SMS</span>
              </button>
            </>}
          </div>
        }
      >
        {/* ── Dark header ──────────────────────────────────────────────────── */}
        <div style={{ background: '#0f172a', borderRadius: '16px 16px 0 0' }}>

          {/* Top: avatar + name + status */}
          <div className="flex items-center gap-4 px-6 pt-6 pb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{clientName}</h2>
              {client.phone && (
                <a href={`tel:${client.phone}`} dir="ltr"
                  className="text-slate-400 text-sm hover:text-white flex items-center gap-1.5 mt-0.5 w-fit transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </a>
              )}
              {client.email && (
                <p className="text-slate-500 text-xs mt-0.5 truncate">{client.email}</p>
              )}
            </div>
            {/* Active badge */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#34d399' }} />
              <span className="text-xs font-semibold" style={{ color: '#34d399' }}>{t.active}</span>
            </div>
          </div>

          {/* Stats row — divider lines */}
          <div className="grid grid-cols-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Paid */}
            <div className="flex flex-col items-center py-4 px-2 text-center"
              style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-xl font-bold" style={{ color: '#a78bfa' }}>
                ₪{Number(totalPaid).toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: '#64748b' }}>
                {t.totalPaid}
              </span>
            </div>

            {/* Visits */}
            <div className="flex flex-col items-center py-4 px-2 text-center"
              style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-xl font-bold" style={{ color: '#60a5fa' }}>
                {visitsCount}
              </span>
              <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: '#64748b' }}>
                {t.visits}
              </span>
            </div>

            {/* Gallery */}
            <button
              onClick={() => openModal('client-gallery', { client, locale })}
              className="flex flex-col items-center py-4 px-2 text-center transition-colors"
              style={{ borderRight: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Images className="w-5 h-5 mb-1" style={{ color: '#a78bfa' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                {t.gallery}
              </span>
            </button>

            {/* Documents */}
            <button
              onClick={() => openModal('client-documents', { client, locale })}
              className="flex flex-col items-center py-4 px-2 text-center transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <FileText className="w-5 h-5 mb-1" style={{ color: '#60a5fa' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                {t.documents}
              </span>
            </button>
          </div>
        </div>

        {/* ── Light body ───────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-4">

          {/* Info fields — 2 columns */}
          {(client.email || client.address || client.date_of_birth || client.created_at) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">{t.information}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {client.email && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-gray-400 font-medium">Email</span>
                    <span className="text-sm font-semibold text-gray-800 truncate ms-3">{client.email}</span>
                  </div>
                )}
                {(client.address || client.city) && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-gray-400 font-medium">{t.address}</span>
                    <span className="text-sm font-semibold text-gray-800 truncate ms-3">
                      {[client.address, client.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {client.date_of_birth && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-gray-400 font-medium">{t.birthday}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(client.date_of_birth).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}
                    </span>
                  </div>
                )}
                {client.created_at && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-gray-400 font-medium">{t.createdAt}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(client.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">{t.notes}</p>
              <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {client.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">{t.description}</p>
              <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.description}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* GDPR */}
      <GdprDeleteDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        clientId={client.id}
        clientName={clientName}
        locale={locale as 'he'|'ru'}
      />

      {/* WA / Product Picker */}
      {showPicker && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ animation: 'fadeInOverlay 0.2s ease' }}
          onClick={() => setShowPicker(false)}>
          <style>{`
            @keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}
            @keyframes slideUpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
          `}</style>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl w-full max-w-lg"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-base">
                  {pickerType==='visit' ? (isHe?'📅 בחר ביקור':'📅 Выберите визит') : (isHe?'🛍️ בחר מוצר':'🛍️ Выберите товар')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isHe ? 'יוכנס לתבנית WhatsApp' : 'Будет вставлено в шаблон'}
                </p>
              </div>
              <button onClick={() => setShowPicker(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 py-3 max-h-72 overflow-y-auto">
              {pickerLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse"/>)}
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🗓️</p>
                  <p className="text-sm text-gray-400">{isHe?'אין פריטים':'Нет элементов'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pickerItems.map((item: any, idx: number) => {
                    const dateStr = new Date(item.scheduled_at||item.created_at).toLocaleDateString(isHe?'he-IL':'ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'})
                    const timeStr = item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString(isHe?'he-IL':'ru-RU',{hour:'2-digit',minute:'2-digit'}) : null
                    return (
                      <button key={item.id} onClick={() => handlePickerSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 active:scale-[0.98] transition-all text-start group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 font-bold text-sm">
                          {pickerType==='visit' ? timeStr?.split(':')[0]||'—' : '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {pickerType==='visit' ? `${dateStr}${timeStr?` · ${timeStr}`:''}` : item.name}
                          </p>
                          {pickerType==='product'&&item.price && <p className="text-xs text-gray-400">₪{item.price}</p>}
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0"/>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-5 pb-8 pt-2 border-t border-gray-100">
              <button onClick={handlePickerSkip}
                className="w-full py-3 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-400 hover:bg-gray-50 transition">
                {isHe?'דלג — שלח ללא ביקור ספציפי':'Пропустить — отправить без выбора'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
