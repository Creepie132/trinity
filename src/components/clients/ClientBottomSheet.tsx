'use client'

import { useState } from 'react'
import { Calendar, DollarSign, MessageSquare, Trash2, Phone, MessageCircle, Pencil, ArrowRight, ArrowLeft } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EditClientSheet } from './EditClientSheet'
import { getClientName, getClientInitials } from '@/lib/client-utils'

type Tab = 'main' | 'visits' | 'payments' | 'sms' | 'gdpr'

interface ClientBottomSheetProps {
  client: {
    id: string
    first_name?: string
    last_name?: string
    name?: string // legacy
    phone?: string
    email?: string
    visits_count?: number
    last_visit?: string
    notes?: string
    created_at?: string
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
  client,
  isOpen,
  onClose,
  locale,
  isDemo,
  enabledModules,
  onEdit,
  onDelete,
}: ClientBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [visits, setVisits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const clientName = getClientName(client)
  const initials = getClientInitials(client)
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const avatarColor = colors[clientName.charCodeAt(0) % colors.length]

  // RTL-aware back arrow
  const BackIcon = locale === 'he' ? ArrowRight : ArrowLeft

  // Загрузка визитов
  async function loadVisits() {
    setActiveTab('visits')
    setLoadingVisits(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/visits`)
      if (res.ok) setVisits(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoadingVisits(false)
  }

  // Загрузка платежей
  async function loadPayments() {
    setActiveTab('payments')
    setLoadingPayments(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/payments`)
      if (res.ok) setPayments(await res.json())
    } catch (e) {
      console.error(e)
    }
    setLoadingPayments(false)
  }

  // Сброс при закрытии
  function handleClose() {
    setActiveTab('main')
    setConfirmDelete(false)
    onClose()
  }

  // Кнопка назад
  function BackButton() {
    return (
      <button
        onClick={() => {
          setActiveTab('main')
          setConfirmDelete(false)
        }}
        className="flex items-center gap-1 text-sm text-primary mb-4"
      >
        <BackIcon size={16} />
        {locale === 'he' ? 'חזרה' : 'Назад'}
      </button>
    )
  }

