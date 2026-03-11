'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { Switch } from '@/components/ui/switch'
import { Loader2, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface OrgUser {
  user_id: string
  full_name: string
  email: string
  role: string
}

interface PermissionRow {
  key: string
  label: string
}

const PERMISSION_ROWS: PermissionRow[] = [
  { key: 'view_all_visits', label: 'צפייה בתורים של כולם' },
  { key: 'create_visits', label: 'יצירת תורים' },
  { key: 'manage_clients', label: 'עריכת לקוחות' },
  { key: 'view_payments', label: 'צפייה בתשלומים' },
  { key: 'transfer_products', label: 'העברת מוצרים בין סניפים' },
]

export default function PermissionsSettingsPage() {
  const router = useRouter()
  const { role } = useAuth()
  const { language } = useLanguage()
  const isHe = language === 'he'

  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // key being saved

  // Only owners can access this page
  useEffect(() => {
    if (role && role !== 'owner') {
      router.replace('/settings')
    }
  }, [role, router])

  // Load org users (non-owners only)
  useEffect(() => {
    fetch('/api/org-users')
      .then(r => r.ok ? r.json() : [])
      .then((data: OrgUser[]) => {
        const nonOwners = data.filter(u => u.role !== 'owner')
        setOrgUsers(nonOwners)
      })
      .catch(() => {})
  }, [])

  // Load permissions when user selected
  useEffect(() => {
    if (!selectedUserId) {
      setPermissions({})
      return
    }
    setLoadingPerms(true)
    fetch(`/api/staff-permissions?userId=${selectedUserId}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setPermissions(data))
      .catch(() => {})
      .finally(() => setLoadingPerms(false))
  }, [selectedUserId])

  async function handleToggle(permKey: string, value: boolean) {
    setSaving(permKey)
    try {
      const res = await fetch('/api/staff-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          permission_key: permKey,
          is_enabled: value,
        }),
      })
      if (res.ok) {
        setPermissions(prev => ({ ...prev, [permKey]: value }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(null)
    }
  }

  if (role && role !== 'owner') return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-3 md:px-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {isHe ? 'הרשאות עובדים' : 'Разрешения сотрудников'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isHe ? 'קבע מה כל עובד יכול לעשות במערכת' : 'Управляйте доступом сотрудников к функциям'}
          </p>
        </div>
      </div>

      {/* User selector */}
      <div className="bg-card rounded-2xl border p-4">
        <label className="block text-sm font-medium mb-2">
          {isHe ? 'בחר עובד' : 'Выберите сотрудника'}
        </label>
        <select
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <option value="">{isHe ? '— בחר עובד —' : '— Выберите —'}</option>
          {orgUsers.map(u => (
            <option key={u.user_id} value={u.user_id}>
              {u.full_name || u.email}
              {u.role ? ` (${u.role})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Permissions toggles */}
      {selectedUserId && (
        <div className="bg-card rounded-2xl border divide-y">
          {loadingPerms ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            PERMISSION_ROWS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {saving === key && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={!!permissions[key]}
                    onCheckedChange={val => handleToggle(key, val)}
                    disabled={saving !== null}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!selectedUserId && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {isHe ? 'בחר עובד כדי לנהל הרשאות' : 'Выберите сотрудника для управления доступом'}
        </div>
      )}
    </div>
  )
}
