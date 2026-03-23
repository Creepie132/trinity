'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/contexts/LanguageContext'
import { Plus, Search, MapPin, Clock, User, Calendar, Pencil, Trash2, X, Check, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Meeting {
  id: string; title: string; description: string | null
  status: string; priority: string; due_date: string
  meeting_location: string | null; meeting_duration_min: number | null
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}

const IL_CITIES = [
  'ירושלים','תל אביב','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה',
  'באר שבע','חולון','בני ברק','רמת גן','אשקלון','רחובות','בת ים',
  'הרצליה','כפר סבא','מודיעין','לוד','נס ציונה','עפולה','עכו','אילת',
  'נהריה','קריית גת','דימונה','יבנה','טבריה','צפת','קריית שמונה',
]

const tr = {
  ru: {
    title:'Встречи', newMeeting:'Новая встреча', search:'Поиск...',
    upcoming:'Предстоящие', past:'Прошедшие', all:'Все',
    noMeetings:'Встреч нет', noMeetingsDesc:'Создайте первую встречу',
    min:'мин', duration:'Длительность',
    meetingTitle:'Название встречи *', description:'Описание (необязательно)',
    date:'Дата *', time:'Время *',
    clientOpt:'Клиент / Лид (необязательно)',
    address:'Адрес (на иврите)', city:'Город (на иврите)',
    addressHint:'Пишите адрес на иврите, напр.: רחוב הרצל 1',
    cityHint:'Пишите город на иврите, напр.: תל אביב',
    durationMin:'Длительность (мин)', priority:'Приоритет',
    low:'Низкий', medium:'Средний', high:'Высокий',
    save:'Сохранить', cancel:'Отмена', edit:'Редактировать', delete:'Удалить',
    done:'Завершить',
    errTitle:'Введите название', errDate:'Выберите дату', errTime:'Выберите время',
    statuses:{ open:'Запланирована', in_progress:'Идёт', completed:'Завершена', cancelled:'Отменена' },
  },
  he: {
    title:'פגישות', newMeeting:'פגישה חדשה', search:'חיפוש...',
    upcoming:'קרובות', past:'עבר', all:'הכל',
    noMeetings:'אין פגישות', noMeetingsDesc:'צור פגישה ראשונה',
    min:'דק', duration:'משך',
    meetingTitle:'שם הפגישה *', description:'תיאור (אופציונלי)',
    date:'תאריך *', time:'שעה *',
    clientOpt:'לקוח / ליד (אופציונלי)',
    address:'כתובת (בעברית)', city:'עיר (בעברית)',
    addressHint:'כתוב כתובת בעברית, לדוג׳: רחוב הרצל 1',
    cityHint:'כתוב עיר בעברית, לדוג׳: תל אביב',
    durationMin:'משך (דקות)', priority:'עדיפות',
    low:'נמוך', medium:'בינוני', high:'גבוה',
    save:'שמור', cancel:'ביטול', edit:'ערוך', delete:'מחק',
    done:'סיים',
    errTitle:'הכנס שם לפגישה', errDate:'בחר תאריך', errTime:'בחר שעה',
    statuses:{ open:'מתוכננת', in_progress:'מתנהלת', completed:'הושלמה', cancelled:'בוטלה' },
  },
}

type Filter = 'upcoming' | 'past' | 'all'
type Lang = 'ru' | 'he'

interface FormData {
  title: string; description: string
  date: string; time: string
  client_id: string
  address: string; city: string
  meeting_duration_min: number; priority: string
}
interface FormErrors { title?: string; date?: string; time?: string }

const emptyForm = (): FormData => ({
  title:'', description:'', date:'', time:'',
  client_id:'', address:'', city:'',
  meeting_duration_min: 60, priority:'medium',
})

// ─── Meeting Form ─────────────────────────────────────────────────────────────
function MeetingForm({ lang, initial, onSave, onClose, clients }: {
  lang: Lang
  initial?: Partial<FormData> & { id?: string }
  onSave: (data: FormData & { id?: string }) => void
  onClose: () => void
  clients: { id: string; first_name: string; last_name: string; phone?: string }[]
}) {
  const t = tr[lang]
  const isHe = lang === 'he'
  const dir = isHe ? 'rtl' : 'ltr'
  const [form, setForm] = useState<FormData>({ ...emptyForm(), ...initial })
  const [errors, setErrors] = useState<FormErrors>({})
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])

  const inp = (err?: string) => cn(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    err
      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
      : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
  )
  const lbl = (err?: string) => cn('block text-xs font-semibold mb-1', err ? 'text-red-500' : 'text-gray-500')

  const handleCityInput = (val: string) => {
    setForm(f => ({...f, city: val}))
    setCitySuggestions(val.length >= 1 ? IL_CITIES.filter(c => c.startsWith(val)).slice(0, 5) : [])
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.title.trim()) e.title = t.errTitle
    if (!form.date) e.date = t.errDate
    if (!form.time) e.time = t.errTime
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: initial?.id })
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto" dir={dir}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">{initial?.id ? t.edit : t.newMeeting}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
            <X className="w-4 h-4"/>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 1. Название */}
          <div>
            <label className={lbl(errors.title)}>{t.meetingTitle}</label>
            <input value={form.title}
              onChange={e => { setForm(f => ({...f, title: e.target.value})); if(errors.title) setErrors(v=>({...v,title:undefined})) }}
              placeholder={isHe ? 'פגישה עם לקוח...' : 'Встреча с клиентом...'} className={inp(errors.title)}/>
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* 2. Клиент / Лид */}
          <div>
            <label className={lbl()}>{t.clientOpt}</label>
            <select value={form.client_id} onChange={e => setForm(f => ({...f, client_id: e.target.value}))} className={inp()}>
              <option value="">—</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
            </select>
          </div>

          {/* 3. Дата + Время раздельно */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl(errors.date)}>{t.date}</label>
              <input type="date" value={form.date} dir="ltr"
                onChange={e => { setForm(f => ({...f, date: e.target.value})); if(errors.date) setErrors(v=>({...v,date:undefined})) }}
                className={inp(errors.date)}/>
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className={lbl(errors.time)}>{t.time}</label>
              <input type="time" value={form.time} dir="ltr"
                onChange={e => { setForm(f => ({...f, time: e.target.value})); if(errors.time) setErrors(v=>({...v,time:undefined})) }}
                className={inp(errors.time)}/>
              {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
            </div>
          </div>

          {/* 4. Адрес (иврит) */}
          <div>
            <label className={lbl()}>{t.address}</label>
            <p className="text-[10px] text-amber-600 mb-1.5">⚠️ {t.addressHint}</p>
            <input value={form.address} dir="rtl"
              onChange={e => setForm(f => ({...f, address: e.target.value}))}
              placeholder="רחוב הרצל 1" className={inp()}/>
          </div>

          {/* 5. Город (иврит + автокомплит) */}
          <div className="relative">
            <label className={lbl()}>{t.city}</label>
            <p className="text-[10px] text-amber-600 mb-1.5">⚠️ {t.cityHint}</p>
            <input value={form.city} dir="rtl" autoComplete="off"
              onChange={e => handleCityInput(e.target.value)}
              placeholder="תל אביב" className={inp()}/>
            {citySuggestions.length > 0 && (
              <div className="absolute top-full start-0 end-0 z-20 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden mt-1">
                {citySuggestions.map(c => (
                  <button key={c} type="button" dir="rtl"
                    onClick={() => { setForm(f => ({...f, city: c})); setCitySuggestions([]) }}
                    className="w-full px-4 py-2.5 text-sm text-right text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-50 last:border-0">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 6. Длительность + Приоритет */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl()}>{t.durationMin}</label>
              <input type="number" value={form.meeting_duration_min} min={15} step={15} dir="ltr"
                onChange={e => setForm(f => ({...f, meeting_duration_min: Number(e.target.value)}))} className={inp()}/>
            </div>
            <div>
              <label className={lbl()}>{t.priority}</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className={inp()}>
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
              </select>
            </div>
          </div>

          {/* 7. Описание */}
          <div>
            <label className={lbl()}>{t.description}</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder={isHe ? 'הערות...' : 'Заметки...'} className={`${inp()} resize-none`}/>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
            {t.cancel}
          </button>
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting, lang, onEdit, onDelete, onDone }: {
  meeting: Meeting; lang: Lang
  onEdit: (m: Meeting) => void; onDelete: (id: string) => void; onDone: (id: string) => void
}) {
  const t = tr[lang]
  const isHe = lang === 'he'
  const [confirmDel, setConfirmDel] = useState(false)
  const [showClient, setShowClient] = useState(false)

  const dt = new Date(meeting.due_date)
  const dateStr = dt.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day:'numeric', month:'short' })
  const timeStr = dt.toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour:'2-digit', minute:'2-digit' })
  const isPast = dt < new Date()
  const isDone = meeting.status === 'completed'
  const priorityDot: Record<string, string> = { low:'bg-slate-300', medium:'bg-amber-400', high:'bg-red-500' }

  return (
    <div className={cn('group bg-white rounded-2xl border transition-all hover:shadow-md',
      isDone ? 'border-gray-100 opacity-60' : isPast ? 'border-red-100' : 'border-gray-100')}>
      <div className="p-4 flex gap-3">
        {/* Date block */}
        <div className={cn('shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center',
          isDone ? 'bg-emerald-50' : isPast ? 'bg-red-50' : 'bg-indigo-50')}>
          <span className={cn('text-[10px] font-semibold', isDone?'text-emerald-500':isPast?'text-red-500':'text-indigo-500')}>{dateStr}</span>
          <span className={cn('text-sm font-bold', isDone?'text-emerald-700':isPast?'text-red-700':'text-indigo-700')}>{timeStr}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('w-2 h-2 rounded-full shrink-0', priorityDot[meeting.priority] ?? 'bg-gray-300')}/>
            <p className={cn('font-semibold text-sm text-gray-900 truncate', isDone && 'line-through text-gray-400')}>{meeting.title}</p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {meeting.meeting_duration_min && (
              <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3"/>{meeting.meeting_duration_min} {t.min}</span>
            )}
            {meeting.meeting_location && (
              <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3"/>{meeting.meeting_location}</span>
            )}
            {meeting.client && (
              <button onClick={() => setShowClient(v => !v)}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                <User className="w-3 h-3"/>{meeting.client.first_name} {meeting.client.last_name}
              </button>
            )}
          </div>
          {/* Client detail popup */}
          {showClient && meeting.client && (
            <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-gray-700 space-y-1">
              <p className="font-semibold">{meeting.client.first_name} {meeting.client.last_name}</p>
              {meeting.client.phone && (
                <a href={`tel:${meeting.client.phone}`} className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                  <Phone className="w-3 h-3"/>{meeting.client.phone}
                </a>
              )}
            </div>
          )}
          {meeting.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{meeting.description}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDone && (
            <button onClick={() => onDone(meeting.id)} title={t.done}
              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all">
              <Check className="w-3.5 h-3.5"/>
            </button>
          )}
          <button onClick={() => onEdit(meeting)} className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all">
            <Pencil className="w-3.5 h-3.5"/>
          </button>
          {confirmDel ? (
            <button onClick={() => onDelete(meeting.id)} className="p-1.5 rounded-xl bg-red-500 text-white transition-all">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all">
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

  // Преобразуем date+time → due_date ISO для API
  const toISO = (date: string, time: string) => `${date}T${time || '00:00'}:00`

  const createMutation = useMutation({
    mutationFn: (form: FormData) => fetch('/api/worker/meetings', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        title: form.title, description: form.description,
        due_date: toISO(form.date, form.time),
        client_id: form.client_id || null,
        meeting_location: [form.address, form.city].filter(Boolean).join(', ') || null,
        meeting_duration_min: form.meeting_duration_min,
        priority: form.priority,
      })
    }).then(r => { if (!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setShowForm(false); toast.success(isHe ? 'נוצר!' : 'Создано!') },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (form: FormData & { id: string }) => fetch(`/api/worker/meetings/${form.id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        title: form.title, description: form.description,
        due_date: toISO(form.date, form.time),
        client_id: form.client_id || null,
        meeting_location: [form.address, form.city].filter(Boolean).join(', ') || null,
        meeting_duration_min: form.meeting_duration_min,
        priority: form.priority,
      })
    }).then(r => { if (!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setEditMeeting(null); toast.success(isHe ? 'נשמר!' : 'Сохранено!') },
    onError: (e: any) => toast.error(e.message),
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

  // Парсим meeting_location обратно в address+city для редактирования
  const parseLocation = (loc: string | null) => {
    if (!loc) return { address: '', city: '' }
    const parts = loc.split(', ')
    if (parts.length >= 2) return { address: parts.slice(0,-1).join(', '), city: parts[parts.length-1] }
    return { address: loc, city: '' }
  }

  const meetings = data?.meetings ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-500"/>{t.title}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {meetings.length > 0 ? `${meetings.length} ${isHe ? 'פגישות' : 'встреч'}` : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4"/>{t.newMeeting}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(['upcoming','past','all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                filter===f ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700')}>
              {t[f]}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[140px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
            className="w-full ps-9 pe-3 py-2 rounded-2xl border border-gray-200 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"/>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
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
              onDone={id => doneMutation.mutate(id)}/>
          ))}
        </div>
      )}

      {showForm && (
        <MeetingForm lang={lang} clients={clients} onClose={() => setShowForm(false)}
          onSave={d => createMutation.mutate(d as FormData)}/>
      )}

      {editMeeting && (() => {
        const { address, city } = parseLocation(editMeeting.meeting_location)
        const dt = editMeeting.due_date ? new Date(editMeeting.due_date) : null
        return (
          <MeetingForm lang={lang} clients={clients} onClose={() => setEditMeeting(null)}
            initial={{
              id: editMeeting.id, title: editMeeting.title,
              description: editMeeting.description ?? '',
              date: dt ? dt.toISOString().slice(0,10) : '',
              time: dt ? dt.toTimeString().slice(0,5) : '',
              client_id: editMeeting.client?.id ?? '',
              address, city,
              meeting_duration_min: editMeeting.meeting_duration_min ?? 60,
              priority: editMeeting.priority,
            }}
            onSave={d => updateMutation.mutate(d as FormData & { id: string })}/>
        )
      })()}
    </div>
  )
}
