'use client'

/**
 * TrinityMob — мобильная модалка клиента со свайп-шторкой действий.
 *
 * Структура:
 *   TrinityBottomDrawer (portal, drag-to-close)
 *     ├─ Header  (аватар, имя, ×)
 *     └─ SwipeZone
 *          ├─ MainPanel   (контент, смещается при свайпе)
 *          └─ ActionDrawer (шторка: действия | настройки)
 *
 * Свайп:
 *   - LTR (RU): свайп влево  → открыть шторку
 *   - RTL (HE): свайп вправо → открыть шторку
 *   Закрыть шторку: обратный свайп или кнопка «Назад».
 *
 * Тема: CSS-переменные --trinity-sidebar-bg, --trinity-accent,
 *       --trinity-accent-text, --trinity-accent-bg (из ThemeContext).
 */

import { useRef, useState, useEffect, ReactNode } from 'react'
import { useMobileBackTrap } from '@/hooks/useMobileBackTrap'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Phone, MessageCircle, MessageSquare,
  ShoppingCart, CalendarPlus, Pencil, Trash2, Images, FileText, Settings2, Navigation,
} from 'lucide-react'
import { useClientCardSettings } from '@/components/clients/ClientCardSettingsModal'
import { getClientName, getClientInitials } from '@/lib/client-utils'

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface TrinityMobClient {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
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

export interface TrinityMobProps {
  client: TrinityMobClient
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru' | 'en'
  isDemo?: boolean
  enabledModules?: Record<string, boolean>
  /** Клик «Продажа» */
  onSale?: (client: TrinityMobClient) => void
  /** Клик «Новый визит» */
  onVisit?: (client: TrinityMobClient) => void
  /** Клик «WhatsApp» */
  onWhatsApp?: (client: TrinityMobClient) => void
  /** Открыть редактирование */
  onEdit?: (client: TrinityMobClient) => void
  /** GDPR-удаление */
  onDelete?: (clientId: string) => void
  /** Открыть галерею */
  onGallery?: (client: TrinityMobClient) => void
  /** Открыть документы */
  onDocuments?: (client: TrinityMobClient) => void
  /** История визитов */
  onVisitsHistory?: (client: TrinityMobClient) => void
  /** История платежей */
  onPaymentsHistory?: (client: TrinityMobClient) => void
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  he: {
    sub: 'פרטי לקוח', paid: 'שולם', visits: 'ביקורים', info: 'מידע',
    phone: 'טלפון', status: 'סטטוס', active: 'פעיל', created: 'נוצר',
    notes: 'הערות', back: 'חזרה', actions: 'פעולות', settings: 'הגדרות',
    sale: 'עסקה', newVisit: 'ביקור חדש', call: 'התקשר', edit: 'ערוך', del: 'מחק',
    gallery: 'גלריה', docs: 'מסמכים',
    settTitle: 'הגדרות כרטיס', primaryBtn: 'כפתור ראשי',
    saleLbl: 'עסקה', visitLbl: 'ביקור', displayBlocks: 'תצוגת בלוקים',
    galleryLbl: 'גלריה', docsLbl: 'מסמכים', paintLbl: 'קוד צבע',
    swipeHint: 'החלק ימינה — פעולות',
    address: 'כתובת', city: 'עיר', email: 'אימייל', navigate: 'נווט',
  },
  ru: {
    sub: 'Данные клиента', paid: 'Оплачено', visits: 'Визитов', info: 'Информация',
    phone: 'Телефон', status: 'Статус', active: 'Активен', created: 'Создан',
    notes: 'Заметки', back: 'Назад', actions: 'Действия', settings: 'Настройки',
    sale: 'Продажа', newVisit: 'Новый визит', call: 'Позвонить', edit: 'Редактировать', del: 'Удалить',
    gallery: 'Галерея', docs: 'Документы',
    settTitle: 'Настройки карточки', primaryBtn: 'Главная кнопка',
    saleLbl: 'Продажа', visitLbl: 'Визит', displayBlocks: 'Блоки отображения',
    galleryLbl: 'Галерея', docsLbl: 'Документы', paintLbl: 'Код краски',
    swipeHint: '← Свайп влево — действия →',
    address: 'Адрес', city: 'Город', email: 'Email', navigate: 'Навигатор',
  },
  en: {
    sub: 'Client info', paid: 'Paid', visits: 'Visits', info: 'Information',
    phone: 'Phone', status: 'Status', active: 'Active', created: 'Created',
    notes: 'Notes', back: 'Back', actions: 'Actions', settings: 'Settings',
    sale: 'Sale', newVisit: 'New visit', call: 'Call', edit: 'Edit', del: 'Delete',
    gallery: 'Gallery', docs: 'Documents',
    settTitle: 'Card settings', primaryBtn: 'Primary button',
    saleLbl: 'Sale', visitLbl: 'Visit', displayBlocks: 'Display blocks',
    galleryLbl: 'Gallery', docsLbl: 'Documents', paintLbl: 'Paint code',
    swipeHint: '← Swipe left — actions →',
    address: 'Address', city: 'City', email: 'Email', navigate: 'Navigate',
  },
} as const

// ─── Аватар-градиенты (те же что в ClientDetailsModal) ────────────────────────

const AVATAR_GRADIENTS: [string, string][] = [
  ['#818cf8', '#a78bfa'], ['#34d399', '#0d9488'], ['#fbbf24', '#f97316'],
  ['#f472b6', '#ec4899'], ['#60a5fa', '#38bdf8'], ['#a78bfa', '#818cf8'],
]
function avatarGradient(name: string): [string, string] {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

// ─── ActionRow — строка-кнопка в шторке ───────────────────────────────────────

function ActionRow({
  icon, label, onClick, danger = false, accentBg, accentText,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
  accentBg?: string
  accentText?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 11px', borderRadius: 11, width: '100%',
        border: danger ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(255,255,255,0.08)',
        background: 'transparent', cursor: 'pointer',
        color: danger ? '#f87171' : 'white',
        fontSize: 12, fontWeight: 500,
        transition: 'opacity .15s',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.opacity = '.7' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      onTouchStart={e => { (e.currentTarget as HTMLElement).style.opacity = '.7' }}
      onTouchEnd={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 14,
        background: danger ? 'rgba(239,68,68,0.14)' : (accentBg ?? 'rgba(255,255,255,0.07)'),
        color: danger ? '#f87171' : (accentText ?? 'rgba(255,255,255,0.7)'),
      }}>
        {icon}
      </div>
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', color: danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)', fontSize: 13 }}>›</span>
    </button>
  )
}

