'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { useDemoMode } from '@/hooks/useDemoMode'
import { DemoStub, DemoStubConfig } from '@/components/demo/DemoStub'
import {
  Crown, Shield, User, Trash2, ArrowLeft,
  UserPlus, Briefcase, LayoutDashboard, ChevronDown,
  Sparkles, Clock, Mail,
} from 'lucide-react'
import AddWorkerWizard from '@/components/settings/AddWorkerWizard'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const BASE_PRICE = 249
const PER_USER = 99

// ─── i18n ────────────────────────────────────────────────────────────────────
const tr = {
  ru: {
    title: 'Команда',
    subtitle: 'Управляйте доступом сотрудников',
    back: 'Назад к настройкам',
    addMember: 'Добавить сотрудника',
    noPermission: 'Нет прав для управления пользователями',
    removed: 'Удалён',
    roleChanged: 'Роль изменена',
    joined: 'Добавлен',
    you: 'вы',
    pending: 'Ожидает',
    confirmRemove: 'Точно удалить?',
    cancel: 'Отмена',
    remove: 'Удалить',
    roles: {
      owner:     { label: 'Владелец',   desc: 'Полный доступ ко всей системе' },
      moderator: { label: 'Менеджер',   desc: 'Полный доступ, без финансов' },
      manager:   { label: 'Продажник',  desc: 'Только /worker/dashboard' },
      user:      { label: 'Сотрудник',  desc: 'Стандартный доступ' },
    } as Record<string, { label: string; desc: string }>,
    billing: (n: number, p: number) => `${n} участников · ₪${p}/мес`,
  },
  he: {
    title: 'צוות',
    subtitle: 'נהל גישה של עובדים',
    back: 'חזרה להגדרות',
    addMember: 'הוסף עובד',
    noPermission: 'אין הרשאה לנהל משתמשים',
    removed: 'הוסר',
    roleChanged: 'התפקיד שונה',
    joined: 'הצטרף',
    you: 'אתה',
    pending: 'ממתין',
    confirmRemove: 'למחוק?',
    cancel: 'ביטול',
    remove: 'הסר',
    roles: {
      owner:     { label: 'בעלים',   desc: 'גישה מלאה לכל המערכת' },
      moderator: { label: 'מנהל',    desc: 'גישה מלאה ללא כספים' },
      manager:   { label: 'איש מכירות', desc: 'רק /worker/dashboard' },
      user:      { label: 'עובד',    desc: 'גישה סטנדרטית' },
    } as Record<string, { label: string; desc: string }>,
    billing: (n: number, p: number) => `${n} משתתפים · ₪${p}/חודש`,
  },
}

// ─── Role meta ───────────────────────────────────────────────────────────────
const ROLE_ORDER = ['owner', 'moderator', 'manager', 'user']

function roleColor(role: string) {
  if (role === 'owner')     return 'from-amber-400 to-orange-500'
  if (role === 'moderator') return 'from-violet-500 to-purple-600'
  if (role === 'manager')   return 'from-emerald-400 to-teal-500'
  return 'from-slate-400 to-slate-500'
}

function roleBadge(role: string) {
  if (role === 'owner')     return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700'
  if (role === 'moderator') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-700'
  if (role === 'manager')   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600'
}

function roleIcon(role: string, cls = 'w-3.5 h-3.5') {
  if (role === 'owner')     return <Crown className={cls} />
  if (role === 'moderator') return <Shield className={cls} />
  if (role === 'manager')   return <LayoutDashboard className={cls} />
  return <User className={cls} />
}

