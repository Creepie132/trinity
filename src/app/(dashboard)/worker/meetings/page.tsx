'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/contexts/LanguageContext'
import { Plus, Search, MapPin, Clock, User, Calendar, Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Meeting {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string
  meeting_location: string | null
  meeting_duration_min: number | null
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}

// ─── i18n ────────────────────────────────────────────────────────────────────
const tr = {
  ru: {
    title: 'Встречи', newMeeting: 'Новая встреча', search: 'Поиск...',
    upcoming: 'Предстоящие', past: 'Прошедшие', all: 'Все',
    noMeetings: 'Встреч нет', noMeetingsDesc: 'Создайте первую встречу',
    min: 'мин', client: 'Клиент', location: 'Место', duration: 'Длительность',
    meetingTitle: 'Название встречи', description: 'Описание (необязательно)',
    dateTime: 'Дата и время', clientOpt: 'Клиент (необязательно)',
    locationOpt: 'Место (необязательно)', durationMin: 'Длительность (мин)',
    priority: 'Приоритет', low: 'Низкий', medium: 'Средний', high: 'Высокий',
    save: 'Сохранить', cancel: 'Отмена', edit: 'Редактировать', delete: 'Удалить',
    confirmDelete: 'Удалить встречу?', done: 'Завершить',
    statuses: { open: 'Запланирована', in_progress: 'Идёт', completed: 'Завершена', cancelled: 'Отменена' },
    priorityColors: { low: 'text-slate-500', medium: 'text-amber-500', high: 'text-red-500' },
  },
  he: {
    title: 'פגישות', newMeeting: 'פגישה חדשה', search: 'חיפוש...',
    upcoming: 'קרובות', past: 'עבר', all: 'הכל',
    noMeetings: 'אין פגישות', noMeetingsDesc: 'צור פגישה ראשונה',
    min: 'דק', client: 'לקוח', location: 'מיקום', duration: 'משך',
    meetingTitle: 'שם הפגישה', description: 'תיאור (אופציונלי)',
    dateTime: 'תאריך ושעה', clientOpt: 'לקוח (אופציונלי)',
    locationOpt: 'מיקום (אופציונלי)', durationMin: 'משך (דקות)',
    priority: 'עדיפות', low: 'נמוך', medium: 'בינוני', high: 'גבוה',
    save: 'שמור', cancel: 'ביטול', edit: 'ערוך', delete: 'מחק',
    confirmDelete: 'למחוק פגישה?', done: 'סיים',
    statuses: { open: 'מתוכננת', in_progress: 'מתנהלת', completed: 'הושלמה', cancelled: 'בוטלה' },
    priorityColors: { low: 'text-slate-500', medium: 'text-amber-500', high: 'text-red-500' },
  },
}

type Filter = 'upcoming' | 'past' | 'all'
type Lang = 'ru' | 'he'

// ─── Meeting Form ─────────────────────────────────────────────────────────────
interface FormData {
  title: string; description: string; due_date: string;
  client_id: string; meeting_location: string;
  meeting_duration_min: number; priority: string;
}

const emptyForm = (): FormData => ({
  title: '', description: '', due_date: '', client_id: '',
  meeting_location: '', meeting_duration_min: 60, priority: 'medium',
})

function MeetingForm({ lang, initial, onSave, onClose, clients }: {
  lang: Lang; initial?: Partial<FormData> & { id?: string };
  onSave: (data: FormData & { id?: string }) => void;
  onClose: () => void;
  clients: { id: string; first_name: string; last_name: string }[];
}) {
  const t = tr[lang]
  const isHe = lang === 'he'
  const [form, setForm] = useState<FormData>({ ...emptyForm(), ...initial })
  const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all'
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">
            {initial?.id ? t.edit : t.newMeeting}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div><label className={lbl}>{t.meetingTitle} *</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              placeholder={isHe ? 'פגישה עם לקוח...' : 'Встреча с клиентом...'} className={inp}/>
          </div>
          <div><label className={lbl}>{t.dateTime} *</label>
            <input type="datetime-local" value={form.due_date}
              onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className={inp} dir="ltr"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>{t.durationMin}</label>
              <input type="number" value={form.meeting_duration_min} min={15} step={15}
                onChange={e => setForm(f => ({...f, meeting_duration_min: Number(e.target.value)}))} className={inp} dir="ltr"/>
            </div>
            <div><label className={lbl}>{t.priority}</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className={inp}>
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
              </select>
            </div>
          </div>
          <div><label className={lbl}>{t.locationOpt}</label>
            <input value={form.meeting_location}
              onChange={e => setForm(f => ({...f, meeting_location: e.target.value}))}
              placeholder={isHe ? 'כתובת / זום...' : 'Адрес / Zoom...'} className={inp}/>
          </div>
          {clients.length > 0 && (
            <div><label className={lbl}>{t.clientOpt}</label>
              <select value={form.client_id} onChange={e => setForm(f => ({...f, client_id: e.target.value}))} className={inp}>
                <option value="">—</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>
          )}
          <div><label className={lbl}>{t.description}</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder={isHe ? 'הערות...' : 'Заметки...'} className={`${inp} resize-none`}/>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
            {t.cancel}
          </button>
          <button
            disabled={!form.title.trim() || !form.due_date}
            onClick={() => onSave({ ...form, id: initial?.id })}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md disabled:opacity-40 transition-all">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting, lang, onEdit, onDelete, onDone }: {
  meeting: Meeting; lang: Lang;
  onEdit: (m: Meeting) => void;
  onDelete: (id: string) => void;
  onDone: (id: string) => void;
}) {
  const t = tr[lang]
  const isHe = lang === 'he'
  const [confirmDel, setConfirmDel] = useState(false)

  const dt = new Date(meeting.due_date)
  const dateStr = dt.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day:'numeric', month:'short' })
  const timeStr = dt.toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour:'2-digit', minute:'2-digit' })
  const isPast = dt < new Date()
  const isDone = meeting.status === 'completed'

  const priorityDot: Record<string, string> = {
    low: 'bg-slate-300', medium: 'bg-amber-400', high: 'bg-red-500'
  }

  return (
    <div className={cn(
      'group bg-white rounded-2xl border transition-all hover:shadow-md',
      isDone ? 'border-gray-100 opacity-60' : isPast ? 'border-red-100' : 'border-gray-100'
    )}>
      <div className="p-4 flex gap-3">
        {/* Date block */}
        <div className={cn(
          'shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-center',
          isDone ? 'bg-emerald-50' : isPast ? 'bg-red-50' : 'bg-indigo-50'
        )}>
          <span className={cn('text-[10px] font-semibold uppercase', isDone ? 'text-emerald-500' : isPast ? 'text-red-500' : 'text-indigo-500')}>
            {dateStr}
          </span>
          <span className={cn('text-sm font-bold', isDone ? 'text-emerald-700' : isPast ? 'text-red-700' : 'text-indigo-700')}>
            {timeStr}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('w-2 h-2 rounded-full shrink-0', priorityDot[meeting.priority] ?? 'bg-gray-300')}/>
            <p className={cn('font-semibold text-sm text-gray-900 truncate', isDone && 'line-through text-gray-400')}>
              {meeting.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {meeting.meeting_duration_min && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3"/>{meeting.meeting_duration_min} {t.min}
              </span>
            )}
            {meeting.meeting_location && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3"/>{meeting.meeting_location}
              </span>
            )}
            {meeting.client && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <User className="w-3 h-3"/>
                {meeting.client.first_name} {meeting.client.last_name}
              </span>
            )}
          </div>
          {meeting.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{meeting.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && (
            <button onClick={() => onDone(meeting.id)}
              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all" title={t.done}>
              <Check className="w-3.5 h-3.5"/>
            </button>
          )}
          <button onClick={() => onEdit(meeting)}
            className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all">
            <Pencil className="w-3.5 h-3.5"/>
          </button>
          {confirmDel ? (
            <button onClick={() => onDelete(meeting.id)}
              className="p-1.5 rounded-xl bg-red-500 text-white transition-all">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)}
              className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkerMeetingsPage() {
  const { language } = useLanguage()
  const lang = (language === 'he' ? 'he' : 'ru') as Lang
  const t = tr[lang]
  const isHe = lang === 'he'
  const qc = useQueryClient()

  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['worker-meetings', filter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ filter, search })
      const res = await fetch(`/api/worker/meetings?${params}`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ meetings: Meeting[] }>
    },
    staleTime: 30_000,
  })

  // Клиенты для выпадающего списка
  const { data: clientsData } = useQuery({
    queryKey: ['worker-clients-list'],
    queryFn: async () => {
      const res = await fetch('/api/clients?limit=200')
      if (!res.ok) return { clients: [] }
      return res.json()
    },
    staleTime: 60_000,
  })
  const clients = clientsData?.clients ?? clientsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: (body: FormData) => fetch('/api/worker/meetings', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setShowForm(false); toast.success(isHe ? 'נוצר!' : 'Создано!') },
    onError: () => toast.error(isHe ? 'שגיאה' : 'Ошибка'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: FormData & { id: string }) => fetch(`/api/worker/meetings/${id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(r => { if (!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setEditMeeting(null); toast.success(isHe ? 'נשמר!' : 'Сохранено!') },
    onError: () => toast.error(isHe ? 'שגיאה' : 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/worker/meetings/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); toast.success(isHe ? 'נמחק' : 'Удалено') },
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/worker/meetings/${id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'completed' })
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({queryKey:['worker-meetings']}),
  })

  const meetings = data?.meetings ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500"/>
            {t.title}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meetings.length > 0 ? `${meetings.length} ${isHe ? 'פגישות' : 'встреч'}` : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4"/>
          {t.newMeeting}
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(['upcoming','past','all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                filter === f ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700')}>
              {t[f]}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[140px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.search}
            className="w-full ps-9 pe-3 py-2 rounded-2xl border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"/>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse"/>)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">📅</div>
          <p className="font-semibold text-gray-700">{t.noMeetings}</p>
          <p className="text-sm text-gray-400">{t.noMeetingsDesc}</p>
          <button onClick={() => setShowForm(true)}
            className="mt-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4 inline me-1.5"/>{t.newMeeting}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <MeetingCard key={m.id} meeting={m} lang={lang}
              onEdit={setEditMeeting}
              onDelete={id => deleteMutation.mutate(id)}
              onDone={id => doneMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <MeetingForm lang={lang} clients={clients}
          onSave={data => createMutation.mutate(data as FormData)}
          onClose={() => setShowForm(false)}/>
      )}

      {/* Edit form */}
      {editMeeting && (
        <MeetingForm lang={lang} clients={clients}
          initial={{
            id: editMeeting.id,
            title: editMeeting.title,
            description: editMeeting.description ?? '',
            due_date: editMeeting.due_date.slice(0,16),
            client_id: editMeeting.client?.id ?? '',
            meeting_location: editMeeting.meeting_location ?? '',
            meeting_duration_min: editMeeting.meeting_duration_min ?? 60,
            priority: editMeeting.priority,
          }}
          onSave={data => updateMutation.mutate(data as FormData & { id: string })}
          onClose={() => setEditMeeting(null)}/>
      )}
    </div>
  )
}