// ─── ToggleRow — строка с тоглом в настройках ────────────────────────────────

function ToggleRow({
  emoji, label, checked, onChange, accentColor, isRtl,
}: { emoji: string; label: string; checked: boolean; onChange: () => void; accentColor: string; isRtl: boolean }) {
  return (
    <button
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 11px', borderRadius: 9, width: '100%',
        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span>{label}</span>
      </div>
      <div style={{
        position: 'relative', width: 34, height: 19, borderRadius: 9, flexShrink: 0,
        background: checked ? accentColor : 'rgba(255,255,255,0.12)',
        transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 15, height: 15, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          transition: 'transform .2s',
          transform: checked
            ? (isRtl ? 'translateX(2px)' : 'translateX(17px)')
            : (isRtl ? 'translateX(17px)' : 'translateX(2px)'),
          left: isRtl ? 'auto' : 2,
          right: isRtl ? 2 : 'auto',
        }} />
      </div>
    </button>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function TrinityMob({
  client, isOpen, onClose, locale,
  isDemo, enabledModules,
  onSale, onVisit, onWhatsApp, onEdit, onDelete, onGallery, onDocuments,
  onVisitsHistory, onPaymentsHistory,
}: TrinityMobProps) {
  const t = T[locale] ?? T.ru
  const isRtl = locale === 'he'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const [cardSettings, saveCardSettings] = useClientCardSettings()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inSettings, setInSettings] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Framer motion — drag-to-close для самого drawer (вертикальный)
  const y = useMotionValue(0)
  const overlayOpacity = useTransform(y, [0, 300], [1, 0])
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startYVal = useRef(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const drawerH = useRef(0)

  // Горизонтальный свайп — открытие/закрытие шторки
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  // Блокируем скролл body пока открыто
  useEffect(() => {
    if (isOpen) { y.set(0); document.body.style.overflow = 'hidden' }
    else { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, y])

  // Escape
  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && handleClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen])

  function handleClose() {
    setDrawerOpen(false)
    setInSettings(false)
    onClose()
  }

  // Mobile Back Button trap — LIFO (3 уровня):
  // Уровень 1 — сам TrinityMob-дравер (isOpen).
  // Уровень 2 — шторка настроек карточки (inSettings) — закрывается первой.
  // Уровень 3 — боковая шторка действий (drawerOpen) — закрывается второй.
  // Финальное «Назад» → handleClose (весь компонент).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(isOpen, handleClose)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(drawerOpen, () => setDrawerOpen(false))
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMobileBackTrap(inSettings, () => setInSettings(false))

  // Вертикальный drag-to-close на ручке
  function onHandleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startY.current = e.touches[0].clientY
    startYVal.current = y.get()
    if (contentRef.current) drawerH.current = contentRef.current.offsetHeight
  }
  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - startY.current
    y.set(Math.max(0, startYVal.current + delta))
  }
  function onHandleTouchEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    if (y.get() > drawerH.current * 0.35) {
      animate(y, drawerH.current || 600, { type: 'tween', duration: .25, ease: [.32,.72,0,1], onComplete: handleClose })
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }

  // Горизонтальный свайп внутри контент-зоны
  function onContentTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onContentTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > Math.abs(dx) || Math.abs(dx) < 40) return // вертикальный свайп — игнор
    if (!drawerOpen) {
      if (isRtl && dx > 50) setDrawerOpen(true)
      else if (!isRtl && dx < -50) setDrawerOpen(true)
    } else if (!inSettings) {
      if (isRtl && dx < -50) { setDrawerOpen(false); setInSettings(false) }
      else if (!isRtl && dx > 50) { setDrawerOpen(false); setInSettings(false) }
    }
  }

  // Данные клиента
  const clientName = getClientName(client)
  const initials   = getClientInitials(client)
  const [g1, g2]   = avatarGradient(clientName || '?')
  const visitsCount = client.visits_count ?? client.total_visits ?? 0
  const totalPaid   = Number(client.total_paid ?? 0)
  const createdDate = client.created_at
    ? new Date(client.created_at).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU')
    : '—'

  // Тема: читаем CSS переменные — они уже применены на :root
  const sidebarBg  = 'var(--trinity-sidebar-bg, #1a2620)'
  const accentColor = 'var(--trinity-accent, #2d6a4f)'
  const accentText  = 'var(--trinity-accent-text, #74c69d)'
  const accentBg    = 'var(--trinity-accent-bg, rgba(45,106,79,0.27))'
  // Drawer темнее sidebar на ~30% — используем rgba overlay поверх
  const drawerBg   = 'color-mix(in srgb, var(--trinity-sidebar-bg, #1a2620) 80%, black)'

  if (!mounted || typeof document === 'undefined') return null

  // ── RENDER ────────────────────────────────────────────────────────────────

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="mob-overlay"
            className="fixed inset-0 bg-black/50"
            style={{ opacity: overlayOpacity, zIndex: 9998 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: .2 }}
            onClick={handleClose}
          />

          {/* Bottom drawer */}
          <motion.div
            key="mob-drawer"
            ref={contentRef}
            className="fixed bottom-0 left-0 right-0 flex flex-col outline-none"
            style={{
              y,
              zIndex: 9999,
              height: 'calc(100dvh - 3rem)',
              background: sidebarBg,
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
              touchAction: 'none',
              overflow: 'hidden',
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* ── Ручка drag-to-close ── */}
            <div
              className="flex-shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: 'none' }}
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={onHandleTouchEnd}
            >
              <div className="w-10 h-1 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* ── Header ── */}
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white',
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{t.sub}</div>
              </div>
              <button
                onClick={handleClose}
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}
              >✕</button>
            </div>

            {/* ── Swipe zone ── */}
            <div
              style={{ position: 'relative', flex: 1, overflow: 'hidden' }}
              onTouchStart={onContentTouchStart}
              onTouchEnd={onContentTouchEnd}
            >
              {/* MAIN PANEL */}
              <div
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  overflowY: 'auto', padding: '14px 14px 24px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                  transform: drawerOpen ? (isRtl ? 'translateX(74%)' : 'translateX(-74%)') : 'translateX(0)',
                  touchAction: 'pan-y',
                }}
              >
                {/* Swipe-hint */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    alignSelf: 'center', padding: '5px 11px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer',
                  }}
                >
                  {isRtl
                    ? <><span>›</span><span>{t.swipeHint}</span><span>‹</span></>
                    : <><span>‹</span><span>{t.swipeHint}</span><span>›</span></>
                  }
                </button>

                {/* Stats — кликабельные карточки */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    onClick={() => onPaymentsHistory?.(client)}
                    style={{ borderRadius: 11, padding: '9px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: onPaymentsHistory ? 'pointer' : 'default', transition: 'background .15s' }}
                    onMouseEnter={e => { if (onPaymentsHistory) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onTouchStart={e => { if (onPaymentsHistory) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                    onTouchEnd={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ fontSize: 17, fontWeight: 600, color: accentText }}>₪{Number(totalPaid).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{t.paid}</div>
                  </button>
                  <button
                    onClick={() => onVisitsHistory?.(client)}
                    style={{ borderRadius: 11, padding: '9px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: onVisitsHistory ? 'pointer' : 'default', transition: 'background .15s' }}
                    onMouseEnter={e => { if (onVisitsHistory) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                    onTouchStart={e => { if (onVisitsHistory) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                    onTouchEnd={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                  >
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#60a5fa' }}>{String(visitsCount)}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{t.visits}</div>
                  </button>
                </div>

                {/* Info */}
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{t.info}</div>
                  {[
                    client.phone ? { key: t.phone, val: client.phone, dir: 'ltr' as const } : null,
                    client.email ? { key: t.email, val: client.email, dir: 'ltr' as const } : null,
                    (client.address || client.city) ? { key: t.address, val: [client.address, client.city].filter(Boolean).join(', '), dir: isRtl ? 'rtl' : 'ltr' as const } : null,
                    { key: t.status, val: null as null },
                    { key: t.created, val: createdDate },
                  ].filter(Boolean).map((row) => row!.key === t.status ? (
                    <div key="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,0.38)' }}>{t.status}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'white', fontWeight: 500 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                        {t.active}
                      </span>
                    </div>
                  ) : (
                    <div key={row!.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,0.38)' }}>{row!.key}</span>
                      <span dir={row!.dir} style={{ color: 'white', fontWeight: 500 }}>{row!.val}</span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {client.notes && (
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{t.notes}</div>
                    <div style={{ borderRadius: 11, padding: '10px 12px', background: accentBg, border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
                      {client.notes}
                    </div>
                  </div>
                )}

                {/* Paint code */}
                {cardSettings.showPaintCode && client.paint_code && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 11, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(196,181,253,0.2)' }}>
                    <span style={{ fontSize: 16 }}>🎨</span>
                    <div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{t.paintLbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#c084fc' }}>{client.paint_code}</div>
                    </div>
                  </div>
                )}
              </div>


              {/* ACTION DRAWER */}
              <div
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '82%',
                  [isRtl ? 'left' : 'right']: 0,
                  background: drawerBg,
                  borderInlineStart: '1px solid rgba(255,255,255,0.08)',
                  overflowY: 'auto',
                  transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
                  transform: drawerOpen ? 'translateX(0)' : (isRtl ? 'translateX(-100%)' : 'translateX(100%)'),
                  zIndex: 2,
                }}
              >
                {/* === VIEW: ACTIONS === */}
                {!inSettings && (
                  <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>

                    {/* Шапка шторки */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <button
                        onClick={() => { setDrawerOpen(false); setInSettings(false) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                      >
                        <BackIcon size={11} />
                        <span>{t.back}</span>
                      </button>
                      <button
                        onClick={() => setInSettings(true)}
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 9, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        <Settings2 size={10} />
                        <span>{t.settings}</span>
                      </button>
                    </div>

                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{t.actions}</div>

                    {/* Продажа */}
                    <ActionRow icon={<ShoppingCart size={13} />} label={t.sale} onClick={() => onSale?.(client)} accentBg={accentBg} accentText={accentText} />

                    {/* Визит */}
                    <ActionRow icon={<CalendarPlus size={13} />} label={t.newVisit} onClick={() => onVisit?.(client)} accentBg={accentBg} accentText={accentText} />

                    {/* WhatsApp */}
                    {client.phone && (
                      <ActionRow icon={<MessageCircle size={13} />} label="WhatsApp" onClick={() => onWhatsApp?.(client)} accentBg="rgba(37,162,68,0.2)" accentText="#4ade80" />
                    )}

                    {/* Звонок */}
                    {client.phone && (
                      <ActionRow icon={<Phone size={13} />} label={t.call} onClick={() => { if (client.phone) window.location.href = `tel:${client.phone}` }} accentBg="rgba(96,165,250,0.15)" accentText="#60a5fa" />
                    )}

                    {/* SMS */}
                    {client.phone && (
                      <ActionRow icon={<MessageSquare size={13} />} label="SMS" onClick={() => { if (client.phone) window.location.href = `sms:${client.phone}` }} accentBg="rgba(96,165,250,0.12)" accentText="#60a5fa" />
                    )}

                    {/* Навигатор — geo: URI вызывает системный диалог выбора приложения (Waze, Google Maps и т.д.) */}
                    {(client.address || client.city) && (
                      <ActionRow
                        icon={<Navigation size={13} />}
                        label={t.navigate}
                        onClick={() => {
                          const addr = [client.address, client.city].filter(Boolean).join(', ')
                          const encoded = encodeURIComponent(addr)
                          // На мобильных: geo: URI показывает диалог выбора навигатора (Waze, Google Maps, Яндекс и др.)
                          // На десктопе: открываем Google Maps как обычно
                          const isMobile = 'ontouchstart' in window
                          if (isMobile) {
                            window.location.href = `geo:0,0?q=${encoded}`
                          } else {
                            window.open(`https://maps.google.com/?q=${encoded}`, '_blank')
                          }
                        }}
                        accentBg="rgba(34,197,94,0.12)"
                        accentText="#4ade80"
                      />
                    )}

                    {/* Галерея + Документы */}
                    {(cardSettings.showGallery || cardSettings.showDocuments) && (
                      <div style={{ display: 'flex', gap: 7 }}>
                        {cardSettings.showGallery && (
                          <button onClick={() => onGallery?.(client)} style={{ flex: 1, padding: '8px 7px', borderRadius: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.22)', color: '#a78bfa', fontSize: 9, fontWeight: 600, letterSpacing: '.04em' }}>
                            <Images size={15} />
                            <span>{t.gallery}</span>
                          </button>
                        )}
                        {cardSettings.showDocuments && (
                          <button onClick={() => onDocuments?.(client)} style={{ flex: 1, padding: '8px 7px', borderRadius: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.22)', color: '#60a5fa', fontSize: 9, fontWeight: 600, letterSpacing: '.04em' }}>
                            <FileText size={15} />
                            <span>{t.docs}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

                    <ActionRow icon={<Pencil size={12} />} label={t.edit} onClick={() => { setDrawerOpen(false); onEdit?.(client) }} />
                    <ActionRow icon={<Trash2 size={12} />} label={t.del} onClick={() => { setDrawerOpen(false); onDelete?.(client.id) }} danger />
                  </div>
                )}

                {/* === VIEW: SETTINGS === */}
                {inSettings && (
                  <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

                    {/* Шапка настроек */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <button
                        onClick={() => setInSettings(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                      >
                        <BackIcon size={11} />
                        <span>{t.back}</span>
                      </button>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{t.settTitle}</div>
                    </div>

                    {/* Главная кнопка */}
                    <div style={{ padding: '9px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{t.primaryBtn}</div>
                      <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {(['sale', 'visit'] as const).map((v) => {
                          const active = cardSettings.primaryAction === v
                          return (
                            <button
                              key={v}
                              onClick={() => saveCardSettings({ ...cardSettings, primaryAction: v })}
                              style={{
                                flex: 1, padding: '7px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                                background: active ? accentBg : 'transparent',
                                color: active ? accentText : 'rgba(255,255,255,0.38)',
                                transition: 'all .15s',
                              }}
                            >
                              {v === 'sale' ? `🛒 ${t.saleLbl}` : `📅 ${t.visitLbl}`}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{t.displayBlocks}</div>

                    <ToggleRow
                      emoji="🖼️" label={t.galleryLbl} checked={cardSettings.showGallery} isRtl={isRtl}
                      accentColor={accentColor}
                      onChange={() => saveCardSettings({ ...cardSettings, showGallery: !cardSettings.showGallery })}
                    />
                    <ToggleRow
                      emoji="📄" label={t.docsLbl} checked={cardSettings.showDocuments} isRtl={isRtl}
                      accentColor={accentColor}
                      onChange={() => saveCardSettings({ ...cardSettings, showDocuments: !cardSettings.showDocuments })}
                    />
                    <ToggleRow
                      emoji="🎨" label={t.paintLbl} checked={cardSettings.showPaintCode} isRtl={isRtl}
                      accentColor={accentColor}
                      onChange={() => saveCardSettings({ ...cardSettings, showPaintCode: !cardSettings.showPaintCode })}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* end swipe zone */}
          </motion.div>
          {/* end bottom drawer */}
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
