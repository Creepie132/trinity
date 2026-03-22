'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Mail, Copy, Trash2 } from 'lucide-react'
import { ResponsiveDataView } from '@/components/ui/ResponsiveDataView'

interface Invitation {
  id: string
  email: string
  message: string | null
  status: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  token: string
}

export default function AdminInvitationsPage() {
  const { language } = useLanguage()

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  const translations = {
    he: {
      title: 'הזמנות',
      sendInvitation: 'שלח הזמנה',
      email: 'אימייל',
      message: 'הודעה',
      messagePlaceholder: 'הודעה אישית למקבל...',
      send: 'שלח',
      sending: 'שולח...',
      invitationsList: 'רשימת הזמנות',
      status: 'סטטוס',
      sentDate: 'תאריך שליחה',
      acceptedDate: 'תאריך קבלה',
      actions: 'פעולות',
      copyLink: 'העתק קישור',
      resend: 'שלח שוב',
      inviteAgain: 'הזמן מחדש',
      deleteInvitation: 'מחק הזמנה',
      deleteConfirm: 'למחוק את ההזמנה?',
      deleted: 'ההזמנה נמחקה',
      statuses: {
        pending: 'ממתין',
        accepted: 'התקבל',
        expired: 'פג תוקף',
      },
      successSent: 'ההזמנה נשלחה ל',
      inviteUrl: 'קישור הזמנה:',
      copied: 'הקישור הועתק',
      emailRequired: 'נדרש אימייל',
    },
    ru: {
      title: 'Приглашения',
      sendInvitation: 'Отправить приглашение',
      email: 'Email',
      message: 'Сообщение',
      messagePlaceholder: 'Персональное сообщение для получателя...',
      send: 'Отправить',
      sending: 'Отправка...',
      invitationsList: 'Список приглашений',
      status: 'Статус',
      sentDate: 'Дата отправки',
      acceptedDate: 'Дата принятия',
      actions: 'Действия',
      copyLink: 'Скопировать ссылку',
      resend: 'Отправить повторно',
      inviteAgain: 'Пригласить заново',
      deleteInvitation: 'Удалить',
      deleteConfirm: 'Удалить приглашение?',
      deleted: 'Приглашение удалено',
      statuses: {
        pending: 'Ожидает',
        accepted: 'Принято',
        expired: 'Истекло',
      },
      successSent: 'Приглашение отправлено на',
      inviteUrl: 'Ссылка приглашения:',
      copied: 'Ссылка скопирована',
      emailRequired: 'Требуется email',
    },
  }

  const t = translations[language]

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/admin/invitations')
      if (!response.ok) throw new Error('Failed to load invitations')
      const data = await response.json()
      setInvitations(data || [])
    } catch (error) {
      console.error('Error loading invitations:', error)
      toast.error('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const APP_URL = window.location.origin
    const inviteUrl = `${APP_URL}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    toast.success(t.copied)
  }

  const resendInvitation = async (invitation: Invitation) => {
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          message: invitation.message,
        }),
      })

      if (!response.ok) throw new Error('Failed to resend')

      toast.success(`${t.successSent} ${invitation.email}`)
      loadInvitations()
    } catch (error) {
      console.error('Error resending:', error)
      toast.error('Failed to resend invitation')
    }
  }

  const deleteInvitation = async (invitation: Invitation) => {
    if (!confirm(t.deleteConfirm)) return
    try {
      const response = await fetch(`/api/admin/invitations?id=${invitation.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success(t.deleted)
      loadInvitations()
    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast.error('Failed to delete invitation')
    }
  }

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (invitation.status === 'accepted') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          ✅ {t.statuses.accepted}
        </Badge>
      )
    }

    if (invitation.status === 'pending' && expiresAt < now) {
      return (
        <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
          ⏰ {t.statuses.expired}
        </Badge>
      )
    }

    return (
      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        ⏳ {t.statuses.pending}
      </Badge>
    )
  }

  const isExpired = (invitation: Invitation) => {
    return new Date(invitation.expires_at) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="w-8 h-8 text-amber-600" />
        <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t.invitationsList}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveDataView
            columns={[
              {
                key: 'email',
                label: t.email,
                compact: true,
                render: (val, row) => (
                  <div>
                    <p className="font-medium">{val}</p>
                    {row.message && (
                      <p className="text-sm text-gray-500 italic truncate max-w-xs">
                        "{row.message}"
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                label: t.status,
                compact: true,
                render: (val, row) => getStatusBadge(row),
              },
              {
                key: 'created_at',
                label: t.sentDate,
                compact: true,
                render: (val) =>
                  new Date(val).toLocaleDateString(
                    language === 'he' ? 'he-IL' : 'ru-RU'
                  ),
              },
              {
                key: 'accepted_at',
                label: t.acceptedDate,
                render: (val) =>
                  val
                    ? new Date(val).toLocaleDateString(
                        language === 'he' ? 'he-IL' : 'ru-RU'
                      )
                    : '-',
              },
              {
                key: 'expires_at',
                label: language === 'he' ? 'תפוגה' : 'Истекает',
                render: (val) =>
                  new Date(val).toLocaleDateString(
                    language === 'he' ? 'he-IL' : 'ru-RU'
                  ),
              },
            ]}
            data={invitations}
            titleKey="email"
            badgeKey="status"
            badgeColorMap={{
              pending: 'yellow',
              accepted: 'green',
              expired: 'gray',
            }}
            actions={(row) => {
              const actions = []
              if (row.status === 'pending' && !isExpired(row)) {
                actions.push({
                  label: t.copyLink,
                  onClick: () => copyInviteLink(row.token),
                })
                actions.push({
                  label: t.resend,
                  onClick: () => resendInvitation(row),
                })
              }
              if (row.status === 'expired' || isExpired(row)) {
                actions.push({
                  label: t.inviteAgain,
                  onClick: () => resendInvitation(row),
                })
              }
              if (row.status !== 'accepted') {
                actions.push({
                  label: t.deleteInvitation,
                  onClick: () => deleteInvitation(row),
                })
              }
              return actions
            }}
            locale={language}
          />
        </CardContent>
      </Card>
    </div>
  )
}
