'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Puzzle, Loader2, RefreshCw, Users, Calendar, CreditCard, Package, CheckSquare, Wifi, WifiOff, Clock } from 'lucide-react'
import { MODULES } from '@/lib/modules-config'

// Маппинг модуля → иконка использования и метрика
const MODULE_USAGE: Record<string, { icon: any; metricKey: string; labelRu: string; labelHe: string }> = {
  clients:       { icon: Users,     metricKey: 'clients',    labelRu: 'клиентов', labelHe: 'לקוחות' },
  visits:        { icon: Calendar,  metricKey: 'visits30d',  labelRu: 'визитов/мес', labelHe: 'ביקורים' },
  payments:      { icon: CreditCard,metricKey: 'payments30d',labelRu: 'платежей/мес', labelHe: 'תשלומים' },
  inventory:     { icon: Package,   metricKey: 'products',   labelRu: 'товаров', labelHe: 'מוצרים' },
  diary:         { icon: Calendar,  metricKey: 'visits30d',  labelRu: 'записей/мес', labelHe: 'רשומות' },
  booking:       { icon: Calendar,  metricKey: 'bookings30d',labelRu: 'броней/мес', labelHe: 'הזמנות' },
  subscriptions: { icon: CheckSquare,metricKey:'tasks',      labelRu: 'подписок', labelHe: 'מנויים' },
}

function formatLastSeen(dateStr: string | null | undefined, lang: 'he' | 'ru') {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return lang === 'he' ? `${mins} ד'` : `${mins} мин`
  if (hours < 24) return lang === 'he' ? `${hours} ש'` : `${hours} ч`
  return lang === 'he' ? `${days} ימים` : `${days} дн`
}

interface OrgData {
  id: string; name: string; status: string; last_seen_at: string | null
  modules: Record<string, boolean>
  usage: Record<string, number>
}

// Модули которые показываем в матрице (основные)
const KEY_MODULES = ['clients', 'visits', 'diary', 'payments', 'inventory', 'booking', 'subscriptions', 'sms', 'statistics', 'loyalty']

