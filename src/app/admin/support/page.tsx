'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import {
  HeadphonesIcon, Loader2, RefreshCw, Search,
  Clock, User, Activity, StickyNote, Send, Trash2,
  ChevronDown, ChevronUp, Eye, Wifi, WifiOff,
  AlertTriangle, CheckCircle, FileText, CreditCard, Users,
} from 'lucide-react'

interface OrgInfo {
  id: string; name: string; status: string
  last_seen_at: string | null; owner_email: string
}

interface AuditEntry {
  id: string; org_id: string; user_email: string
  action: string; entity_type: string; created_at: string
}

interface AdminNote {
  id: string; org_id: string; admin_email: string
  note: string; created_at: string
}

const ACTION_ICONS: Record<string, any> = {
  create: CheckCircle, update: FileText, delete: AlertTriangle,
  export: Users, login: User, payment: CreditCard,
}
const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-600 bg-emerald-50', update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-500 bg-red-50', export: 'text-purple-600 bg-purple-50',
  login: 'text-gray-600 bg-gray-50',
}
const ACTION_LABELS: Record<string, { ru: string; he: string }> = {
  create:      { ru: 'Создал',    he: 'יצר' },
  update:      { ru: 'Изменил',   he: 'עדכן' },
  delete:      { ru: 'Удалил',    he: 'מחק' },
  export:      { ru: 'Экспорт',   he: 'ייצוא' },
  login:       { ru: 'Вошёл',     he: 'כניסה' },
}
const ENTITY_LABELS: Record<string, { ru: string; he: string }> = {
  payment:      { ru: 'платёж',      he: 'תשלום' },
  client:       { ru: 'клиента',     he: 'לקוח' },
  client_gdpr:  { ru: 'клиента (GDPR)', he: 'לקוח (GDPR)' },
  clients:      { ru: 'клиентов',    he: 'לקוחות' },
  organization: { ru: 'организацию', he: 'ארגון' },
  visit:        { ru: 'визит',       he: 'ביקור' },
  product:      { ru: 'товар',       he: 'מוצר' },
}

function timeAgo(dateStr: string, lang: 'he' | 'ru') {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return lang === 'he' ? 'עכשיו' : 'только что'
  if (mins < 60) return lang === 'he' ? `${mins} ד' ago` : `${mins} мин назад`
  if (hours < 24) return lang === 'he' ? `${hours} ש' ago` : `${hours} ч назад`
  return lang === 'he' ? `${days} ימים ago` : `${days} дн назад`
}

