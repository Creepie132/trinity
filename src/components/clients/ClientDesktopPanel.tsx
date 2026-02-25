'use client'

import { useState, useEffect } from 'react'
import { X, Phone, MessageCircle, Mail, Pencil, Calendar, CreditCard, MessageSquare, FileText, ChevronRight } from 'lucide-react'
import { TrinityButton } from '@/components/ui/TrinityButton'

interface ClientDesktopPanelProps {
  client: any
  isOpen: boolean
  onClose: () => void
  onEdit: (client: any) => void
  locale: 'he' | 'ru'
}

export function ClientDesktopPanel({ client, isOpen, onClose, onEdit, locale }: ClientDesktopPanelProps) {
  const [activeTab, setActiveTab] = useState<'visits' | 'payments' | 'messages' | 'notes'>('visits')
  const [visits, setVisits] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const isRTL = locale === 'he'
  const fullName = `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || '—'
  const initials = `${(client?.first_name || '')[0] || ''}${(client?.last_name || '')[0] || ''}`.toUpperCase()
  
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500']
  const avatarColor = colors[(client?.first_name || '').charCodeAt(0) % colors.length]

  useEffect(() => {
    if (isOpen && client?.id) {
      loadData()
    }
  }, [isOpen, client?.id, activeTab])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'visits') {
        const res = await fetch(`/api/clients/${client.id}/visits`)
        if (res.ok) setVisits(await res.json())
      } else if (activeTab === 'payments') {
        const res = await fetch(`/api/clients/${client.id}/payments`)
        if (res.ok) setPayments(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const t = {
    he: {
      visits: 'היסטוריית ביקורים',
      payments: 'פיננסים',
      messages: 'הודעות',
      notes: 'הערות',
      totalSpent: 'סה"כ הוצאות',
      edit: 'עריכה',
      noVisits: 'אין ביקורים',
      noPayments: 'אין תשלומים',
      date: 'תאריך',
      status: 'סטטוס',
      price: 'מחיר',
      method: 'אמצעי',
      phone: 'טלפון',
      birthDate: 'תאריך לידה',
      address: 'כתובת',
      notesLabel: 'הערות',
      loading: 'טוען...',
      comingSoon: 'בקרוב',
      noNotes: 'אין הערות',
    },
    ru: {
      visits: 'История визитов',
      payments: 'Финансы',
      messages: 'Сообщения',
      notes: 'Заметки',
      totalSpent: 'Всего потрачено',
      edit: 'Изменить',
      noVisits: 'Нет визитов',
      noPayments: 'Нет платежей',
      date: 'Дата',
      status: 'Статус',
      price: 'Цена',
      method: 'Способ',
      phone: 'Телефон',
      birthDate: 'Дата рождения',
      address: 'Адрес',
      notesLabel: 'Заметки',
      loading: 'Загрузка...',
      comingSoon: 'Скоро',
      noNotes: 'Нет заметок',
    },
  }

  const l = t[locale]

  if (!isOpen || !client) return null

  const totalSpent = payments.reduce((sum: number, p: any) => sum + (p.amount || p.price || 0), 0)

  const tabs = [
    { key: 'visits', label: l.visits, icon: <Calendar size={16} /> },
    { key: 'payments', label: l.payments, icon: <CreditCard size={16} /> },
    { key: 'messages', label: l.messages, icon: <MessageSquare size={16} /> },
    { key: 'notes', label: l.notes, icon: <FileText size={16} /> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="relative z-10 bg-background shadow-2xl flex h-full w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'grid', gridTemplateColumns: '350px 1fr' }}
      >
        {/* === ЛЕВАЯ ПАНЕЛЬ — Профиль (30%) === */}
        <div className={`p-6 flex flex-col border-e border-muted bg-muted/20`}>
          {/* Закрыть */}
          <button
            onClick={onClose}
            className="self-end mb-4 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>

          {/* Аватар */}
          <div className="flex flex-col items-center mb-6">
            <div className={`${avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3`}>
              {initials}
            </div>
            <h2 className="text-xl font-bold text-center">{fullName}</h2>
          </div>

          {/* Быстрые контакты */}
          <div className="flex justify-center gap-3 mb-6">
            {client.phone && (
              <>
                <button
                  onClick={() => window.location.href = `tel:${client.phone}`}
                  className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                  className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 flex items-center justify-center transition"
                >
                  <MessageCircle size={18} />
                </button>
              </>
            )}
            {client.email && (
              <button
                onClick={() => window.location.href = `mailto:${client.email}`}
                className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center justify-center transition"
              >
                <Mail size={18} />
              </button>
            )}
          </div>

          {/* Данные клиента */}
          <div className="space-y-3 flex-1">
            {client.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l.phone}</span>
                <span className="font-medium" dir="ltr">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium" dir="ltr">{client.email}</span>
              </div>
            )}
            {client.date_of_birth && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l.birthDate}</span>
                <span className="font-medium">{new Date(client.date_of_birth).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</span>
              </div>
            )}
            {client.address && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l.address}</span>
                <span className="font-medium">{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="text-sm mt-4">
                <span className="text-muted-foreground block mb-1">{l.notesLabel}</span>
                <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Кнопка Edit внизу */}
          <TrinityButton
            variant="edit"
            fullWidth
            icon={<Pencil size={16} />}
            onClick={() => onEdit(client)}
            className="mt-4"
          >
            {l.edit}
          </TrinityButton>
        </div>

        {/* === ПРАВАЯ ПАНЕЛЬ — Activity Stream (70%) === */}
        <div className="flex flex-col">
          {/* KPI заголовок */}
          <div className="px-6 py-4 border-b border-muted flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{l.totalSpent}</p>
              <p className="text-2xl font-bold">₪{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-muted px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {l.loading}
              </div>
            ) : activeTab === 'visits' ? (
              visits.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">{l.noVisits}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted text-muted-foreground">
                      <th className="text-start py-2 font-medium">{l.date}</th>
                      <th className="text-start py-2 font-medium">{l.status}</th>
                      <th className="text-end py-2 font-medium">{l.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v: any) => (
                      <tr key={v.id} className="border-b border-muted/50 hover:bg-muted/30 transition">
                        <td className="py-3">
                          {new Date(v.scheduled_at || v.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : v.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : v.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 text-end font-medium">
                          {v.price ? `₪${v.price}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === 'payments' ? (
              payments.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">{l.noPayments}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted text-muted-foreground">
                      <th className="text-start py-2 font-medium">{l.date}</th>
                      <th className="text-start py-2 font-medium">{l.method}</th>
                      <th className="text-start py-2 font-medium">{l.status}</th>
                      <th className="text-end py-2 font-medium">{l.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-muted/50 hover:bg-muted/30 transition">
                        <td className="py-3">{new Date(p.created_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}</td>
                        <td className="py-3">{p.method || '—'}</td>
                        <td className="py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'completed' || p.status === 'success'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-end font-medium">₪{p.amount || p.price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === 'messages' ? (
              <p className="text-center py-12 text-muted-foreground text-sm">
                {l.comingSoon}
              </p>
            ) : (
              <div className="py-4">
                <p className="whitespace-pre-wrap text-sm">{client.notes || l.noNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
