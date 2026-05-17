'use client'

import { useModalStore } from '@/store/useModalStore'
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'
import { TrinityMobDetailShell } from '@/components/ui/TrinityMobDetailShell'
import { Pencil, Phone, MessageCircle, MessageSquare, Trash2, ShoppingCart, X, ChevronRight, Images, FileText, Paintbrush, Settings2, User, CalendarPlus, Navigation } from 'lucide-react'
import { getClientName, getClientInitials } from '@/lib/client-utils'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GdprDeleteDialog } from '@/components/clients/GdprDeleteDialog'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage, buildWhatsAppUrl, buildVisitRef } from '@/lib/message-utils'
import { ClientCardSettingsPanel, useClientCardSettings } from '@/components/clients/ClientCardSettingsModal'
import { useQueryClient } from '@tanstack/react-query'
import { AdminDeleteButton } from '@/components/admin/AdminDeleteButton'
import { useQuickMode } from '@/hooks/useQuickMode'
import { QuickVisitModal } from '@/components/modals/visits/QuickVisitModal'
import { Zap } from 'lucide-react'

const AVATAR_GRADIENTS: [string, string][] = [
  ['#818cf8', '#a78bfa'], ['#34d399', '#0d9488'], ['#fbbf24', '#f97316'],
  ['#f472b6', '#ec4899'], ['#60a5fa', '#38bdf8'], ['#a78bfa', '#818cf8'],
]
function avGrad(name: string): [string, string] {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

export function ClientDetailsModal() {
  const { isModalOpen, closeModal, getModalData, openModal } = useModalStore()
  const queryClient = useQueryClient()
  const [showGdprDialog, setShowGdprDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [quickVisitOpen, setQuickVisitOpen] = useState(false)
  const isQuickMode = useQuickMode()
  const [cardSettings, saveCardSettings] = useClientCardSettings()
  const [photosCount, setPhotosCount] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { templates } = useOrgTemplates()
  // Вкладки правой части (только десктоп)
  const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'payments'>('info')
  const [tabVisits, setTabVisits] = useState<any[]>([])
  const [tabPayments, setTabPayments] = useState<any[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerType, setPickerType] = useState<'visit' | 'product' | null>(null)
  const [pickerItems, setPickerItems] = useState<any[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pendingVars, setPendingVars] = useState<Record<string, string>>({})

  const isOpen = isModalOpen('client-details')
  const data   = getModalData('client-details')

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isOpen || !data?.client?.id) { setPhotosCount(null); return }
    fetch(`/api/clients/${data.client.id}/photos`)
      .then(r => r.ok ? r.json() : [])
      .then(photos => setPhotosCount(Array.isArray(photos) ? photos.length : 0))
      .catch(() => setPhotosCount(0))
  }, [isOpen, data?.client?.id])

  // Загрузка данных для вкладок (lazy, только при открытии вкладки)
  useEffect(() => {
    if (!isOpen || !data?.client?.id || isMobile) return
    if (activeTab === 'visits' && tabVisits.length === 0) {
      setTabLoading(true)
      fetch(`/api/clients/${data.client.id}/visits`)
        .then(r => r.ok ? r.json() : [])
        .then(v => setTabVisits(Array.isArray(v) ? v : []))
        .catch(() => setTabVisits([]))
        .finally(() => setTabLoading(false))
    }
    if (activeTab === 'payments' && tabPayments.length === 0) {
      setTabLoading(true)
      fetch(`/api/clients/${data.client.id}/payments`)
        .then(r => r.ok ? r.json() : [])
        .then(p => setTabPayments(Array.isArray(p) ? p : []))
        .catch(() => setTabPayments([]))
        .finally(() => setTabLoading(false))
    }
  }, [isOpen, data?.client?.id, activeTab, isMobile])

  // Не рендерим до mount
  if (!mounted) return null

  // GdprDeleteDialog рендерим отдельно — он не зависит от isOpen/isMobile
  if (!data?.client || !isOpen) {
    return showGdprDialog ? (
      <GdprDeleteDialog
        open={showGdprDialog}
        onOpenChange={setShowGdprDialog}
        clientId={data?.client?.id || ''}
        clientName={data?.client ? getClientName(data.client) : ''}
        locale={(data?.locale || 'ru') as 'he' | 'ru'}
      />
    ) : null
  }

  const { client, locale = 'he' } = data
  const clientName  = getClientName(client)
  const initials    = getClientInitials(client)
  const [g1, g2]    = avGrad(clientName || '?')
  const isHe        = locale === 'he'
  const dir         = isHe ? 'rtl' : 'ltr'
  const visitsCount = client.visits_count || client.total_visits || 0
  const totalPaid   = client.total_paid   || 0

  const T = {
    he: { information:'מידע', visits:'תורים', totalPaid:'שולם', gallery:'גלריה', documents:'מסמכים', notes:'הערות', description:'תיאור', createdAt:'תאריך יצירה', edit:'ערוך', sale:'עסקה', newVisit:'ביקור חדש', delete:'מחק', active:'פעיל', call:'התקשר', address:'כתובת', birthday:'יום הולדת', paintCode:'מספר צבע', quickAccess:'גישה מהירה', language:'שפת תקשורת' },
    ru: { information:'Информация', visits:'Визитов', totalPaid:'Оплачено', gallery:'Галерея', documents:'Документы', notes:'Заметки', description:'Описание', createdAt:'Дата создания', edit:'Редактировать', sale:'Продажа', newVisit:'Новый визит', delete:'Удалить', active:'Активен', call:'Позвонить', address:'Адрес', birthday:'День рождения', paintCode:'Код краски', quickAccess:'Быстрый доступ', language:'Язык общения' },
    en:  { information:'Information', visits:'Visits', totalPaid:'Paid', gallery:'Gallery', documents:'Documents', notes:'Notes', description:'Description', createdAt:'Created', edit:'Edit', sale:'Sale', newVisit:'New visit', delete:'Delete', active:'Active', call:'Call', address:'Address', birthday:'Birthday', paintCode:'Paint code', quickAccess:'Quick access', language:'Language' },
  }
  const t = T[locale as keyof typeof T] || T.he

  // БАГ #3 fix: передаём свежий updated напрямую, не мёрджим со старым client из замыкания
  const handleEditClick = () => {
    closeModal('client-details')
    openModal('client-edit', {
      client, locale,
      onSaved: (updated: any) => {
        openModal('client-details', { ...data, client: updated, locale })
      }
    })
  }
  // Продажа открывает UnifiedSalesDialog с предзаполненным клиентом — НЕ закрываем детали
  const handleSaleClick   = () => { openModal('sale-unified', { clientId: client.id, clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim() }) }
  const handleVisitClick  = () => { closeModal('client-details'); openModal('visit-unified', { mode: 'create', clientId: client.id }) }
  const handleCall        = () => { if (client.phone) window.location.href = `tel:${client.phone}` }
  const handleSMS         = () => { if (client.phone) window.location.href = `sms:${client.phone}` }
  // БАГ #2 fix: кнопка удалить — просто показываем диалог
  const handleDeleteClick = () => setShowGdprDialog(true)
  const needsVisitRef     = templates?.whatsapp_template?.includes('{visit_ref}')
  const needsProductRef   = templates?.whatsapp_template?.includes('{product_ref}')

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

  // ── БАГ-001 FIX: мобильный рендер через TrinityMobDetailShell ────────────────
  if (isMobile) {
    const mobActions = [
      {
        icon: <CalendarPlus size={13} />,
        label: t.newVisit,
        onClick: () => { closeModal('client-details'); openModal('visit-unified', { mode: 'create', clientId: client.id }) },
        variant: 'green' as const,
      },
      {
        icon: <ShoppingCart size={13} />,
        label: t.sale,
        onClick: () => openModal('sale-unified', { clientId: client.id, clientName }),
        variant: 'default' as const,
      },
      ...(client.phone ? [{
        icon: <MessageCircle size={13} />,
        label: 'WhatsApp',
        onClick: handleWhatsApp,
        variant: 'green' as const,
      }, {
        icon: <Phone size={13} />,
        label: t.call,
        onClick: handleCall,
        variant: 'default' as const,
      }] : []),
      ...(isQuickMode ? [{
        icon: <Zap size={13} />,
        label: isHe ? 'ביקור מהיר' : 'Быстрый визит',
        onClick: () => setQuickVisitOpen(true),
        variant: 'purple' as const,
      }] : []),
      {
        icon: <Pencil size={13} />,
        label: t.edit,
        onClick: handleEditClick,
        variant: 'default' as const,
      },
      {
        icon: <Trash2 size={13} />,
        label: t.delete,
        onClick: handleDeleteClick,
        variant: 'danger' as const,
      },
    ]
    return (
      <>
        <TrinityMobDetailShell
          open={isOpen}
          onClose={() => closeModal('client-details')}
          title={clientName}
          subtitle={client.phone || (isHe ? 'פרטי לקוח' : 'Данные клиента')}
          avatarContent={initials}
          avatarBg={`linear-gradient(135deg, ${g1}, ${g2})`}
          actions={mobActions}
          actionsTitle={isHe ? 'פעולות' : 'Действия'}
          locale={locale as 'he' | 'ru'}
        >
          <div className="space-y-3">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ background: 'rgba(167,139,250,0.12)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>₪{Number(totalPaid).toLocaleString()}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{t.totalPaid}</div>
              </div>
              <div style={{ background: 'rgba(96,165,250,0.12)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{visitsCount}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>{t.visits}</div>
              </div>
            </div>
            {client.email && <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(255,255,255,0.06)',borderRadius:10 }}><span style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>Email</span><span style={{ fontSize:11,color:'rgba(255,255,255,0.8)' }}>{client.email}</span></div>}
            {(client.address||client.city) && <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(255,255,255,0.06)',borderRadius:10 }}><span style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{t.address}</span><span style={{ fontSize:11,color:'rgba(255,255,255,0.8)' }}>{[client.address,client.city].filter(Boolean).join(', ')}</span></div>}
            {client.date_of_birth && <div style={{ display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(255,255,255,0.06)',borderRadius:10 }}><span style={{ fontSize:11,color:'rgba(255,255,255,0.4)' }}>{t.birthday}</span><span style={{ fontSize:11,color:'rgba(255,255,255,0.8)' }}>{new Date(client.date_of_birth).toLocaleDateString(isHe?'he-IL':'ru-RU')}</span></div>}
            {client.notes && <div style={{ padding:'8px 12px',background:'rgba(251,191,36,0.08)',border:'0.5px solid rgba(251,191,36,0.2)',borderRadius:10 }}><p style={{ fontSize:11,color:'rgba(255,255,255,0.7)',lineHeight:1.5,margin:0 }}>{client.notes}</p></div>}
          </div>
        </TrinityMobDetailShell>
        <GdprDeleteDialog open={showGdprDialog} onOpenChange={setShowGdprDialog} clientId={client.id} clientName={clientName} locale={locale as 'he'|'ru'} />
        {isQuickMode && <QuickVisitModal open={quickVisitOpen} onClose={() => setQuickVisitOpen(false)} clientId={client.id} clientName={clientName} />}
      </>
    )
  }

  // ── Sidebar ──
  const primaryBtn = cardSettings.primaryAction === 'visit' ? (
    <button onClick={handleVisitClick} style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.2)',color:'#34d399',fontSize:12,fontWeight:600,marginBottom:4 }}>
      <CalendarPlus size={14} />{t.newVisit}
    </button>
  ) : (
    <button onClick={handleSaleClick} style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(251,191,36,0.2)',color:'#fbbf24',fontSize:12,fontWeight:600,marginBottom:4 }}>
      <ShoppingCart size={14} />{t.sale}
    </button>
  )

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${g1}, ${g2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>{initials}</div>
      </div>
      {client.phone && (
        <a href={`tel:${client.phone}`} dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 8, textDecoration: 'none' }}>
          <Phone size={11} />{client.phone}
        </a>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, marginBottom: 12, alignSelf: 'center', background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399' }}>{t.active}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <button onClick={() => { closeModal('client-details'); openModal('client-history', { client, locale, tab: 'payments' }) }}
          style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa' }}>₪{Number(totalPaid).toLocaleString()}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{t.totalPaid}</div>
        </button>
        <button onClick={() => { closeModal('client-details'); openModal('client-history', { client, locale, tab: 'visits' }) }}
          style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 6px', textAlign: 'center', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa' }}>{visitsCount}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{t.visits}</div>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {primaryBtn}
        {client.phone && (
          <button onClick={handleWhatsApp} style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(52,211,153,0.15)',color:'#34d399',fontSize:12,fontWeight:600,marginBottom:4 }}>
            <MessageCircle size={14} />WhatsApp
          </button>
        )}
        {isQuickMode && (
          <button
            onClick={() => setQuickVisitOpen(true)}
            style={{ display:'flex',alignItems:'center',gap:7,padding:'9px 10px',borderRadius:10,border:'none',cursor:'pointer',width:'100%',background:'rgba(139,92,246,0.2)',color:'#a78bfa',fontSize:12,fontWeight:600,marginBottom:4 }}
          >
            <Zap size={14} />{isHe ? 'ביקור מהיר' : 'Быстрый визит'}
          </button>
        )}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '2px 0 6px' }} />
        {client.phone && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 4 }}>
            <button onClick={handleCall} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.08)',background:'transparent',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:600 }}>
              <Phone size={14} />{t.call}
            </button>
            <button onClick={handleSMS} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 4px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.08)',background:'transparent',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:600 }}>
              <MessageSquare size={14} />SMS
            </button>
          </div>
        )}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '2px 0 6px' }} />
        {(client.address || client.city) && (
          <button
            onClick={() => {
              const addr = encodeURIComponent([client.address, client.city].filter(Boolean).join(', '))
              window.open(`https://maps.google.com/?q=${addr}`, '_blank')
            }}
            style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,border:'0.5px solid rgba(74,222,128,0.25)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(74,222,128,0.7)',fontSize:11,fontWeight:500,marginBottom:2 }}>
            <Navigation size={12} />{isHe ? 'נווט' : 'Навигатор'}
          </button>
        )}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '2px 0 6px' }} />
        <button onClick={handleEditClick} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,border:'0.5px solid rgba(255,255,255,0.07)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:500 }}>
          <Pencil size={12} />{t.edit}
        </button>
        <button onClick={handleDeleteClick} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,border:'0.5px solid rgba(248,113,113,0.2)',background:'transparent',cursor:'pointer',width:'100%',color:'rgba(248,113,113,0.5)',fontSize:11,fontWeight:500,marginTop:2 }}>
          <Trash2 size={12} />{t.delete}
        </button>
      </div>
    </div>
  )

  const hasQuickAccess = cardSettings.showGallery || cardSettings.showDocuments
  const quickAccessBlock = hasQuickAccess ? (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.quickAccess}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {cardSettings.showGallery && (
          <button onClick={() => openModal('client-gallery', { client, locale })}
            style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'10px 8px',borderRadius:12,background:'rgba(167,139,250,0.08)',border:'1px solid rgba(167,139,250,0.2)',cursor:'pointer' }}>
            <Images size={16} style={{ color: '#a78bfa' }} />
            {photosCount !== null && photosCount > 0 && <span style={{ fontSize:14,fontWeight:700,color:'#a78bfa' }}>{photosCount}</span>}
            <span style={{ fontSize:9,fontWeight:600,color:'#a78bfa',textTransform:'uppercase',letterSpacing:'0.05em' }}>{t.gallery}</span>
          </button>
        )}
        {cardSettings.showDocuments && (
          <button onClick={() => openModal('client-documents', { client, locale })}
            style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'10px 8px',borderRadius:12,background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',cursor:'pointer' }}>
            <FileText size={16} style={{ color: '#60a5fa' }} />
            <span style={{ fontSize:9,fontWeight:600,color:'#60a5fa',textTransform:'uppercase',letterSpacing:'0.05em' }}>{t.documents}</span>
          </button>
        )}
      </div>
    </div>
  ) : null

  return (
    <>
      <Modal open={isOpen} onClose={() => closeModal('client-details')} darkHeader showCloseButton={false} width="680px" dir={dir} contentClassName="!p-0">
        <TrinityModalShell open={isOpen} onClose={() => closeModal('client-details')} icon={<User />} title={clientName} subtitle={client.email || (isHe ? 'פרטי לקוח' : 'Данные клиента')} dir={dir} sidebarExtra={sidebarContent}
          footerContent={
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <AdminDeleteButton type="client" id={client.id}
                onDeleted={() => { closeModal('client-details'); queryClient.invalidateQueries({ queryKey: ['clients'] }) }} />
              <button onClick={() => closeModal('client-details')}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#1e293b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {isHe ? 'סגור' : 'Закрыть'}
              </button>
            </div>
          }
        >
          {showSettings ? (
            <ClientCardSettingsPanel
              onClose={() => setShowSettings(false)}
              settings={cardSettings}
              onSave={saveCardSettings}
              locale={locale as 'he' | 'ru'}
            />
          ) : (
          <>
          {/* ── Таб-бар ── */}
          <div style={{ display:'flex', borderBottom:'0.5px solid #e8edf4', background:'#fafbfc' }}>
            {([
              { key: 'info',     label: isHe ? 'מידע'    : 'Информация',  icon: '📋' },
              { key: 'visits',   label: isHe ? 'תורים'   : 'Визиты',      icon: '📅' },
              { key: 'payments', label: isHe ? 'תשלומים' : 'Платежи',     icon: '💳' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '10px 8px', fontSize: 11, fontWeight: 600,
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === tab.key ? '#6366f1' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  transition: 'color .15s',
                }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* ── Контент вкладки: Информация ── */}
          {activeTab === 'info' && (
          <div className="space-y-4" style={{ padding:'16px 16px 20px', overflowY:'auto', maxHeight:'calc(100% - 80px)' }}>
            {quickAccessBlock}
            {(client.email || client.address || client.date_of_birth || client.created_at || (Array.isArray(client.preferred_languages) && client.preferred_languages.length > 0)) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.information}</p>
                <div className="space-y-1.5">
                  {client.email && <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl"><span className="text-xs text-gray-400 font-medium">Email</span><span className="text-xs font-semibold text-gray-800 truncate ms-2">{client.email}</span></div>}
                  {Array.isArray(client.preferred_languages) && client.preferred_languages.length > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                      <span className="text-xs text-gray-400 font-medium">{t.language}</span>
                      <span className="flex items-center gap-1.5 ms-2">
                        {client.preferred_languages.includes('he') && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-xs font-semibold text-gray-700"><span>🇮🇱</span><span>עברית</span></span>}
                        {client.preferred_languages.includes('ru') && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-xs font-semibold text-gray-700"><span>🇷🇺</span><span>Рус</span></span>}
                      </span>
                    </div>
                  )}
                  {(client.address || client.city) && <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl"><span className="text-xs text-gray-400 font-medium">{t.address}</span><span className="text-xs font-semibold text-gray-800 truncate ms-2">{[client.address, client.city].filter(Boolean).join(', ')}</span></div>}
                  {client.date_of_birth && <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl"><span className="text-xs text-gray-400 font-medium">{t.birthday}</span><span className="text-xs font-semibold text-gray-800">{new Date(client.date_of_birth).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}</span></div>}
                  {client.created_at && <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl"><span className="text-xs text-gray-400 font-medium">{t.createdAt}</span><span className="text-xs font-semibold text-gray-800">{new Date(client.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}</span></div>}
                </div>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.notes}</p>
                <div className="px-3 py-3 bg-amber-50 border border-amber-100 rounded-xl"><p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.notes}</p></div>
              </div>
            )}
            {client.description && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.description}</p>
                <div className="px-3 py-3 bg-indigo-50 border border-indigo-100 rounded-xl"><p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{client.description}</p></div>
              </div>
            )}
            {cardSettings.showPaintCode && client.paint_code && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{t.paintCode}</p>
                <div className="flex items-center gap-3 px-3 py-3 bg-violet-50 border border-violet-100 rounded-xl"><Paintbrush className="w-4 h-4 text-violet-500 shrink-0" /><span className="text-sm font-bold text-violet-800">{client.paint_code}</span></div>
              </div>
            )}
          </div>
          )}

          {/* ── Контент вкладки: Визиты ── */}
          {activeTab === 'visits' && (
          <div style={{ padding:'12px 16px', overflowY:'auto', maxHeight:'calc(100% - 80px)' }}>
            {tabLoading ? (
              <div className="space-y-2 mt-2">{[1,2,3].map(i=><div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse"/>)}</div>
            ) : tabVisits.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:13 }}>
                📅 {isHe ? 'אין תורים עדיין' : 'Визитов пока нет'}
              </div>
            ) : (
              <div className="space-y-1.5 mt-1">
                {tabVisits.slice(0, 20).map((v: any) => {
                  const date = new Date(v.scheduled_at || v.created_at)
                  const statusColor: Record<string,string> = { completed:'#34d399', in_progress:'#fbbf24', cancelled:'#94a3b8', scheduled:'#60a5fa' }
                  const col = statusColor[v.status] || '#94a3b8'
                  return (
                    <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#f8fafc', borderRadius:12, border:'0.5px solid #e8edf4' }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:`${col}18`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:col, lineHeight:1 }}>{date.getDate()}</span>
                        <span style={{ fontSize:8, color:col, lineHeight:1 }}>{date.toLocaleString(isHe?'he-IL':'ru-RU',{month:'short'})}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'#1e293b', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.service_name || (isHe?'ביקור':'Визит')}</p>
                        <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>{date.toLocaleTimeString(isHe?'he-IL':'ru-RU',{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, color:col, background:`${col}14`, padding:'2px 8px', borderRadius:20, flexShrink:0 }}>{v.status}</span>
                      {v.price && <span style={{ fontSize:12, fontWeight:700, color:'#1e293b', flexShrink:0 }}>₪{v.price}</span>}
                    </div>
                  )
                })}
                {tabVisits.length > 20 && (
                  <button onClick={() => { closeModal('client-details'); openModal('client-history', { client, locale, tab: 'visits' }) }}
                    style={{ width:'100%', padding:'8px', border:'0.5px dashed #cbd5e1', borderRadius:10, fontSize:11, color:'#64748b', background:'transparent', cursor:'pointer', marginTop:4 }}>
                    {isHe ? `עוד ${tabVisits.length - 20} תורים` : `Ещё ${tabVisits.length - 20} визитов`} →
                  </button>
                )}
              </div>
            )}
          </div>
          )}

          {/* ── Контент вкладки: Платежи ── */}
          {activeTab === 'payments' && (
          <div style={{ padding:'12px 16px', overflowY:'auto', maxHeight:'calc(100% - 80px)' }}>
            {tabLoading ? (
              <div className="space-y-2 mt-2">{[1,2,3].map(i=><div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse"/>)}</div>
            ) : tabPayments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:13 }}>
                💳 {isHe ? 'אין תשלומים עדיין' : 'Платежей пока нет'}
              </div>
            ) : (
              <div className="space-y-1.5 mt-1">
                {tabPayments.slice(0, 20).map((p: any) => {
                  const statusColor: Record<string,string> = { completed:'#34d399', success:'#34d399', pending:'#fbbf24', failed:'#f87171', cancelled:'#94a3b8' }
                  const col = statusColor[p.status] || '#94a3b8'
                  const METHOD_ICON: Record<string,string> = { cash:'💵', card:'💳', credit_card:'💳', bit:'📱', transfer:'🏦' }
                  return (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#f8fafc', borderRadius:12, border:'0.5px solid #e8edf4' }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
                        {METHOD_ICON[p.method || p.payment_method] || '💵'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'#1e293b', margin:0 }}>{new Date(p.created_at).toLocaleDateString(isHe?'he-IL':'ru-RU')}</p>
                        <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>{p.method || p.payment_method || '—'}</p>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:'#1e293b' }}>₪{Number(p.amount || p.price || 0).toLocaleString()}</span>
                        <span style={{ fontSize:9, fontWeight:600, color:col, background:`${col}14`, padding:'1px 6px', borderRadius:20 }}>{p.status}</span>
                      </div>
                    </div>
                  )
                })}
                {tabPayments.length > 20 && (
                  <button onClick={() => { closeModal('client-details'); openModal('client-history', { client, locale, tab: 'payments' }) }}
                    style={{ width:'100%', padding:'8px', border:'0.5px dashed #cbd5e1', borderRadius:10, fontSize:11, color:'#64748b', background:'transparent', cursor:'pointer', marginTop:4 }}>
                    {isHe ? `עוד ${tabPayments.length - 20} תשלומים` : `Ещё ${tabPayments.length - 20} платежей`} →
                  </button>
                )}
              </div>
            )}
          </div>
          )}
          </>
          )}
        </TrinityModalShell>
      </Modal>

      <GdprDeleteDialog open={showGdprDialog} onOpenChange={setShowGdprDialog} clientId={client.id} clientName={clientName} locale={locale as 'he'|'ru'} />

      {showPicker && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-t-3xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-300" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-base">{pickerType==='visit'?(isHe?'📅 בחר ביקור':'📅 Выберите визит'):(isHe?'🛍️ בחר מוצר':'🛍️ Выберите товар')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isHe?'יוכנס לתבנית WhatsApp':'Будет вставлено в шаблон'}</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X size={16} /></button>
            </div>
            <div className="px-3 py-3 max-h-72 overflow-y-auto">
              {pickerLoading ? (
                <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
              ) : pickerItems.length === 0 ? (
                <div className="text-center py-8"><p className="text-3xl mb-2">🗓️</p><p className="text-sm text-gray-400">{isHe?'אין פריטים':'Нет элементов'}</p></div>
              ) : (
                <div className="space-y-1.5">
                  {pickerItems.map((item: any) => {
                    const dateStr = new Date(item.scheduled_at||item.created_at).toLocaleDateString(isHe?'he-IL':'ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'})
                    const timeStr = item.scheduled_at?new Date(item.scheduled_at).toLocaleTimeString(isHe?'he-IL':'ru-RU',{hour:'2-digit',minute:'2-digit'}):null
                    return (
                      <button key={item.id} onClick={()=>handlePickerSelect(item)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-emerald-50 active:scale-[0.98] transition-all text-start group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 font-bold text-sm">{pickerType==='visit'?timeStr?.split(':')[0]||'—':'📦'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{pickerType==='visit'?`${dateStr}${timeStr?` · ${timeStr}`:''}`:item.name}</p>
                          {pickerType==='product'&&item.price&&<p className="text-xs text-gray-400">₪{item.price}</p>}
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0"/>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-5 pb-8 pt-2 border-t border-gray-100">
              <button onClick={handlePickerSkip} className="w-full py-3 rounded-2xl border border-dashed border-gray-300 text-sm text-gray-400 hover:bg-gray-50 transition">{isHe?'דלג — שלח ללא ביקור ספציפי':'Пропустить — отправить без выбора'}</button>
            </div>
          </div>
        </div>
      , document.body)}
      {/* QuickVisitModal — быстрый постфактум-визит */}
      {isQuickMode && (
        <QuickVisitModal
          open={quickVisitOpen}
          onClose={() => setQuickVisitOpen(false)}
          clientId={client.id}
          clientName={clientName}
        />
      )}
    </>
  )
}
