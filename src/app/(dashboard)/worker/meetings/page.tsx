'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Plus, Search, MapPin, Clock, User, Calendar,
  Pencil, Trash2, X, Check, Phone, ChevronRight,
  AlertCircle, TrendingUp, CheckCircle2, XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Meeting {
  id: string; title: string; description: string | null
  status: string; priority: string; due_date: string
  meeting_location: string | null; meeting_duration_min: number | null
  client: { id: string; first_name: string; last_name: string; phone: string } | null
}
interface Client { id: string; first_name: string; last_name: string; phone?: string }
interface FormData {
  title: string; description: string; date: string; time: string
  client_id: string; client_name: string
  address: string; city: string; meeting_duration_min: number; priority: string
}
interface FormErrors { title?: string; date?: string; time?: string }

const IL_CITIES = [
  'ירושלים','תל אביב','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה',
  'באר שבע','חולון','בני ברק','רמת גן','אשקלון','רחובות','בת ים',
  'הרצליה','כפר סבא','מודיעין','לוד','נס ציונה','עפולה','עכו','אילת',
  'נהריה','קריית גת','דימונה','יבנה','טבריה','צפת','קריית שמונה',
]

type Filter = 'upcoming' | 'past' | 'all'
type Lang = 'ru' | 'he'

const tr = {
  ru: {
    title:'Встречи', newMeeting:'Новая встреча', search:'Поиск...',
    upcoming:'Предстоящие', past:'Прошедшие', all:'Все',
    noMeetings:'Встреч нет', noMeetingsDesc:'Создайте первую встречу',
    min:'мин', meetingTitle:'Название встречи *',
    description:'Описание (необязательно)',
    date:'Дата *', time:'Время *',
    clientSearch:'Клиент / Лид (введите 2+ символа для поиска)',
    clientPlaceholder:'Поиск клиента...',
    address:'Адрес', city:'Город',
    addressHint:'Пишите на иврите, напр.: רחוב הרצל 1',
    cityHint:'Пишите на иврите, напр.: תל אביב',
    durationMin:'Длительность (мин)', priority:'Приоритет',
    low:'Низкий', medium:'Средний', high:'Высокий',
    save:'Сохранить', cancel:'Отмена', edit:'Редактировать', delete:'Удалить',
    done:'Завершить', close:'Закрыть', details:'Детали встречи',
    errTitle:'Введите название', errDate:'Выберите дату', errTime:'Выберите время',
    statLabel:{ open:'Запланирована', in_progress:'Идёт', completed:'Завершена', cancelled:'Отменена' },
    priLabel:{ low:'Низкий', medium:'Средний', high:'Высокий' },
    noClient:'Клиент не указан', noLocation:'Место не указано', noDesc:'—',
    confirmDel:'Удалить?', totalMeetings:'встреч',
  },
  he: {
    title:'פגישות', newMeeting:'פגישה חדשה', search:'חיפוש...',
    upcoming:'קרובות', past:'עבר', all:'הכל',
    noMeetings:'אין פגישות', noMeetingsDesc:'צור פגישה ראשונה',
    min:'דק', meetingTitle:'שם הפגישה *',
    description:'תיאור (אופציונלי)',
    date:'תאריך *', time:'שעה *',
    clientSearch:'לקוח / ליד (הזן 2+ תווים לחיפוש)',
    clientPlaceholder:'חפש לקוח...',
    address:'כתובת', city:'עיר',
    addressHint:'כתוב בעברית, לדוג׳: רחוב הרצל 1',
    cityHint:'כתוב בעברית, לדוג׳: תל אביב',
    durationMin:'משך (דקות)', priority:'עדיפות',
    low:'נמוך', medium:'בינוני', high:'גבוה',
    save:'שמור', cancel:'ביטול', edit:'ערוך', delete:'מחק',
    done:'סיים', close:'סגור', details:'פרטי פגישה',
    errTitle:'הכנס שם לפגישה', errDate:'בחר תאריך', errTime:'בחר שעה',
    statLabel:{ open:'מתוכננת', in_progress:'מתנהלת', completed:'הושלמה', cancelled:'בוטלה' },
    priLabel:{ low:'נמוך', medium:'בינוני', high:'גבוה' },
    noClient:'לא צוין לקוח', noLocation:'לא צוין מיקום', noDesc:'—',
    confirmDel:'למחוק?', totalMeetings:'פגישות',
  },
}

