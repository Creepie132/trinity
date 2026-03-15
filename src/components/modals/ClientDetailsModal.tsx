'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { Pencil, Phone, MessageCircle, MessageSquare, Trash2, ShoppingCart, X, ChevronRight } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl, buildVisitRef } from '@/lib/message-utils'

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const [showGdprDialog, setShowGdprDialog] = useState(false)
  const { templates } = useOrgTemplates()

  // Picker state
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState<'visit' | 'product' | null>(null)
  const [pickerItems, setPickerItems] = useState<any[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pendingVars, setPendingVars] = useState<Record<string, string>>({})
  
  const isOpen = isModalOpen('client-details')
  const data = getModalData('client-details')
  
  if (!data?.client || !isOpen) return null

  const { client, locale = 'he' } = data

  const clientName = getClientName(client)
  const initials = getClientInitials(client)

  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  const colorIndex = clientName.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIndex]

  const visitsCount = client.visits_count || client.total_visits || 0
  const totalPaid = client.total_paid || 0

  const t = {
    he: {
      information: 'מידע',
      visits: 'ביקורים',
      totalPaid: 'סה"כ שולם',
      notes: 'הערות',
      createdAt: 'תאריך יצירה',
      edit: 'ערוך',
      sale: 'עסקה',
      delete: 'מחק',
      status: 'סטטוס',
      active: 'פעיל',
      call: 'התקשר',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
    ru: {
      information: 'Информация',
      visits: 'Визитов',
      totalPaid: 'Всего оплачено',
      notes: 'Заметки',
      createdAt: 'Дата создания',
      edit: 'Редактировать',
      sale: 'Продажа',
      delete: 'Удалить',
      status: 'Статус',
      active: 'Активен',
      call: 'Позвонить',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
    en: {
      information: 'Information',
      visits: 'Visits',
      totalPaid: 'Total Paid',
      notes: 'Notes',
      createdAt: 'Date Created',
      edit: 'Edit',
      sale: 'Sale',
      delete: 'Delete',
      status: 'Status',
      active: 'Active',
      call: 'Call',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    },
  }

  const text = t[locale as keyof typeof t] || t.he

  const handleEditClick = () => {
    closeModal('client-details')
    openModal('client-edit', { client, locale })
  }

  const handleSaleClick = () => {
    closeModal('client-details')
    openModal('client-sale', { client, locale })
  }

  const handleCall = () => {
    if (client.phone) {
      window.location.href = `tel:${client.phone}`
    }
  }

  const needsVisitRef  = templates?.whatsapp_template?.includes('{visit_ref}')
  const needsProductRef = templates?.whatsapp_template?.includes('{product_ref}')

  async function openWhatsAppWithVars(vars: Record<string, string>) {
    if (!client.phone) return
    const text = templates?.whatsapp_template
      ? buildMessage(templates.whatsapp_template, {
          client_name: clientName,
          org_name: templates.org_name,
          ...vars,
        })
      : undefined
    window.open(buildWhatsAppUrl(client.phone, text), '_blank')
  }

  async function handleWhatsApp() {
    if (!client.phone) return
    // If template needs visit_ref — show visit picker first
    if (needsVisitRef) {
      setPickerLoading(true)
      setPickerType('visit')
      setShowPicker(true)
      setPendingVars({})
      try {
        const res = await fetch(`/api/clients/${client.id}/visits`)
        const items = res.ok ? await res.json() : []
        setPickerItems(items.slice(0, 10))
      } catch { setPickerItems([]) }
      setPickerLoading(false)
      return
    }
    // If template needs product_ref — show product picker
    if (needsProductRef) {
      setPickerLoading(true)
      setPickerType('product')
      setShowPicker(true)
      setPendingVars({})
      try {
        const res = await fetch('/api/products')
        const data = res.ok ? await res.json() : []
        setPickerItems((data.products || data).slice(0, 20))
      } catch { setPickerItems([]) }
      setPickerLoading(false)
      return
    }
    // No special vars needed
    openWhatsAppWithVars({})
  }

  function handlePickerSelect(item: any) {
    setShowPicker(false)
    if (pickerType === 'visit') {
      const serviceName = item.visit_services?.[0]?.service_name
        || item.visit_services?.[0]?.service_name_ru
        || item.services?.name
        || item.services?.name_ru
        || undefined
      const visitRef = buildVisitRef({
        date: item.scheduled_at || item.created_at,
        locale: locale as 'he' | 'ru',
      })
      const vars = { ...pendingVars, visit_ref: visitRef }
      // If also needs product_ref — chain to product picker
      if (needsProductRef) {
        setPendingVars(vars)
        setPickerLoading(true)
        setPickerType('product')
        setShowPicker(true)
        fetch('/api/products')
          .then(r => r.ok ? r.json() : [])
          .then(data => { setPickerItems((data.products || data).slice(0, 20)); setPickerLoading(false) })
          .catch(() => { setPickerItems([]); setPickerLoading(false) })
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
      setPickerLoading(true)
      setPickerType('product')
      setShowPicker(true)
      fetch('/api/products')
        .then(r => r.ok ? r.json() : [])
        .then(data => { setPickerItems((data.products || data).slice(0, 20)); setPickerLoading(false) })
        .catch(() => { setPickerItems([]); setPickerLoading(false) })
      return
    }
    openWhatsAppWithVars(pendingVars)
  }

  const handleSMS = () => {
    if (client.phone) {
      window.location.href = `sms:${client.phone}`
    }
  }

  const handleDeleteClick = () => {
    setShowGdprDialog(true)
  }

  return (
    <>
      <Modal
        open={isOpen}
        onClose={() => closeModal('client-details')}
        showCloseButton={true}
        width="480px"
        dir={locale === 'he' ? 'rtl' : 'ltr'}
        footer={
          <div className="space-y-2">
            {/* Ряд 1: Редактировать + Продажа + Удалить */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleEditClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition"
              >
                <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100">
                  {text.edit}
                </span>
              </button>

              <button
                onClick={handleSaleClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-medium text-amber-900 dark:text-amber-100">
                  {text.sale}
                </span>
              </button>

              <button
                onClick={handleDeleteClick}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-medium text-red-900 dark:text-red-100">
                  {text.delete}
                </span>
              </button>
            </div>

            {/* Ряд 2: Позвонить + WhatsApp + SMS */}
            {client.phone && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleCall}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition"
                >
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-medium text-blue-900 dark:text-blue-100">
                    {text.call}
                  </span>
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition"
                >
                  <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] font-medium text-green-900 dark:text-green-100">
                    {text.whatsapp}
                  </span>
                </button>

                <button
                  onClick={handleSMS}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition"
                >
                  <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-[10px] font-medium text-purple-900 dark:text-purple-100">
                    {text.sms}
                  </span>
                </button>
              </div>
            )}
          </div>
        }
      >
        {/* ШАПКА с аватаром */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`${avatarColor} w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate text-gray-900 dark:text-gray-100">{clientName}</h2>
            {client.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{client.phone}</p>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium mt-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {text.active}
            </div>
          </div>
        </div>

        {/* Статистика — два числа рядом */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{visitsCount}</p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">{text.visits}</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">₪{Number(totalPaid).toLocaleString()}</p>
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">{text.totalPaid}</p>
          </div>
        </div>

        {/* Секция "Информация" */}
        <div className="mb-4">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 tracking-widest uppercase">
            {text.information}
          </h3>
          <div className="space-y-1.5">
            {client.email && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400">Email</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate ml-4">{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400">{locale === 'he' ? 'כתובת' : 'Адрес'}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate ml-4">
                  {[client.address, client.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {client.date_of_birth && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400">{locale === 'he' ? 'יום הולדת' : 'День рождения'}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {new Date(client.date_of_birth).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                </span>
              </div>
            )}
            {client.created_at && (
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-400">{text.createdAt}</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {new Date(client.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Заметки — только если есть */}
        {client.notes && (
          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-2 tracking-widest uppercase">
              {text.notes}
            </h3>
            <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* GDPR Delete Dialog */}
      <GdprDeleteDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        clientId={client.id}
        clientName={clientName}
        locale={locale as 'he' | 'ru'}
      />

      {/* Visit / Product Picker — portal, animated */}
      {showPicker && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ animation: 'fadeInOverlay 0.2s ease' }}
          onClick={() => setShowPicker(false)}
        >
          <style>{`
            @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
            .picker-shimmer { background: linear-gradient(90deg, var(--muted) 25%, var(--muted-foreground/10) 50%, var(--muted) 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
            @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
          `}</style>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-background rounded-t-3xl shadow-2xl w-full max-w-lg"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-muted">
              <div>
                <p className="font-semibold text-base">
                  {pickerType === 'visit'
                    ? (locale === 'he' ? '📅 בחר ביקור' : '📅 Выберите визит')
                    : (locale === 'he' ? '🛍️ בחר מוצר' : '🛍️ Выберите товар')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === 'he' ? 'יוכנס לתבנית WhatsApp' : 'Будет вставлено в шаблон WhatsApp'}
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div className="px-3 py-3 max-h-72 overflow-y-auto">
              {pickerLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 rounded-2xl picker-shimmer opacity-60" />
                  ))}
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🗓️</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'he' ? 'אין פריטים' : 'Нет элементов'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pickerItems.map((item: any, idx: number) => {
                    const serviceName = item.visit_services?.[0]?.service_name
                      || item.visit_services?.[0]?.service_name_ru
                      || item.services?.name
                      || item.services?.name_ru
                      || null
                    const dateStr = new Date(item.scheduled_at || item.created_at)
                      .toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    const timeStr = item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : null
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePickerSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-all text-start group"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                          {pickerType === 'visit' ? timeStr?.split(':')[0] || '—' : '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {pickerType === 'visit'
                              ? `${dateStr}${timeStr ? ` · ${timeStr}` : ''}`
                              : item.name}
                          </p>
                          {pickerType === 'visit' && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[serviceName, item.price ? `₪${item.price}` : null]
                                .filter(Boolean).join(' · ') || '—'}
                            </p>
                          )}
                          {pickerType === 'product' && item.price && (
                            <p className="text-xs text-muted-foreground">₪{item.price}</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Skip */}
            <div className="px-5 pb-8 pt-2 border-t border-muted">
              <button
                onClick={handlePickerSkip}
                className="w-full py-3 rounded-2xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:bg-muted/40 transition"
              >
                {locale === 'he' ? 'דלג — שלח ללא ביקור ספציפי' : 'Пропустить — отправить без выбора'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