export default function AdminModulesPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [orgs, setOrgs] = useState<OrgData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/modules-analytics')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrgs(data.orgs || [])
    } catch {
      toast.error(l ? 'שגיאה' : 'Ошибка загрузки')
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  // Считаем сколько орг используют каждый модуль
  const moduleStats = KEY_MODULES.reduce<Record<string, { enabled: number; active: number }>>((acc, key) => {
    acc[key] = {
      enabled: orgs.filter(o => o.modules[key]).length,
      active: orgs.filter(o => o.modules[key] && (o.usage[MODULE_USAGE[key]?.metricKey] || 0) > 0).length,
    }
    return acc
  }, {})

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-emerald-500" />
            {l ? 'אנליטיקת מודולים' : 'Аналитика модулей'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {l ? 'מי הפעיל מה ועד כמה הוא משתמש בזה' : 'Кто что включил и насколько активно использует'}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {l ? 'רענן' : 'Обновить'}
        </button>
      </div>

      {/* Module Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {KEY_MODULES.slice(0, 10).map(key => {
          const mod = MODULES.find(m => m.key === key)
          if (!mod) return null
          const { enabled, active } = moduleStats[key]
          const total = orgs.length
          const pct = total > 0 ? Math.round((enabled / total) * 100) : 0
          return (
            <div key={key} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate mb-2">
                {l ? mod.name_he : mod.name_ru}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{enabled}</span>
                  <span className="text-xs text-gray-400">/{total}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                  active === enabled && enabled > 0 ? 'bg-emerald-50 text-emerald-600' :
                  active > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'}`}>
                  {active} {l ? 'פעיל' : 'акт'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{pct}%</p>
            </div>
          )
        })}
      </div>

      {/* Usage Matrix — Desktop */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {l ? 'מטריצת שימוש' : 'Матрица использования'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {l ? '🟢 מופעל ובשימוש · 🟡 מופעל, לא בשימוש · ⭕ כבוי' : '🟢 включён и используется · 🟡 включён, не используется · ⭕ выключен'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-slate-700">
                <th className="text-left px-5 py-3 text-xs text-gray-400 uppercase tracking-wide font-medium w-48">
                  {l ? 'ארגון' : 'Организация'}
                </th>
                {KEY_MODULES.map(key => {
                  const mod = MODULES.find(m => m.key === key)
                  if (!mod) return null
                  return (
                    <th key={key} className="px-3 py-3 text-xs text-gray-400 font-medium text-center whitespace-nowrap">
                      {l ? mod.name_he : mod.name_ru}
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-xs text-gray-400 uppercase tracking-wide font-medium text-right">
                  {l ? 'אקטיביות' : 'Активность'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {orgs.map(org => {
                const ls = formatLastSeen(org.last_seen_at, language)
                const isInactive = !org.last_seen_at || (Date.now() - new Date(org.last_seen_at).getTime()) > 3 * 86400000
                return (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
                          {org.name}
                        </span>
                      </div>
                    </td>
                    {KEY_MODULES.map(key => {
                      const enabled = !!org.modules[key]
                      const usageKey = MODULE_USAGE[key]?.metricKey
                      const usageVal = usageKey ? (org.usage[usageKey] || 0) : 0
                      const isUsed = enabled && usageVal > 0
                      return (
                        <td key={key} className="px-3 py-3.5 text-center">
                          {enabled ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-600'}`}>
                                {isUsed ? '✓' : '·'}
                              </span>
                              {usageVal > 0 && (
                                <span className="text-xs text-gray-400 leading-none">{usageVal}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-200 dark:text-gray-600 text-lg leading-none">○</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                        ${isInactive ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isInactive ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                        {ls || (l ? 'לא ידוע' : 'Неизв.')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — карточки орг */}
      <div className="md:hidden space-y-3">
        {orgs.map(org => {
          const ls = formatLastSeen(org.last_seen_at, language)
          const isInactive = !org.last_seen_at || (Date.now() - new Date(org.last_seen_at).getTime()) > 3 * 86400000
          const enabledCount = KEY_MODULES.filter(k => org.modules[k]).length
          const activeCount = KEY_MODULES.filter(k => {
            if (!org.modules[k]) return false
            const usageKey = MODULE_USAGE[k]?.metricKey
            return usageKey ? (org.usage[usageKey] || 0) > 0 : false
          }).length

          return (
            <div key={org.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{org.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs ${isInactive ? 'text-red-500' : 'text-emerald-600'}`}>
                      {isInactive ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                      {ls || (l ? 'לא ידוע' : 'Неизв.')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">{activeCount}</p>
                  <p className="text-xs text-gray-400">{l ? `מתוך ${enabledCount}` : `из ${enabledCount} акт`}</p>
                </div>
              </div>

              {/* Module grid */}
              <div className="grid grid-cols-5 gap-1.5">
                {KEY_MODULES.map(key => {
                  const mod = MODULES.find(m => m.key === key)
                  if (!mod) return null
                  const enabled = !!org.modules[key]
                  const usageKey = MODULE_USAGE[key]?.metricKey
                  const usageVal = usageKey ? (org.usage[usageKey] || 0) : 0
                  const isUsed = enabled && usageVal > 0
                  return (
                    <div key={key} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg
                      ${isUsed ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                        enabled ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                      <span className={`text-xs ${isUsed ? 'text-emerald-600' : enabled ? 'text-yellow-600' : 'text-gray-300'}`}>
                        {isUsed ? '✓' : enabled ? '·' : '○'}
                      </span>
                      <span className="text-xs text-gray-400 truncate w-full text-center leading-tight" style={{ fontSize: '9px' }}>
                        {l ? mod.name_he.slice(0, 5) : mod.name_ru.slice(0, 5)}
                      </span>
                      {usageVal > 0 && (
                        <span className="text-emerald-600 font-bold leading-none" style={{ fontSize: '9px' }}>{usageVal}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Usage stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-slate-700">
                {[
                  { label: l ? 'לקוחות' : 'Клиенты', val: org.usage.clients },
                  { label: l ? 'ביקורים/חודש' : 'Визиты/мес', val: org.usage.visits30d },
                  { label: l ? 'תשלומים/חודש' : 'Платежи/мес', val: org.usage.payments30d },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <p className="font-bold text-gray-900 dark:text-gray-100">{val}</p>
                    <p className="text-xs text-gray-400 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
