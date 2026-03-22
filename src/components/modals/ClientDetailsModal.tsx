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

const AVATAR_GRADIENTS = [
  ['#8B5CF6','#6366F1'], ['#10B981','#0D9488'], ['#F59E0B','#EF4444'],
  ['#EC4899','#F43F5E'], ['#3B82F6','#06B6D4'], ['#8B5CF6','#A855F7'],
]
function avGrad(name: string) {
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

  const visitsCount = client.visits_count || client.total_visits || 0
  const totalPaid   = client.total_paid   || 0
  const isHe        = locale === 'he'

  // ─── Labels ────────────────────────────────────────────────────────────────
  const T = {
    he: { information:'מידע', visits:'ביקורים', totalPaid:'סה"כ שולם', gallery:'גלריה', documents:'מסמכים',
          notes:'הערות', description:'תיאור', createdAt:'תאריך יצירה', edit:'ערוך', sale:'עסקה',
          delete:'מחק', active:'פעיל', call:'התקשר', whatsapp:'WhatsApp', sms:'SMS',
          address:'כתובת', birthday:'יום הולדת' },
    ru: { information:'Информация', visits:'Визитов', totalPaid:'Всего оплачено', gallery:'Галерея',
          documents:'Документы', notes:'Заметки', description:'Описание', createdAt:'Дата создания',
          edit:'Редактировать', sale:'Продажа', delete:'Удалить', active:'Активен',
          call:'Позвонить', whatsapp:'WhatsApp', sms:'SMS', address:'Адрес', birthday:'День рождения' },
    en:  { information:'Information', visits:'Visits', totalPaid:'Total Paid', gallery:'Gallery',
          documents:'Documents', notes:'Notes', description:'Description', createdAt:'Created',
          edit:'Edit', sale:'Sale', delete:'Delete', active:'Active',
          call:'Call', whatsapp:'WhatsApp', sms:'SMS', address:'Address', birthday:'Birthday' },
  }
  const t = T[locale as keyof typeof T] || T.he

  // ─── Actions ───────────────────────────────────────────────────────────────
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => closeModal('client-details')}
        showCloseButton={true}
        width="660px"
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="!p-0"
        footer={
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {/* Edit */}
            <button onClick={handleEditClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all active:scale-95">
              <Pencil className="w-5 h-5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-700">{t.edit}</span>
            </button>
            {/* Sale */}
            <button onClick={handleSaleClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 transition-all active:scale-95">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">{t.sale}</span>
            </button>
            {/* Delete */}
            <button onClick={handleDeleteClick}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-red-50 hover:bg-red-100 transition-all active:scale-95">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span className="text-[11px] font-semibold text-red-700">{t.delete}</span>
            </button>
            {/* Call */}
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
        {/* ── Gradient header ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)` }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}/>
          <div className="relative px-6 py-6 flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white truncate">{clientName}</h2>
              {client.phone && (
                <a href={`tel:${client.phone}`} dir="ltr"
                  className="text-indigo-200 text-sm hover:text-white flex items-center gap-1.5 mt-0.5 w-fit transition-colors">
                  <Phone className="w-3.5 h-3.5" />{client.phone}
                </a>
              )}
              {client.email && (
                <p className="text-indigo-200/80 text-xs mt-0.5 truncate">{client.email}</p>
              )}
            </div>
            {/* Status badge */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
              <span className="text-white text-xs font-semibold">{t.active}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative px-6 pb-5 grid grid-cols-4 gap-3">
            {/* Visits */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white">{visitsCount}</p>
              <p className="text-indigo-200 text-[10px] font-semibold mt-0.5 uppercase tracking-wide">{t.visits}</p>
            </div>
            {/* Paid */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white">₪{Number(totalPaid).toLocaleString()}</p>
              <p className="text-indigo-200 text-[10px] font-semibold mt-0.5 uppercase tracking-wide">{t.totalPaid}</p>
            </div>
            {/* Gallery */}
            <button onClick={() => openModal('client-gallery', { client, locale })}
              className="bg-white/15 backdrop-blur-sm hover:bg-white/25 rounded-2xl p-3 text-center transition-all active:scale-95 cursor-pointer">
              <div className="flex justify-center mb-1"><Images className="w-5 h-5 text-white"/></div>
              <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-wide">{t.gallery}</p>
            </button>
            {/* Documents */}
            <button onClick={() => openModal('client-documents', { client, locale })}
              className="bg-white/15 backdrop-blur-sm hover:bg-white/25 rounded-2xl p-3 text-center transition-all active:scale-95 cursor-pointer">
              <div className="flex justify-center mb-1"><FileText className="w-5 h-5 text-white"/></div>
              <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-wide">{t.documents}</p>
            </button>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">

          {/* Info fields */}
          {(client.email || client.address || client.date_of_birth || client.created_at) && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{t.information}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {client.email && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs text-gray-400 font-medium">Email</span>
                    <span className="text-sm font-semibold text-gray-800 truncate ms-3">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs text-gray-400 font-medium">{t.address}</span>
                    <span className="text-sm font-semibold text-gray-800 truncate ms-3">
                      {[client.address, client.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {client.date_of_birth && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs text-gray-400 font-medium">{t.birthday}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(client.date_of_birth).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}
                    </span>
                  </div>
                )}
                {client.created_at && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
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
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{t.notes}</h3>
              <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {client.description && (
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{t.description}</h3>
              <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.description}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* GDPR Delete Dialog */}
      <GdprDeleteDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        clientId={client.id}
        clientName={clientName}
        locale={locale as 'he'|'ru'}
      />

      {/* Picker bottom sheet */}
      {showPicker && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ animation: 'fadeInOverlay 0.2s ease' }}
          onClick={() => setShowPicker(false)}>
          <style>{`
            @keyframes fadeInOverlay { from{opacity:0}to{opacity:1} }
            @keyframes slideUpSheet { from{transform:translateY(100%)}to{transform:translateY(0)} }
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
              <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
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
