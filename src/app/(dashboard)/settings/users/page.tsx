'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Trash2,
  ArrowLeft,
  Crown,
  Shield,
  User,
  Mail,
  Clock,
  ChevronDown,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useBranches } from '@/hooks/useBranches'

const BASE_PRICE = 249
const PER_USER = 99

const tr = {
  he: {
    title: 'ניהול צוות',
    subtitle: 'הזמן עובדים ונהל הרשאות',
    back: 'חזרה להגדרות',
    invite: 'הזמן עובד',
    inviteTitle: 'הזמנת עובד חדש',
    emailLabel: 'כתובת אימייל',
    roleLabel: 'תפקיד',
    send: 'שלח הזמנה',
    cancel: 'ביטול',
    remove: 'הסר',
    confirmRemove: 'האם למחוק?',
    pending: 'ממתין',
    active: 'פעיל',
    owner: 'בעלים',
    moderator: 'מנהל משמרת',
    user: 'עובד',
    billingNote: (n: number, price: number) => `${n} משתמשים — ₪${price}/חודש`,
    noPermission: 'אין לך הרשאה לנהל משתמשים',
    emailRequired: 'נדרש אימייל',
    emailSent: 'ההזמנה נשלחה בהצלחה',
    removed: 'המשתמש הוסר',
    roleChanged: 'התפקיד שונה',
    joined: 'הצטרף',
    branchLabel: 'לאיזה סניף?',
    mainBranch: 'ראשי (כל הסניפים)',
  },
  ru: {
    title: 'Управление командой',
    subtitle: 'Приглашайте сотрудников и управляйте правами',
    back: 'Назад к настройкам',
    invite: 'Пригласить сотрудника',
    inviteTitle: 'Приглашение нового сотрудника',
    emailLabel: 'Email адрес',
    roleLabel: 'Роль',
    send: 'Отправить приглашение',
    cancel: 'Отмена',
    remove: 'Удалить',
    confirmRemove: 'Удалить?',
    pending: 'Ожидает',
    active: 'Активен',
    owner: 'Владелец',
    moderator: 'Модератор',
    user: 'Сотрудник',
    billingNote: (n: number, price: number) => `${n} пользователей — ₪${price}/мес`,
    noPermission: 'Нет прав для управления пользователями',
    emailRequired: 'Email обязателен',
    emailSent: 'Приглашение отправлено',
    removed: 'Пользователь удалён',
    roleChanged: 'Роль изменена',
    joined: 'Добавлен',
    branchLabel: 'В какой филиал?',
    mainBranch: 'Главный (все филиалы)',
  },
}

interface OrgMember {
  email: string
  role: string
  user_id: string | null
  joined_at: string | null
  full_name: string | null
  status: 'active' | 'pending'
}

const ROLES = ['owner', 'moderator', 'user'] as const

function roleIcon(role: string) {
  if (role === 'owner') return <Crown className="w-3.5 h-3.5" />
  if (role === 'moderator') return <Shield className="w-3.5 h-3.5" />
  return <User className="w-3.5 h-3.5" />
}

function roleBg(role: string) {
  if (role === 'owner') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (role === 'moderator') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
}

function avatarText(member: OrgMember) {
  if (member.full_name) return member.full_name[0].toUpperCase()
  return member.email[0].toUpperCase()
}