const emptyForm = (): FormData => ({
  title:'', description:'', date:'', time:'',
  client_id:'', client_name:'', address:'', city:'',
  meeting_duration_min: 60, priority:'medium',
})

// ─── Client Search Input ──────────────────────────────────────────────────────
// Серверный поиск через /api/clients?search= — ищет по всей базе организации
function ClientSearchInput({ value, clientId, onChange, clients: _clients, lang, className }: {
  value: string; clientId: string
  onChange: (id: string, name: string) => void
  clients: Client[]; lang: Lang; className?: string
}) {
  const t = tr[lang]
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Серверный поиск с дебаунсом 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=10`)
        if (!res.ok) return
        const json = await res.json()
        const list: Client[] = Array.isArray(json) ? json : (json.clients ?? json.data ?? [])
        setResults(list)
      } catch { /* ignore */ } finally { setSearching(false) }
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  const handleSelect = (c: Client) => {
    const name = `${c.first_name} ${c.last_name}`
    setQuery(name); setOpen(false); onChange(c.id, name)
  }
  const handleClear = () => { setQuery(''); setOpen(false); onChange('', ''); setResults([]) }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('', '') }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={t.clientPlaceholder}
          className={cn('w-full ps-9 pe-8 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all', className)}
        />
        {query && (
          <button onClick={handleClear} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>
      {open && query.length >= 2 && (
        <div className="absolute top-full start-0 end-0 z-30 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          {searching ? (
            <div className="px-4 py-3 text-sm text-gray-400">{lang === 'he' ? 'טוען...' : 'Поиск...'}</div>
          ) : results.length > 0 ? (
            results.map(c => (
              <button key={c.id} type="button" onClick={() => handleSelect(c)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-start border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                  {c.first_name[0]}{c.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {lang === 'he' ? 'לא נמצא' : 'Не найдено'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Meeting Form ─────────────────────────────────────────────────────────────
function MeetingForm({ lang, initial, onSave, onClose, clients }: {
  lang: Lang; initial?: Partial<FormData> & { id?: string }
  onSave: (data: FormData & { id?: string }) => void
  onClose: () => void; clients: Client[]
}) {
  const t = tr[lang]; const isHe = lang === 'he'; const dir = isHe ? 'rtl' : 'ltr'
  const [form, setForm] = useState<FormData>({ ...emptyForm(), ...initial })
  const [errors, setErrors] = useState<FormErrors>({})
  const [citySug, setCitySug] = useState<string[]>([])

  const inp = (err?: string) => cn(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    err ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
  )
  const lbl = (err?: string) => cn('block text-xs font-semibold mb-1.5', err ? 'text-red-500' : 'text-gray-500')

  const validate = () => {
    const e: FormErrors = {}
    if (!form.title.trim()) e.title = t.errTitle
    if (!form.date) e.date = t.errDate
    if (!form.time) e.time = t.errTime
    setErrors(e); return Object.keys(e).length === 0
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto" dir={dir}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-4 overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold">{initial?.id ? t.edit : t.newMeeting}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Название */}
          <div>
            <label className={lbl(errors.title)}>{t.meetingTitle}</label>
            <input value={form.title} placeholder={isHe ? 'פגישה עם לקוח...' : 'Встреча с клиентом...'}
              onChange={e => { setForm(f=>({...f,title:e.target.value})); if(errors.title) setErrors(v=>({...v,title:undefined})) }}
              className={inp(errors.title)}/>
            {errors.title && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.title}</p>}
          </div>
          {/* Клиент — поиск */}
          <div>
            <label className={lbl()}>{t.clientSearch}</label>
            <ClientSearchInput
              value={form.client_name} clientId={form.client_id}
              onChange={(id, name) => setForm(f => ({...f, client_id:id, client_name:name}))}
              clients={clients} lang={lang}/>
          </div>
          {/* Дата + Время */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl(errors.date)}>{t.date}</label>
              <input type="date" value={form.date} dir="ltr"
                onChange={e => { setForm(f=>({...f,date:e.target.value})); if(errors.date) setErrors(v=>({...v,date:undefined})) }}
                className={inp(errors.date)}/>
              {errors.date && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.date}</p>}
            </div>
            <div>
              <label className={lbl(errors.time)}>{t.time}</label>
              <input type="time" value={form.time} dir="ltr"
                onChange={e => { setForm(f=>({...f,time:e.target.value})); if(errors.time) setErrors(v=>({...v,time:undefined})) }}
                className={inp(errors.time)}/>
              {errors.time && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.time}</p>}
            </div>
          </div>
          {/* Адрес */}
          <div>
            <label className={lbl()}>{t.address}</label>
            <p className="text-[10px] text-amber-600 mb-1.5">⚠️ {t.addressHint}</p>
            <input value={form.address} dir="rtl" placeholder="רחוב הרצל 1"
              onChange={e => setForm(f=>({...f,address:e.target.value}))} className={inp()}/>
          </div>
          {/* Город */}
          <div className="relative">
            <label className={lbl()}>{t.city}</label>
            <p className="text-[10px] text-amber-600 mb-1.5">⚠️ {t.cityHint}</p>
            <input value={form.city} dir="rtl" placeholder="תל אביב" autoComplete="off"
              onChange={e => { setForm(f=>({...f,city:e.target.value})); setCitySug(e.target.value.length>=1 ? IL_CITIES.filter(c=>c.startsWith(e.target.value)).slice(0,5) : []) }}
              className={inp()}/>
            {citySug.length > 0 && (
              <div className="absolute top-full start-0 end-0 z-20 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden mt-1">
                {citySug.map(c => (
                  <button key={c} type="button" dir="rtl" onClick={() => { setForm(f=>({...f,city:c})); setCitySug([]) }}
                    className="w-full px-4 py-2.5 text-sm text-right text-gray-700 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0">{c}</button>
                ))}
              </div>
            )}
          </div>
          {/* Длительность + Приоритет */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl()}>{t.durationMin}</label>
              <input type="number" value={form.meeting_duration_min} min={15} step={15} dir="ltr"
                onChange={e => setForm(f=>({...f,meeting_duration_min:Number(e.target.value)}))} className={inp()}/>
            </div>
            <div>
              <label className={lbl()}>{t.priority}</label>
              <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))} className={inp()}>
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
              </select>
            </div>
          </div>
          {/* Описание */}
          <div>
            <label className={lbl()}>{t.description}</label>
            <textarea value={form.description} rows={2}
              onChange={e => setForm(f=>({...f,description:e.target.value}))}
              placeholder={isHe ? 'הערות...' : 'Заметки...'} className={`${inp()} resize-none`}/>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">{t.cancel}</button>
          <button onClick={() => { if(validate()) onSave({...form, id:initial?.id}) }}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">{t.save}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Detail Modal ──────────────────────────────────────────────────────
function MeetingDetailModal({ meeting, lang, onEdit, onDelete, onDone, onClose }: {
  meeting: Meeting; lang: Lang
  onEdit: () => void; onDelete: () => void; onDone: () => void; onClose: () => void
}) {
  const t = tr[lang]; const isHe = lang === 'he'; const dir = isHe ? 'rtl' : 'ltr'
  const dt = new Date(meeting.due_date)
  const dateStr = dt.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = dt.toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour:'2-digit', minute:'2-digit' })
  const isPast = dt < new Date()
  const isDone = meeting.status === 'completed'
  const [confirmDel, setConfirmDel] = useState(false)

  const statusConfig: Record<string, { label: string; cls: string; Icon: any }> = {
    open:       { label: t.statLabel.open,       cls: 'bg-blue-100 text-blue-700',    Icon: Calendar },
    in_progress:{ label: t.statLabel.in_progress, cls: 'bg-amber-100 text-amber-700', Icon: TrendingUp },
    completed:  { label: t.statLabel.completed,  cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
    cancelled:  { label: t.statLabel.cancelled,  cls: 'bg-slate-100 text-slate-600',  Icon: XCircle },
  }
  const priorityConfig: Record<string, { label: string; dot: string }> = {
    low:    { label: t.priLabel.low,    dot: 'bg-slate-300' },
    medium: { label: t.priLabel.medium, dot: 'bg-amber-400' },
    high:   { label: t.priLabel.high,   dot: 'bg-red-500' },
  }
  const sc = statusConfig[meeting.status] ?? statusConfig.open
  const pc = priorityConfig[meeting.priority] ?? priorityConfig.medium

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" dir={dir}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={cn('px-6 py-5', isPast && !isDone ? 'bg-gradient-to-r from-red-700 to-red-500' : 'bg-gradient-to-r from-[#1a237e] to-[#3949ab]')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs mb-1">{t.details}</p>
              <h3 className={cn('text-white font-bold text-lg leading-tight', isDone && 'line-through opacity-70')}>{meeting.title}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0"><X className="w-4 h-4"/></button>
          </div>
          {/* Status + Priority */}
          <div className="flex items-center gap-2 mt-3">
            <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold', sc.cls)}>
              <sc.Icon className="w-3.5 h-3.5"/>{sc.label}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/20 text-white">
              <span className={cn('w-2 h-2 rounded-full', pc.dot)}/>{pc.label}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Date/Time */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-indigo-600"/>
            </div>
            <div>
              <p className="text-xs text-indigo-500 font-medium">{dateStr}</p>
              <p className="text-sm font-bold text-indigo-900">{timeStr}
                {meeting.meeting_duration_min && <span className="text-indigo-400 font-normal ms-2">· {meeting.meeting_duration_min} {t.min}</span>}
              </p>
            </div>
          </div>

          {/* Client */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-gray-500"/>
            </div>
            {meeting.client ? (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{meeting.client.first_name} {meeting.client.last_name}</p>
                {meeting.client.phone && (
                  <a href={`tel:${meeting.client.phone}`} className="flex items-center gap-1 text-xs text-indigo-500 hover:underline mt-0.5">
                    <Phone className="w-3 h-3"/>{meeting.client.phone}
                  </a>
                )}
              </div>
            ) : <p className="text-sm text-gray-400">{t.noClient}</p>}
          </div>

          {/* Location */}
          {meeting.meeting_location && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-gray-500"/>
              </div>
              <p className="text-sm text-gray-700" dir="rtl">{meeting.meeting_location}</p>
            </div>
          )}

          {/* Description */}
          {meeting.description && (
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 font-medium">{isHe ? 'הערות' : 'Заметки'}</p>
              <p className="text-sm text-gray-700">{meeting.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-2">
          {!isDone && (
            <button onClick={onDone}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all">
              <Check className="w-5 h-5"/>{t.done}
            </button>
          )}
          <button onClick={onEdit}
            className={cn('flex flex-col items-center gap-1 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all', isDone && 'col-span-2')}>
            <Pencil className="w-5 h-5"/>{t.edit}
          </button>
          {confirmDel ? (
            <button onClick={onDelete} className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-red-500 text-white text-xs font-bold transition-all">
              <Trash2 className="w-5 h-5"/>{t.confirmDel}
            </button>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all">
              <Trash2 className="w-5 h-5"/>{t.delete}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Card (кликабельная) ───────────────────────────────────────────────
function MeetingCard({ meeting, lang, onClick }: {
  meeting: Meeting; lang: Lang; onClick: () => void
}) {
  const t = tr[lang]; const isHe = lang === 'he'
  const dt = new Date(meeting.due_date)
  const dayStr = dt.toLocaleDateString(isHe ? 'he-IL' : 'ru-RU', { day:'numeric', month:'short' })
  const timeStr = dt.toLocaleTimeString(isHe ? 'he-IL' : 'ru-RU', { hour:'2-digit', minute:'2-digit' })
  const isPast = dt < new Date()
  const isDone = meeting.status === 'completed'
  const dotColor: Record<string, string> = { low:'bg-slate-300', medium:'bg-amber-400', high:'bg-red-500' }

  return (
    <button onClick={onClick} className={cn(
      'w-full text-start group bg-white rounded-2xl border transition-all hover:shadow-md hover:border-indigo-200 active:scale-[0.99]',
      isDone ? 'border-gray-100 opacity-60' : isPast ? 'border-red-100 bg-red-50/20' : 'border-gray-100'
    )}>
      <div className="p-4 flex gap-3.5 items-center">
        {/* Date block */}
        <div className={cn('shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center',
          isDone ? 'bg-emerald-50' : isPast ? 'bg-red-50' : 'bg-indigo-50')}>
          <span className={cn('text-[10px] font-bold uppercase tracking-wide', isDone?'text-emerald-500':isPast?'text-red-500':'text-indigo-500')}>{dayStr}</span>
          <span className={cn('text-sm font-extrabold', isDone?'text-emerald-700':isPast?'text-red-700':'text-indigo-700')}>{timeStr}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor[meeting.priority] ?? 'bg-gray-300')}/>
            <p className={cn('font-semibold text-sm text-gray-900 truncate', isDone && 'line-through text-gray-400')}>{meeting.title}</p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {meeting.meeting_duration_min && (
              <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3"/>{meeting.meeting_duration_min} {t.min}</span>
            )}
            {meeting.meeting_location && (
              <span className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[120px]"><MapPin className="w-3 h-3"/>{meeting.meeting_location}</span>
            )}
            {meeting.client && (
              <span className="flex items-center gap-1 text-xs text-indigo-500"><User className="w-3 h-3"/>{meeting.client.first_name} {meeting.client.last_name}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 transition-colors"/>
      </div>
    </button>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ meetings, lang }: { meetings: Meeting[]; lang: Lang }) {
  const isHe = lang === 'he'
  const upcoming = meetings.filter(m => new Date(m.due_date) >= new Date() && m.status !== 'completed').length
  const done = meetings.filter(m => m.status === 'completed').length
  const overdue = meetings.filter(m => new Date(m.due_date) < new Date() && m.status !== 'completed').length

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: isHe ? 'קרובות' : 'Предстоящие', value: upcoming, cls: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: <Calendar className="w-4 h-4"/> },
        { label: isHe ? 'הושלמו' : 'Завершены',    value: done,     cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 className="w-4 h-4"/> },
        { label: isHe ? 'באיחור' : 'Просрочены',   value: overdue,  cls: 'bg-red-50 text-red-600 border-red-100', icon: <AlertCircle className="w-4 h-4"/> },
      ].map((s, i) => (
        <div key={i} className={cn('rounded-2xl border p-3 flex flex-col items-center gap-1', s.cls)}>
          {s.icon}
          <p className="text-xl font-extrabold">{s.value}</p>
          <p className="text-[10px] font-semibold opacity-70 text-center">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkerMeetingsPage() {
  const { language } = useLanguage()
  const lang = (language === 'he' ? 'he' : 'ru') as Lang
  const t = tr[lang]; const isHe = lang === 'he'
  const qc = useQueryClient()

  const [filter, setFilter] = useState<Filter>('upcoming')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['worker-meetings', filter, search],
    queryFn: async () => {
      const res = await fetch(`/api/worker/meetings?${new URLSearchParams({ filter, search })}`)
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ meetings: Meeting[] }>
    },
    staleTime: 30_000,
  })

  // Все встречи для stats (без фильтра)
  const { data: allData } = useQuery({
    queryKey: ['worker-meetings', 'all', ''],
    queryFn: async () => {
      const res = await fetch('/api/worker/meetings?filter=all&search=')
      if (!res.ok) return { meetings: [] }
      return res.json() as Promise<{ meetings: Meeting[] }>
    },
    staleTime: 30_000,
  })

  const clients: Client[] = []  // поиск серверный — локальный список не нужен

  const toISO = (date: string, time: string) => `${date}T${time || '00:00'}:00`
  const buildBody = (form: FormData) => ({
    title: form.title, description: form.description,
    due_date: toISO(form.date, form.time),
    client_id: form.client_id || null,
    meeting_location: [form.address, form.city].filter(Boolean).join(', ') || null,
    meeting_duration_min: form.meeting_duration_min,
    priority: form.priority,
  })

  const createMutation = useMutation({
    mutationFn: (form: FormData) => fetch('/api/worker/meetings', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildBody(form))
    }).then(r => { if(!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setShowForm(false); toast.success(isHe ? 'נוצר!' : 'Создано!') },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (form: FormData & { id: string }) => fetch(`/api/worker/meetings/${form.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildBody(form))
    }).then(r => { if(!r.ok) throw new Error('Error'); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setEditMeeting(null); setDetailMeeting(null); toast.success(isHe ? 'נשמר!' : 'Сохранено!') },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/worker/meetings/${id}`, { method:'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setDetailMeeting(null); toast.success(isHe ? 'נמחק' : 'Удалено') },
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/worker/meetings/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'completed' })
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({queryKey:['worker-meetings']}); setDetailMeeting(null) },
  })

  const parseLocation = (loc: string | null) => {
    if (!loc) return { address:'', city:'' }
    const parts = loc.split(', ')
    return parts.length >= 2 ? { address:parts.slice(0,-1).join(', '), city:parts[parts.length-1] } : { address:loc, city:'' }
  }

  const meetings = data?.meetings ?? []
  const allMeetings = allData?.meetings ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-6 h-6 text-indigo-500"/>{t.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{allMeetings.length > 0 ? `${allMeetings.length} ${t.totalMeetings}` : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4"/>{t.newMeeting}
        </button>
      </div>

      {/* Stats */}
      {allMeetings.length > 0 && <StatsBar meetings={allMeetings} lang={lang}/>}

      {/* Filters + Search */}
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-[76px] rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
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
        <div className="space-y-2">
          {meetings.map(m => <MeetingCard key={m.id} meeting={m} lang={lang} onClick={() => setDetailMeeting(m)}/>)}
        </div>
      )}

      {/* Create form */}
      {showForm && <MeetingForm lang={lang} clients={clients} onClose={() => setShowForm(false)}
        onSave={d => createMutation.mutate(d as FormData)}/>}

      {/* Edit form */}
      {editMeeting && (() => {
        const { address, city } = parseLocation(editMeeting.meeting_location)
        const dt = editMeeting.due_date ? new Date(editMeeting.due_date) : null
        const clientName = editMeeting.client ? `${editMeeting.client.first_name} ${editMeeting.client.last_name}` : ''
        return (
          <MeetingForm lang={lang} clients={clients} onClose={() => setEditMeeting(null)}
            initial={{ id:editMeeting.id, title:editMeeting.title, description:editMeeting.description??'',
              date:dt?dt.toISOString().slice(0,10):'', time:dt?dt.toTimeString().slice(0,5):'',
              client_id:editMeeting.client?.id??'', client_name:clientName,
              address, city, meeting_duration_min:editMeeting.meeting_duration_min??60, priority:editMeeting.priority }}
            onSave={d => updateMutation.mutate(d as FormData & { id:string })}/>
        )
      })()}

      {/* Detail modal */}
      {detailMeeting && !editMeeting && (
        <MeetingDetailModal meeting={detailMeeting} lang={lang}
          onClose={() => setDetailMeeting(null)}
          onEdit={() => { setEditMeeting(detailMeeting); setDetailMeeting(null) }}
          onDelete={() => deleteMutation.mutate(detailMeeting.id)}
          onDone={() => doneMutation.mutate(detailMeeting.id)}/>
      )}
    </div>
  )
}