function avatarLetter(member: OrgMember) {
  if (member.full_name) return member.full_name[0].toUpperCase()
  return member.email[0].toUpperCase()
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrgMember {
  email: string
  role: string
  user_id: string | null
  joined_at: string | null
  full_name: string | null
  status: 'active' | 'pending'
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function UsersSettingsPage() {
  const { orgId, user: currentUser } = useAuth()
  const { language } = useLanguage()
  const { isDemo } = useDemoMode()
  const permissions = usePermissions()
  const queryClient = useQueryClient()

  const STUB: DemoStubConfig = {
    emoji: '👥', titleRu: 'Управление командой', titleHe: 'ניהול צוות',
    descRu: 'Приглашайте сотрудников, назначайте роли и управляйте доступом.',
    descHe: 'הזמן עובדים, הגדר תפקידים ונהל גישה.',
    featuresRu: ['Роли: Владелец, Менеджер, Продажник', 'Мгновенное добавление', 'Управление доступом'],
    featuresHe: ['תפקידים: בעלים, מנהל, איש מכירות', 'הוספה מיידית', 'ניהול גישה'],
    accentColor: 'from-indigo-500 to-violet-600',
  }
  if (isDemo) return <DemoStub config={STUB} />

  const locale = language === 'he' ? 'he' : 'ru'
  const t = tr[locale]
  const isRtl = locale === 'he'

  const [showWizard, setShowWizard] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['org-team', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch('/api/org/team')
      if (!res.ok) throw new Error('Failed to load team')
      return res.json() as Promise<{ users: OrgMember[]; count: number; billing: number }>
    },
  })

  const remove = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/org/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['org-team'] }); toast.success(t.removed); setConfirmDelete(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const changeRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch('/api/org/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error') }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['org-team'] }); toast.success(t.roleChanged); setRoleDropdown(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const members = data?.users || []
  const count = data?.count ?? 0
  const billing = data?.billing ?? 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div>
        <Link href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mb-5 transition-colors group"
        >
          <ArrowLeft className={cn('w-4 h-4 transition-transform group-hover:-translate-x-0.5', isRtl && 'rotate-180 group-hover:translate-x-0.5 group-hover:-translate-x-0')} />
          {t.back}
        </Link>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t.subtitle}</p>
          </div>
          {/* Billing pill */}
          {count > 0 && (
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full ring-1 ring-indigo-100 dark:ring-indigo-800 whitespace-nowrap">
              {t.billing(count, billing)}
            </div>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {isLoading ? (
          /* Skeleton */
          <div className="space-y-2">
            {[1,2].map(i => (
              <div key={i} className="h-[72px] rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{locale === 'ru' ? 'Пока никого нет. Добавьте первого!' : 'עדיין אין אף אחד. הוסף ראשון!'}</p>
          </div>
        ) : (
          members.map((member, idx) => {
            const isCurrentUser = member.email === currentUser?.email
            const isOwner = member.role === 'owner'
            const roleInfo = t.roles[member.role] ?? { label: member.role, desc: '' }
            return (
              <div
                key={member.email}
                className="group relative bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-4 flex items-center gap-3.5
                  hover:border-gray-200 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Color bar */}
                <div className={cn('absolute start-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b opacity-70', roleColor(member.role))} />

                {/* Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 ms-1.5',
                  member.status === 'pending'
                    ? 'bg-gray-300 dark:bg-slate-600'
                    : `bg-gradient-to-br ${roleColor(member.role)}`
                )}>
                  {member.status === 'pending' ? <Mail className="w-4 h-4 opacity-70" /> : avatarLetter(member)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {member.full_name || member.email}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                        {t.you}
                      </span>
                    )}
                    {member.status === 'pending' && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                        {t.pending}
                      </span>
                    )}
                  </div>
                  {member.full_name && (
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  )}
                  {member.joined_at && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(member.joined_at).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                    </p>
                  )}
                </div>

                {/* Role badge + dropdown */}
                {permissions.canManageUsers ? (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setRoleDropdown(roleDropdown === member.email ? null : member.email)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                        roleBadge(member.role),
                        'hover:opacity-80'
                      )}
                    >
                      {roleIcon(member.role)}
                      {roleInfo.label}
                      <ChevronDown className={cn('w-3 h-3 transition-transform', roleDropdown === member.email && 'rotate-180')} />
                    </button>

                    {roleDropdown === member.email && (
                      <div className="absolute top-full mt-1.5 end-0 z-20 w-52 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-1.5 space-y-0.5">
                          {ROLE_ORDER.filter(r => r !== 'owner').map((r) => {
                            const ri = t.roles[r] ?? { label: r, desc: '' }
                            return (
                              <button
                                key={r}
                                onClick={() => { if (r !== member.role) changeRole.mutate({ email: member.email, role: r }); else setRoleDropdown(null) }}
                                className={cn(
                                  'w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-start transition-colors text-xs',
                                  r === member.role
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/60 text-gray-700 dark:text-gray-300'
                                )}
                              >
                                <span className="mt-0.5 flex-shrink-0">{roleIcon(r)}</span>
                                <div>
                                  <p className="font-semibold">{ri.label}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{ri.desc}</p>
                                </div>
                                {r === member.role && <span className="ms-auto mt-0.5 text-indigo-500">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold', roleBadge(member.role))}>
                    {roleIcon(member.role)}
                    {roleInfo.label}
                  </span>
                )}

                {/* Delete button */}
                {permissions.canManageUsers && !isCurrentUser && (
                  <div className="flex-shrink-0">
                    {confirmDelete === member.email ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => remove.mutate(member.email)}
                          disabled={remove.isPending}
                          className="text-[11px] bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {t.confirmRemove}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(member.email)}
                        className="p-2 rounded-xl text-gray-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
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

      {/* Add button — only one, clean */}
      {permissions.canManageUsers && (
        <button
          onClick={() => setShowWizard(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl
            bg-gradient-to-r from-indigo-600 to-violet-600
            hover:from-indigo-500 hover:to-violet-500
            active:scale-[0.98]
            text-white text-sm font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900/30
            transition-all duration-200"
        >
          <UserPlus className="w-4 h-4" />
          {t.addMember}
        </button>
      )}

      {!permissions.canManageUsers && (
        <p className="text-center py-8 text-gray-400 text-sm">{t.noPermission}</p>
      )}

      {/* Roles legend */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-700/60 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700/60">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {locale === 'ru' ? 'Уровни доступа' : 'רמות גישה'}
          </p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-700/40">
          {ROLE_ORDER.map(r => {
            const ri = t.roles[r] ?? { label: r, desc: '' }
            return (
              <div key={r} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800/40 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br flex-shrink-0', roleColor(r))}>
                  {roleIcon(r, 'w-3.5 h-3.5 text-white')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{ri.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{ri.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Wizard */}
      <AddWorkerWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['org-team'] })
          setShowWizard(false)
        }}
        lang={locale as 'he' | 'ru'}
      />
    </div>
  )
}