export default function UsersSettingsPage() {
  const { orgId, user: currentUser } = useAuth()
  const { language } = useLanguage()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  const locale = language === 'he' ? 'he' : 'ru'
  const t = tr[locale]
  const isRtl = locale === 'he'

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'owner' | 'moderator' | 'user'>('user')
  const [inviteTargetOrgId, setInviteTargetOrgId] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)

  const { data: branches = [] } = useBranches()

  // Fetch team members
  const { data, isLoading } = useQuery({
    queryKey: ['org-team', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch('/api/org/team')
      if (!res.ok) throw new Error('Failed to load team')
      return res.json() as Promise<{ users: OrgMember[]; count: number; billing: number }>
    },
  })

  // Invite mutation
  const invite = useMutation({
    mutationFn: async ({ email, role, targetOrgId }: { email: string; role: string; targetOrgId?: string }) => {
      const res = await fetch('/api/org/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, targetOrgId: targetOrgId || undefined }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Error')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-team'] })
      toast.success(t.emailSent)
      setInviteEmail('')
      setInviteTargetOrgId('')
      setShowInviteForm(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Remove mutation
  const remove = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/org/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Error')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-team'] })
      toast.success(t.removed)
      setConfirmDelete(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Change role mutation
  const changeRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch('/api/org/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Error')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-team'] })
      toast.success(t.roleChanged)
      setRoleDropdown(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error(t.emailRequired)
      return
    }
    invite.mutate({ email: inviteEmail.trim(), role: inviteRole, targetOrgId: inviteTargetOrgId || undefined })
  }

  const members = data?.users || []
  const billing = data?.billing ?? 0
  const count = data?.count ?? 0

  return (
    <div className="space-y-6 max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className={cn('w-4 h-4', isRtl && 'rotate-180')} />
          {t.back}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t.subtitle}</p>
      </div>

      {/* Billing counter */}
      {count > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl px-5 py-3 flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            {t.billingNote(count, billing)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 ms-auto opacity-70">
            ₪{BASE_PRICE} + {Math.max(0, count - 1)} × ₪{PER_USER}
          </p>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">...</div>
        ) : (
          members.map((member) => {
            const isCurrentUser = member.email === currentUser?.email
            const isOwner = member.role === 'owner'
            return (
              <div
                key={member.email}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0',
                  member.status === 'pending'
                    ? 'bg-gray-400'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                )}>
                  {member.status === 'pending' ? (
                    <Mail className="w-5 h-5" />
                  ) : (
                    avatarText(member)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {member.full_name || member.email}
                    {isCurrentUser && (
                      <span className="ms-2 text-xs text-gray-400">(вы / אתה)</span>
                    )}
                  </p>
                  {member.full_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                  )}
                  {member.joined_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {t.joined}: {new Date(member.joined_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                {member.status === 'pending' && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {t.pending}
                  </span>
                )}

                {/* Role selector (owner only, not self if only owner) */}
                {permissions.canManageUsers && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setRoleDropdown(roleDropdown === member.email ? null : member.email)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        roleBg(member.role),
                        'hover:opacity-80 cursor-pointer'
                      )}
                    >
                      {roleIcon(member.role)}
                      <span>{t[member.role as keyof typeof t] as string || member.role}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {roleDropdown === member.email && (
                      <div className="absolute top-full mt-1 end-0 z-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                        {ROLES.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              if (r !== member.role) {
                                changeRole.mutate({ email: member.email, role: r })
                              } else {
                                setRoleDropdown(null)
                              }
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-start',
                              r === member.role && 'font-bold'
                            )}
                          >
                            {roleIcon(r)}
                            <span>{t[r as keyof typeof t] as string}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Remove button */}
                {permissions.canManageUsers && !isCurrentUser && (
                  <div className="flex-shrink-0">
                    {confirmDelete === member.email ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => remove.mutate(member.email)}
                          disabled={remove.isPending}
                          className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          {t.confirmRemove}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(member.email)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        title={t.remove}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Invite form */}
      {permissions.canManageUsers && showInviteForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            {t.inviteTitle}
          </h3>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              {t.emailLabel}
            </label>
            <input
              autoFocus
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="employee@example.com"
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
              {t.roleLabel}
            </label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border-2 transition-all',
                    inviteRole === r
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {roleIcon(r)}
                  {t[r as keyof typeof t] as string}
                </button>
              ))}
            </div>
          </div>

          {/* Branch selector — only shown when branches exist */}
          {branches.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                {t.branchLabel}
              </label>
              <div className="relative">
                <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={inviteTargetOrgId}
                  onChange={(e) => setInviteTargetOrgId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg ps-9 pe-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">{t.mainBranch}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.child_org_id}>
                      {branch.name}
                      {branch.address ? ` — ${branch.address}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Billing preview */}
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
            {locale === 'he'
              ? `לאחר ההזמנה: ${count + 1} משתמשים — ₪${BASE_PRICE + count * PER_USER}/חודש`
              : `После добавления: ${count + 1} пользователей — ₪${BASE_PRICE + count * PER_USER}/мес`}
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleInvite}
              disabled={invite.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-50"
            >
              {invite.isPending ? '...' : t.send}
            </button>
            <button
              onClick={() => { setShowInviteForm(false); setInviteEmail(''); setInviteTargetOrgId('') }}
              className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Invite button */}
      {permissions.canManageUsers && !showInviteForm && (
        <button
          onClick={() => setShowInviteForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          {t.invite}
        </button>
      )}

      {/* No permission notice */}
      {!permissions.canManageUsers && (
        <div className="text-center py-8 text-gray-400 text-sm">
          {t.noPermission}
        </div>
      )}
    </div>
  )
}
