'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { Switch } from '@/components/ui/switch'
import {
  Loader2, Shield, ArrowRight, Users, ChevronDown, ChevronRight,
  Layers, Save, BookOpen, CheckCircle, Trash2, Star, Plus, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ── Типы ──────────────────────────────────────────────────────────────────────
interface OrgUser {
  user_id: string
  full_name: string
  email: string
  role: string
}

interface PermissionSet {
  id: string
  name: string
  description?: string
  permissions: Record<string, boolean>
  is_default: boolean
}

type PermRecord = Record<string, boolean>

// ── Группы разрешений ─────────────────────────────────────────────────────────
interface PermDef { key: string; he: string; ru: string; danger?: boolean }
interface PermGroup { id: string; he: string; ru: string; icon: string; perms: PermDef[] }

const PERM_GROUPS: PermGroup[] = [
  {
    id: 'clients', he: 'לקוחות', ru: 'Клиенты', icon: '👤',
    perms: [
      { key: 'can_view_all_clients',    he: 'צפייה בכל הלקוחות',         ru: 'Просмотр всех клиентов' },
      { key: 'can_manage_clients',      he: 'עריכת לקוחות',              ru: 'Редактирование клиентов' },
      { key: 'can_export_clients',      he: 'ייצוא רשימת לקוחות',        ru: 'Экспорт клиентов' },
      { key: 'can_delete_clients',      he: 'מחיקת לקוחות',              ru: 'Удаление клиентов', danger: true },
      { key: 'can_send_edit_links',     he: 'שליחת קישור עריכה ללקוח',   ru: 'Отправка ссылок на редактирование' },
      { key: 'phone_mask_enabled',      he: 'הסתרת מספרי טלפון',         ru: 'Маскировка телефонов' },
    ],
  },
  {
    id: 'visits', he: 'תורים וביקורים', ru: 'Визиты', icon: '📅',
    perms: [
      { key: 'can_manage_visits',            he: 'יצירה ועריכת תורים',           ru: 'Создание и редактирование визитов' },
      { key: 'can_view_other_staff_visits',  he: 'צפייה בתורים של עובדים אחרים', ru: 'Просмотр визитов других сотрудников' },
      { key: 'can_delete_visits',            he: 'מחיקת תורים',                  ru: 'Удаление визитов', danger: true },
    ],
  },
  {
    id: 'payments', he: 'תשלומים', ru: 'Финансы', icon: '💳',
    perms: [
      { key: 'can_view_payments',    he: 'צפייה בתשלומים',         ru: 'Просмотр платежей' },
      { key: 'can_create_payments',  he: 'קבלת תשלומים',            ru: 'Приём платежей' },
      { key: 'can_apply_discounts',  he: 'הענקת הנחות',             ru: 'Применение скидок' },
      { key: 'can_cancel_payments',  he: 'ביטול תשלומים',           ru: 'Отмена платежей', danger: true },
      { key: 'can_view_reports',     he: 'צפייה בדוחות',            ru: 'Просмотр отчётов' },
      { key: 'can_view_all_reports', he: 'צפייה בכל הדוחות הפיננסיים', ru: 'Просмотр всех финансовых отчётов' },
    ],
  },
  {
    id: 'inventory', he: 'מלאי ומחסן', ru: 'Склад', icon: '📦',
    perms: [
      { key: 'can_transfer_inventory', he: 'העברת מוצרים בין סניפים', ru: 'Перенос товаров между филиалами' },
      { key: 'can_add_inventory',      he: 'הוספת מוצרים',           ru: 'Добавление товаров' },
      { key: 'can_delete_inventory',   he: 'מחיקת מוצרים',           ru: 'Удаление товаров', danger: true },
    ],
  },
  {
    id: 'settings', he: 'הגדרות ועסקים', ru: 'Настройки и сделки', icon: '⚙️',
    perms: [
      { key: 'can_manage_deals',       he: 'ניהול עסקאות',          ru: 'Управление сделками' },
      { key: 'can_delete_deals',       he: 'מחיקת עסקאות',          ru: 'Удаление сделок', danger: true },
      { key: 'can_edit_services',      he: 'עריכת שירותים',         ru: 'Редактирование услуг' },
      { key: 'can_manage_staff',       he: 'ניהול צוות',            ru: 'Управление сотрудниками', danger: true },
      { key: 'can_book_other_branches',he: 'הזמנות בסניפים אחרים', ru: 'Записи в других филиалах' },
    ],
  },
]

// Все ключи для "выбрать всё"
const ALL_KEYS = PERM_GROUPS.flatMap(g => g.perms.map(p => p.key))

// ── Хелперы ──────────────────────────────────────────────────────────────────
function initPerms(): PermRecord {
  return Object.fromEntries(ALL_KEYS.map(k => [k, false]))
}

function permsFromRow(row: Record<string, unknown>): PermRecord {
  const p = initPerms()
  for (const key of ALL_KEYS) {
    if (typeof row[key] === 'boolean') p[key] = row[key] as boolean
  }
  return p
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PermissionsSettingsPage() {
  const router = useRouter()
  const { role, orgId } = useAuth()
  const { language } = useLanguage()
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const t = (he: string, ru: string) => isHe ? he : ru

  // Redirect non-owners
  useEffect(() => {
    if (role && role !== 'owner') router.replace('/settings')
  }, [role, router])

  // ── State ──────────────────────────────────────────────────────────────────
  const [orgUsers, setOrgUsers]       = useState<OrgUser[]>([])
  const [sets, setSets]               = useState<PermissionSet[]>([])
  const [selectedUserId, setUser]     = useState<string>('')
  const [perms, setPerms]             = useState<PermRecord>(initPerms())
  const [selectedSetId, setSetId]     = useState<string | null>(null)
  const [openGroups, setOpenGroups]   = useState<Record<string, boolean>>({ clients: true })
  const [loadingUser, setLoadingUser] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [hasChanges, setHasChanges]   = useState(false)
  // Для создания нового пресета
  const [showNewSet, setShowNewSet]   = useState(false)
  const [newSetName, setNewSetName]   = useState('')
  const [savingSet, setSavingSet]     = useState(false)

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/org-users')
      .then(r => r.ok ? r.json() : [])
      .then((data: OrgUser[]) => setOrgUsers(data.filter(u => u.role !== 'owner')))
      .catch(() => {})

    fetch('/api/permissions/sets')
      .then(r => r.ok ? r.json() : [])
      .then(setSets)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedUserId) { setPerms(initPerms()); setSetId(null); setHasChanges(false); return }
    setLoadingUser(true)
    fetch(`/api/permissions/employee?userId=${selectedUserId}`)
      .then(r => r.ok ? r.json() : {})
      .then((row: Record<string, unknown>) => {
        setPerms(permsFromRow(row))
        setSetId((row.permission_set_id as string | null) ?? null)
        setHasChanges(false)
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false))
  }, [selectedUserId])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const togglePerm = useCallback((key: string, val: boolean) => {
    setPerms(p => ({ ...p, [key]: val }))
    setHasChanges(true)
  }, [])

  const applySet = useCallback((set: PermissionSet) => {
    setPerms(prev => ({ ...prev, ...set.permissions }))
    setSetId(set.id)
    setHasChanges(true)
    toast.success(t(`פרופיל "${set.name}" הוחל`, `Пресет "${set.name}" применён`))
  }, [isHe])

  const selectAll = useCallback((val: boolean) => {
    setPerms(Object.fromEntries(ALL_KEYS.map(k => [k, val])))
    setHasChanges(true)
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups(o => ({ ...o, [groupId]: !o[groupId] }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const res = await fetch('/api/permissions/employee', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, permissions: perms, permission_set_id: selectedSetId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setHasChanges(false)
      toast.success(t('ההרשאות נשמרו', 'Разрешения сохранены'))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }, [selectedUserId, perms, selectedSetId, isHe])

  const handleSaveAsSet = useCallback(async () => {
    if (!newSetName.trim()) return
    setSavingSet(true)
    try {
      const res = await fetch('/api/permissions/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSetName.trim(), permissions: perms }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created: PermissionSet = await res.json()
      setSets(s => [...s, created])
      setNewSetName('')
      setShowNewSet(false)
      toast.success(t(`פרופיל "${created.name}" נשמר`, `Пресет "${created.name}" сохранён`))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingSet(false)
    }
  }, [newSetName, perms, isHe])

  const handleDeleteSet = useCallback(async (setId: string, setName: string) => {
    if (!confirm(t(`למחוק את הפרופיל "${setName}"?`, `Удалить пресет "${setName}"?`))) return
    try {
      const res = await fetch(`/api/permissions/sets?id=${setId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setSets(s => s.filter(x => x.id !== setId))
      if (selectedSetId === setId) setSetId(null)
      toast.success(t('הפרופיל נמחק', 'Пресет удалён'))
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [selectedSetId, isHe])

  const enabledCount = Object.values(perms).filter(Boolean).length
  const selectedUser = orgUsers.find(u => u.user_id === selectedUserId)

  if (role && role !== 'owner') return null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5 px-3 md:px-0 pb-10" dir={dir}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition">
          <ArrowRight className={`w-5 h-5 ${isHe ? 'rotate-180' : ''}`} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            {t('הרשאות עובדים', 'Разрешения сотрудников')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('קבע בדיוק מה כל עובד יכול לעשות', 'Настройте точный уровень доступа каждого сотрудника')}
          </p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="bg-card rounded-2xl border p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Users className="w-4 h-4" />
          {t('בחר עובד', 'Выберите сотрудника')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {orgUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-2">
              {t('אין עובדים בארגון', 'Сотрудников нет')}
            </p>
          ) : orgUsers.map(u => (
            <button
              key={u.user_id}
              onClick={() => setUser(u.user_id)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-start transition-all ${
                selectedUserId === u.user_id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/50'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                {(u.full_name || u.email)?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.role}</p>
              </div>
              {selectedUserId === u.user_id && (
                <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main editor — visible only when user selected */}
      {selectedUserId && (
        <>
          {/* Preset selector */}
          <div className="bg-card rounded-2xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen className="w-4 h-4" />
                {t('פרופילי הרשאות', 'Пресеты разрешений')}
              </div>
              <button
                onClick={() => setShowNewSet(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('שמור פרופיל חדש', 'Сохранить как пресет')}
              </button>
            </div>

            {/* New set form */}
            {showNewSet && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  placeholder={t('שם הפרופיל...', 'Название пресета...')}
                  className="flex-1 px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  dir={dir}
                  onKeyDown={e => e.key === 'Enter' && handleSaveAsSet()}
                />
                <button
                  onClick={handleSaveAsSet}
                  disabled={!newSetName.trim() || savingSet}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {savingSet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {t('שמור', 'Сохранить')}
                </button>
              </div>
            )}

            {sets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('אין פרופילים. שמור פרופיל מההגדרות הנוכחיות.', 'Пресетов нет. Сохраните текущие настройки как пресет.')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sets.map(s => (
                  <div
                    key={s.id}
                    className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                      selectedSetId === s.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700'
                        : 'border-border hover:border-indigo-300 text-foreground'
                    }`}
                    onClick={() => applySet(s)}
                  >
                    {s.is_default && <Star className="w-3 h-3 text-amber-400" />}
                    <Layers className="w-3.5 h-3.5 opacity-60" />
                    {s.name}
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteSet(s.id, s.name) }}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-500 transition-opacity ml-1 p-0.5 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading state */}
          {loadingUser ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex items-center justify-between bg-card rounded-xl border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t(`${enabledCount} הרשאות פעילות מתוך ${ALL_KEYS.length}`,
                       `Включено ${enabledCount} из ${ALL_KEYS.length}`)}
                  </span>
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.round((enabledCount / ALL_KEYS.length) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectAll(true)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    {t('הכל', 'Все')}
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                  >
                    {t('נקה', 'Сбросить')}
                  </button>
                </div>
              </div>

              {/* Permission groups */}
              <div className="space-y-3">
                {PERM_GROUPS.map(group => {
                  const isOpen = !!openGroups[group.id]
                  const groupEnabled = group.perms.filter(p => perms[p.key]).length
                  return (
                    <div key={group.id} className="bg-card rounded-2xl border overflow-hidden">
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition text-start"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{group.icon}</span>
                          <span className="font-semibold text-sm">
                            {isHe ? group.he : group.ru}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            groupEnabled > 0
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {groupEnabled}/{group.perms.length}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        }
                      </button>

                      {/* Permission rows */}
                      {isOpen && (
                        <div className="divide-y border-t">
                          {group.perms.map(perm => (
                            <div
                              key={perm.key}
                              className={`flex items-center justify-between px-4 py-3.5 transition-colors ${
                                perms[perm.key] ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {perm.danger && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                )}
                                <span className={`text-sm ${perm.danger ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                                  {isHe ? perm.he : perm.ru}
                                </span>
                              </div>
                              <Switch
                                checked={!!perms[perm.key]}
                                onCheckedChange={val => togglePerm(perm.key, val)}
                                className={perms[perm.key] ? '!bg-indigo-500' : ''}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sticky save bar */}
              {hasChanges && (
                <div className="sticky bottom-4 z-10">
                  <div className="bg-indigo-600 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl shadow-indigo-500/30">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" />
                      <span>
                        {t(
                          `שינויים לא שמורים עבור ${selectedUser?.full_name || ''}`,
                          `Несохранённые изменения — ${selectedUser?.full_name || ''}`
                        )}
                      </span>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 disabled:opacity-60 transition"
                    >
                      {saving
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Save className="w-4 h-4" />
                      }
                      {t('שמור', 'Сохранить')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!selectedUserId && (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{t('בחר עובד כדי לנהל הרשאות', 'Выберите сотрудника для настройки доступа')}</p>
        </div>
      )}
    </div>
  )
}
