'use client'

/**
 * ClientBottomSheet — мобильная карточка клиента.
 * Рендерит TrinityMob (свайп-шторка) + WA-picker портал + EditClientSheet.
 */

import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { TrinityMob } from '@/components/ui/TrinityMob'
import { EditClientSheet } from './EditClientSheet'
import { GdprDeleteDialog } from './GdprDeleteDialog'
import { createPortal } from 'react-dom'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl, buildVisitRef } from '@/lib/message-utils'
import { getClientName } from '@/lib/client-utils'
import { useModalStore } from '@/store/useModalStore'

interface ClientBottomSheetProps {
  client: {
    id: string
    first_name?: string
    last_name?: string
    name?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    date_of_birth?: string
    description?: string
    visits_count?: number
    total_visits?: number
    total_paid?: number | string
    last_visit?: string
    notes?: string
    created_at?: string
    paint_code?: string
    card_token?: string
    card_last4?: string
  }
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  isDemo?: boolean
  enabledModules?: Record<string, boolean>
  onEdit?: (client: any) => void
  onDelete?: (clientId: string) => void
}

export function ClientBottomSheet({
  client, isOpen, onClose, locale,
  isDemo, enabledModules, onEdit, onDelete,
}: ClientBottomSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { openModal } = useModalStore()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState<'visit' | 'product' | null>(null)
  const [pickerItems, setPickerItems] = useState<any[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pendingVars, setPendingVars] = useState<Record<string, string>>({})

  const { templates } = useOrgTemplates()
  const clientName = getClientName(client)

  const needsVisitRef = templates?.whatsapp_template?.includes('{visit_ref}')
  const needsProductRef = templates?.whatsapp_template?.includes('{product_ref}')

  function openWhatsAppWithVars(vars: Record<string, string>) {
    if (!client.phone) return
    const text = templates?.whatsapp_template
      ? buildMessage(templates.whatsapp_template, { client_name: clientName, org_name: templates?.org_name, ...vars })
      : undefined
    window.open(buildWhatsAppUrl(client.phone, text), '_blank')
  }

  async function handleWhatsAppClick() {
    if (!client.phone) return
    if (needsVisitRef) {
      setPickerLoading(true); setPickerType('visit'); setShowPicker(true); setPendingVars({})
      try { const r = await fetch(`/api/clients/${client.id}/visits`); setPickerItems(r.ok ? (await r.json()).slice(0, 10) : []) }
      catch { setPickerItems([]) }
      setPickerLoading(false); return
    }
    if (needsProductRef) {
      setPickerLoading(true); setPickerType('product'); setShowPicker(true); setPendingVars({})
      try { const r = await fetch('/api/products'); const d = r.ok ? await r.json() : []; setPickerItems((d.products || d).slice(0, 20)) }
      catch { setPickerItems([]) }
      setPickerLoading(false); return
    }
    openWhatsAppWithVars({})
  }

  function handlePickerSelect(item: any) {
    setShowPicker(false)
    if (pickerType === 'visit') {
      const visitRef = buildVisitRef({ date: item.scheduled_at || item.created_at, locale })
      const vars = { ...pendingVars, visit_ref: visitRef }
      if (needsProductRef) {
        setPendingVars(vars); setPickerLoading(true); setPickerType('product'); setShowPicker(true)
        fetch('/api/products').then(r => r.ok ? r.json() : []).then(d => { setPickerItems((d.products || d).slice(0, 20)); setPickerLoading(false) }).catch(() => { setPickerItems([]); setPickerLoading(false) })
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
      fetch('/api/products').then(r => r.ok ? r.json() : []).then(d => { setPickerItems((d.products || d).slice(0, 20)); setPickerLoading(false) }).catch(() => { setPickerItems([]); setPickerLoading(false) })
      return
    }
    openWhatsAppWithVars(pendingVars)
  }

  function handleClose() {
    setEditOpen(false)
    onClose()
  }

  return (
    <>
      {/* ── TrinityMob: основная мобильная модалка ── */}
      <TrinityMob
        client={client}
        isOpen={isOpen}
        onClose={handleClose}
        locale={locale}
        isDemo={isDemo}
        enabledModules={enabledModules}
        onSale={() => { onClose(); openModal('client-sale', { client, locale }) }}
        onVisit={() => { onClose(); openModal('visit-create', { client, locale }) }}
        onWhatsApp={() => handleWhatsAppClick()}
        onEdit={() => setEditOpen(true)}
        onDelete={() => { setDeleteOpen(true) }}
        onGallery={() => { onClose(); openModal('client-gallery', { client, locale }) }}
        onDocuments={() => { onClose(); openModal('client-documents', { client, locale }) }}
        onVisitsHistory={() => { onClose(); openModal('client-history', { client, locale, tab: 'visits' }) }}
        onPaymentsHistory={() => { onClose(); openModal('client-history', { client, locale, tab: 'payments' }) }}
      />

      {/* ── Редактирование клиента ── */}
      <EditClientSheet
        client={client}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleClose}
        locale={locale}
      />

      {/* ── GDPR удаление клиента ── */}
      <GdprDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => { if (!open) { setDeleteOpen(false); handleClose() } }}
        clientId={client.id}
        clientName={getClientName(client)}
        locale={locale}
      />

      {/* ── WhatsApp picker (портал) ── */}
      {showPicker && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ animation: 'fadeInOverlay 0.2s ease' }}
          onClick={() => setShowPicker(false)}
        >
          <style>{`@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}} @keyframes slideUpSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-background rounded-t-3xl shadow-2xl w-full max-w-lg"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32,0.72,0,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
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
              <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            <div className="px-3 py-3 max-h-72 overflow-y-auto">
              {pickerLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">🗓️</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'he' ? 'אין ביקורים קרובים' : 'Нет предстоящих визитов'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pickerItems.map((item: any) => {
                    const serviceName = item.visit_services?.[0]?.service_name || item.services?.name || null
                    const dateStr = new Date(item.scheduled_at || item.created_at).toLocaleDateString(
                      locale === 'he' ? 'he-IL' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }
                    )
                    const timeStr = item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : null
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePickerSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-all text-start group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold text-sm">
                          {pickerType === 'visit' ? (timeStr?.split(':')[0] || '—') : '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {pickerType === 'visit' ? `${dateStr}${timeStr ? ` · ${timeStr}` : ''}` : item.name}
                          </p>
                          {pickerType === 'visit' && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[serviceName, item.price ? `₪${item.price}` : null].filter(Boolean).join(' · ') || '—'}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
