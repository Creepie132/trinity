'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Mail, Copy, Send, RefreshCw, Loader2 } from 'lucide-react'
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
  const router = useRouter()
  const { language } = useLanguage()
  const supabase = createSupabaseBrowserClient()

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

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

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t.emailRequired)
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: message || null }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      const data = await response.json()

      toast.success(`${t.successSent} ${email}`)
      
      // Show invite URL
      if (data.inviteUrl) {
        toast.info(`${t.inviteUrl} ${data.inviteUrl}`, {
          duration: 10000,
        })
      }

      setEmail('')
      setMessage('')
      loadInvitations()
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const APP_URL = window.location.origin
    const inviteUrl = `${APP_URL}/invite/${token}`
    navigator.clipboard.writeText(inviteUrl)
    toast.success(t.copied)
  }

  const resendInvitation = async (invitation: Invitation) => {
    setSending(true)
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
    } finally {
      setSending(false)
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
        <h1 className="text-3xl font-bold">{t.title}</h1>
      </div>

      {/* Send Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {t.sendInvitation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">{t.email} *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">{t.message}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.send}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
              return actions
            }}
            locale={language}
          />
        </CardContent>
      </Card>
    </div>
  )
}