export default function SupportPage() {
  const { language } = useLanguage()
  const l = language === 'he'
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [deletingNote, setDeletingNote] = useState<string | null>(null)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const res = await fetch('/api/admin/support')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOrgs(data.orgs || [])
      setAuditLog(data.auditLog || [])
      setNotes(data.notes || [])
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка загрузки') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const handleAddNote = async () => {
    if (!selectedOrgId || !newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: selectedOrgId, note: newNote }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNotes(prev => [data.note, ...prev])
      setNewNote('')
      toast.success(l ? 'נשמר' : 'Заметка сохранена')
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setSavingNote(false) }
  }

  const handleDeleteNote = async (id: string) => {
    if (!confirm(l ? 'למחוק?' : 'Удалить заметку?')) return
    setDeletingNote(id)
    try {
      await fetch('/api/admin/support', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch { toast.error(l ? 'שגיאה' : 'Ошибка') }
    finally { setDeletingNote(null) }
  }

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.owner_email?.toLowerCase().includes(search.toLowerCase())
  )

  const orgAudit = (orgId: string) => auditLog.filter(e => e.org_id === orgId).slice(0, 10)
  const orgNotes = (orgId: string) => notes.filter(n => n.org_id === orgId)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HeadphonesIcon className="w-6 h-6 text-blue-500" />
            {l ? 'תמיכה' : 'Поддержка'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {l ? 'לוג פעולות, הקשר לקוח ופתקים' : 'Audit log, контекст клиента и заметки'}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {l ? 'רענן' : 'Обновить'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={l ? 'חיפוש לפי שם או אימייל...' : 'Поиск по имени или email...'}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Org Cards */}
      <div className="space-y-3">
        {filteredOrgs.map(org => {
          const isExpanded = expandedOrg === org.id
          const isSelected = selectedOrgId === org.id
          const audit = orgAudit(org.id)
          const orgNotesList = orgNotes(org.id)
          const lastSeen = org.last_seen_at ? timeAgo(org.last_seen_at, language) : null
          const isInactive = !org.last_seen_at || (Date.now() - new Date(org.last_seen_at).getTime()) > 3 * 86400000
          const latestAction = audit[0]

          return (
            <div key={org.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden
                ${isExpanded ? 'border-blue-200 shadow-md' : 'border-gray-100 dark:border-slate-700'}`}>

              {/* Card Header */}
              <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpandedOrg(isExpanded ? null : org.id)}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{org.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`flex items-center gap-1 text-xs ${isInactive ? 'text-red-500' : 'text-emerald-600'}`}>
                      {isInactive ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                      {lastSeen || (l ? 'לא ידוע' : 'Неизвестно')}
                    </span>
                    {latestAction && (
                      <span className="text-xs text-gray-400">
                        · {l ? ACTION_LABELS[latestAction.action]?.he : ACTION_LABELS[latestAction.action]?.ru} {l ? ENTITY_LABELS[latestAction.entity_type]?.he : ENTITY_LABELS[latestAction.entity_type]?.ru}
                      </span>
                    )}
                    {orgNotesList.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <StickyNote className="w-3 h-3" />
                        {orgNotesList.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-slate-700">
                  <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-700">

                    {/* Left: Audit Log */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          {l ? 'פעולות אחרונות' : 'Последние действия'}
                        </p>
                        <span className="text-xs text-gray-400">{l ? '30 יום' : '30 дней'}</span>
                      </div>
                      {audit.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">{l ? 'אין פעולות' : 'Действий нет'}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {audit.map(entry => {
                            const Icon = ACTION_ICONS[entry.action] || Activity
                            const colorClass = ACTION_COLORS[entry.action] || 'text-gray-500 bg-gray-50'
                            const actionLabel = l ? ACTION_LABELS[entry.action]?.he : ACTION_LABELS[entry.action]?.ru
                            const entityLabel = l ? ENTITY_LABELS[entry.entity_type]?.he : ENTITY_LABELS[entry.entity_type]?.ru
                            return (
                              <div key={entry.id} className="flex items-start gap-2.5 py-1.5">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
                                  <Icon className="w-3 h-3" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">{actionLabel}</span>
                                    {entityLabel && <span className="text-gray-500"> {entityLabel}</span>}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{entry.user_email}</p>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                                  {timeAgo(entry.created_at, language)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: Notes */}
                    <div className="p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <StickyNote className="w-3.5 h-3.5" />
                        {l ? 'פתקים' : 'Заметки'}
                      </p>

                      {/* Add note */}
                      <div className="flex gap-2 mb-3">
                        <textarea
                          ref={selectedOrgId === org.id ? noteRef : undefined}
                          rows={2}
                          value={selectedOrgId === org.id ? newNote : ''}
                          onFocus={() => setSelectedOrgId(org.id)}
                          onChange={e => { setSelectedOrgId(org.id); setNewNote(e.target.value) }}
                          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote() }}
                          placeholder={l ? 'הוסף פתק... (Ctrl+Enter לשמור)' : 'Добавить заметку... (Ctrl+Enter)'}
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                        />
                        <button
                          onClick={() => { setSelectedOrgId(org.id); handleAddNote() }}
                          disabled={savingNote || !newNote.trim() || selectedOrgId !== org.id}
                          className="w-9 h-9 mt-0.5 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
                        >
                          {savingNote && selectedOrgId === org.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Notes list */}
                      {orgNotesList.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">{l ? 'אין פתקים' : 'Заметок нет'}</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {orgNotesList.map(note => (
                            <div key={note.id} className="group flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{note.note}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {note.admin_email} · {timeAgo(note.created_at, language)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deletingNote === note.id}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
                              >
                                {deletingNote === note.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
