'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Puzzle, Search, Loader2, Save } from 'lucide-react'
import { MODULES } from '@/lib/modules-config'

interface OrgModules {
  id: string
  name: string
  display_name: string
  plan?: string
  features?: any
}

export default function AdminModulesPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [orgs, setOrgs] = useState<OrgModules[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [localOrgs, setLocalOrgs] = useState<OrgModules[]>([])

  useEffect(() => { loadData() }, [])
  useEffect(() => { setLocalOrgs(orgs) }, [orgs])

  const loadData = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions-list')
      const data = await res.json()
      setOrgs(data.organizations || [])
    } finally { setLoading(false) }
  }

  const toggleModule = (orgId: string, moduleKey: string, val: boolean) => {
    setLocalOrgs(prev => prev.map(o => {
      if (o.id !== orgId) return o
      const modules = { ...(o.features?.modules || {}), [moduleKey]: val }
      return { ...o, features: { ...(o.features || {}), modules } }
    }))
  }

  const saveOrg = async (org: OrgModules) => {
    setSaving(org.id)
    try {
      const res = await fetch('/api/admin/organizations/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: org.id,
          features: org.features,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? 'נשמר' : 'Сохранено')
      loadData()
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setSaving(null) }
  }

  const filtered = localOrgs.filter(o =>
    (o.display_name || o.name)?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Puzzle className="w-7 h-7 text-emerald-600" />
        <h1 className="text-2xl font-bold">{l ? 'מודולים לפי ארגון' : 'Модули по организациям'}</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-10"
          placeholder={l ? 'חיפוש...' : 'Поиск...'}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-4">
        {filtered.map(org => (
          <Card key={org.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {org.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-sm">{org.display_name || org.name}</CardTitle>
                  <p className="text-xs text-slate-400">{org.plan || '—'}</p>
                </div>
              </div>
              <Button size="sm" disabled={saving === org.id}
                onClick={() => saveOrg(org)}>
                {saving === org.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <><Save className="w-3 h-3 mr-1" />{l ? 'שמור' : 'Сохранить'}</>}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {MODULES.map(mod => {
                  const enabled = !!org.features?.modules?.[mod.key]
                  return (
                    <div key={mod.key}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                        enabled ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                               : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
                      <Switch
                        checked={enabled}
                        onCheckedChange={v => toggleModule(org.id, mod.key, v)}
                        className="scale-75 flex-shrink-0"
                      />
                      <span className="text-xs font-medium truncate">
                        {l ? mod.name_he : mod.name_ru}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