  return (
    <>
    <TrinityBottomDrawer isOpen={isOpen} onClose={handleClose} title={activeTab === 'main' ? clientName : undefined}>
      {/* ===== MAIN TAB ===== */}
      {activeTab === 'main' && (
        <>
          {/* Аватар + контакты */}
          <div className="flex flex-col items-center mb-5">
            <div
              className={`${avatarColor} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2`}
            >
              {initials}
            </div>
            <h3 className="text-xl font-bold">{clientName}</h3>
            {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
            {client.email && <p className="text-muted-foreground text-xs">{client.email}</p>}
          </div>

          {/* Быстрые действия — звонок, WhatsApp, редактирование */}
          <div className="flex justify-center gap-3 mb-5">
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Phone size={20} />
              </a>
            )}
            {client.phone && (
              <a
                href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              >
                <MessageCircle size={20} />
              </a>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground"
            >
              <Pencil size={20} />
            </button>
          </div>

          {/* Краткая статистика */}
          <div className="flex justify-around py-3 mb-4 bg-muted/50 rounded-xl">
            <div className="text-center">
              <p className="text-lg font-bold">{client.visits_count || 0}</p>
              <p className="text-xs text-muted-foreground">{locale === 'he' ? 'ביקורים' : 'Визитов'}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {client.last_visit
                  ? new Date(client.last_visit).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{locale === 'he' ? 'ביקור אחרון' : 'Последний'}</p>
            </div>
          </div>

          {/* Навигация 2x2 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {/* Визиты */}
            <button
              onClick={loadVisits}
              disabled={isDemo || enabledModules?.visits === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium">{locale === 'he' ? 'ביקורים' : 'Визиты'}</span>
            </button>

            {/* Платежи */}
            <button
              onClick={loadPayments}
              disabled={isDemo || enabledModules?.payments === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium">{locale === 'he' ? 'תשלומים' : 'Платежи'}</span>
            </button>

            {/* SMS */}
            <button
              onClick={() => setActiveTab('sms')}
              disabled={isDemo || enabledModules?.sms === false}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium">SMS</span>
            </button>

            {/* GDPR / Удаление */}
            <button
              onClick={() => setActiveTab('gdpr')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:bg-muted/50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium">GDPR</span>
            </button>
          </div>

          {/* Заметки */}
          {client.notes && (
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{locale === 'he' ? 'הערות' : 'Заметки'}</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </>
      )}

      {/* ===== VISITS TAB ===== */}
      {activeTab === 'visits' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">{locale === 'he' ? 'היסטוריית ביקורים' : 'История визитов'}</h4>
          {loadingVisits ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'אין ביקורים' : 'Визитов нет'}
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-muted">
                  <div>
                    <p className="text-sm font-medium">{v.service_type || (locale === 'he' ? 'ביקור' : 'Визит')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.scheduled_at || v.created_at).toLocaleDateString(
                        locale === 'he' ? 'he-IL' : 'ru-RU'
                      )}
                    </p>
                  </div>
                  <div className="text-end">
                    {v.price != null && <p className="text-sm font-bold">₪{v.price}</p>}
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== PAYMENTS TAB ===== */}
      {activeTab === 'payments' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">{locale === 'he' ? 'היסטוריית תשלומים' : 'История платежей'}</h4>
          {loadingPayments ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'טוען...' : 'Загрузка...'}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {locale === 'he' ? 'אין תשלומים' : 'Платежей нет'}
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-muted">
                  <div>
                    <p className="text-sm font-medium">{p.description || (locale === 'he' ? 'תשלום' : 'Платёж')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold">₪{p.amount}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== SMS TAB ===== */}
      {activeTab === 'sms' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">SMS</h4>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {locale === 'he' ? 'בקרוב...' : 'Скоро...'}
          </div>
        </>
      )}

      {/* ===== GDPR TAB ===== */}
      {activeTab === 'gdpr' && (
        <>
          <BackButton />
          <h4 className="font-semibold mb-3">
            {locale === 'he' ? 'מחיקת נתוני לקוח' : 'Удаление данных клиента'}
          </h4>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
              {locale === 'he' ? '⚠️ פעולה זו בלתי הפיכה!' : '⚠️ Это действие необратимо!'}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">
              {locale === 'he'
                ? 'מחיקת הלקוח תסיר את כל הנתונים שלו לצמיתות: פרטים אישיים, היסטוריית ביקורים, תשלומים והערות. לא ניתן לשחזר נתונים אלה.'
                : 'Удаление клиента навсегда удалит все его данные: личную информацию, историю визитов, платежей и заметки. Восстановление невозможно.'}
            </p>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              {locale === 'he' ? 'מחק לקוח (GDPR)' : 'Удалить клиента (GDPR)'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">
                {locale === 'he' ? 'בטוח? לחץ שוב לאישור סופי' : 'Уверены? Нажмите ещё раз для подтверждения'}
              </p>
              <button
                onClick={() => {
                  onDelete?.(client.id)
                  handleClose()
                }}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition"
              >
                {locale === 'he' ? '🗑️ כן, מחק לצמיתות' : '🗑️ Да, удалить навсегда'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
              >
                {locale === 'he' ? 'ביטול' : 'Отмена'}
              </button>
            </div>
          )}
        </>
      )}
    </TrinityBottomDrawer>

    {/* Форма редактирования */}
    <EditClientSheet
      client={client}
      isOpen={editOpen}
      onClose={() => setEditOpen(false)}
      onSaved={(updated) => {
        // Обновить данные клиента в родителе через onClose
        onClose()
      }}
      locale={locale}
    />
  </>
  )
}
