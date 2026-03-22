'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DealStage { id: string; name: string; name_he: string | null; color: string; is_won: boolean; is_lost: boolean }

interface DealClient {
  id: string; first_name: string; last_name: string
  phone: string; email: string | null; address: string | null
  city: string | null; date_of_birth: string | null
  notes: string | null; description: string | null
}

interface DealFull {
  id: string; title: string; amount: number; currency: string
  source: string | null; notes: string | null
  expected_close_date: string | null; next_action: string | null; next_action_date: string | null
  last_contact_at: string | null; stage_id: string; created_at: string; updated_at: string
  setup_fee: number | null; commission_amount: number | null
  client: DealClient | null
  stage: DealStage | null
  tags: { tag: { id: string; name: string; color: string } }[]
}

interface DealDrawerProps {
  dealId: string | null
  lang: string
  onClose: () => void
  onUpdated: () => void
}

// ─── Source options ───────────────────────────────────────────────────────────

const SOURCES = [
  { value: 'whatsapp',  he: 'וואטסאפ',    ru: 'WhatsApp'       },
  { value: 'referral',  he: 'המלצה',       ru: 'Рекомендация'   },
  { value: 'instagram', he: 'אינסטגרם',   ru: 'Instagram'      },
  { value: 'facebook',  he: 'פייסבוק',    ru: 'Facebook'       },
  { value: 'website',   he: 'אתר',         ru: 'Сайт'           },
  { value: 'cold',      he: 'שיחה קרה',   ru: 'Холодный звонок' },
  { value: 'other',     he: 'אחר',         ru: 'Другое'         },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function waLink(phone: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean.startsWith('0') ? '972' + clean.slice(1) : clean}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  const isHe = lang === 'he'
  if (mins < 2) return isHe ? 'עכשיו' : 'только что'
  if (mins < 60) return isHe ? `לפני ${mins} ד'` : `${mins} мин назад`
  if (hours < 24) return isHe ? `לפני ${hours} ש'` : `${hours} ч назад`
  return isHe ? `לפני ${days} ימים` : `${days} дн назад`
}

const AVATAR_GRADIENTS = [
  ['#8B5CF6','#6366F1'], ['#10B981','#0D9488'], ['#F59E0B','#EF4444'],
  ['#EC4899','#F43F5E'], ['#3B82F6','#06B6D4'], ['#8B5CF6','#A855F7'],
]
function avGrad(name: string) { return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length] }
function initials(f: string, l: string) { return ((f[0] ?? '') + (l[0] ?? '')).toUpperCase() }

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100/80">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

// ─── Editable field ───────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder, multiline, dir }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; multiline?: boolean; dir?: string
}) {
  if (multiline) {
    return (
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3} dir={dir}
          className="w-full text-sm text-gray-800 bg-white/80 border border-gray-100 focus:border-indigo-300 rounded-xl px-3 py-2 outline-none resize-none transition-colors placeholder:text-gray-300"/>
      </div>
    )
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} dir={dir}
        className="w-full text-sm text-gray-800 bg-white/80 border border-gray-100 focus:border-indigo-300 rounded-xl px-3 py-2 outline-none transition-colors placeholder:text-gray-300"/>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DealDrawer({ dealId, lang, onClose, onUpdated }: DealDrawerProps) {
  const isHe = lang === 'he'
  const [deal, setDeal] = useState<DealFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    title: '', amount: '', source: '', notes: '', next_action: '',
    next_action_date: '', expected_close_date: '',
  })
  const [clientForm, setClientForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    address: '', city: '', date_of_birth: '', notes: '', description: '',
  })

  const loadDeal = useCallback(async (id: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/worker/deals/${id}`)
      if (!res.ok) throw new Error('Failed to load')
      const { deal: d } = await res.json()
      setDeal(d)
      setForm({
        title:               d.title ?? '',
        amount:              d.amount != null ? String(d.amount) : '',
        source:              d.source ?? '',
        notes:               d.notes ?? '',
        next_action:         d.next_action ?? '',
        next_action_date:    d.next_action_date ?? '',
        expected_close_date: d.expected_close_date ?? '',
      })
      if (d.client) {
        setClientForm({
          first_name:    d.client.first_name ?? '',
          last_name:     d.client.last_name ?? '',
          phone:         d.client.phone ?? '',
          email:         d.client.email ?? '',
          address:       d.client.address ?? '',
          city:          d.client.city ?? '',
          date_of_birth: d.client.date_of_birth ?? '',
          notes:         d.client.notes ?? '',
          description:   d.client.description ?? '',
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dealId) loadDeal(dealId)
    else setDeal(null)
  }, [dealId, loadDeal])

  const triggerSave = useCallback(() => {
    if (!dealId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch(`/api/worker/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:               form.title.trim() || undefined,
            amount:              form.amount !== '' ? parseFloat(form.amount) : undefined,
            source:              form.source || null,
            notes:               form.notes.trim() || null,
            next_action:         form.next_action.trim() || null,
            next_action_date:    form.next_action_date || null,
            expected_close_date: form.expected_close_date || null,
            client: {
              first_name:    clientForm.first_name.trim(),
              last_name:     clientForm.last_name.trim(),
              phone:         clientForm.phone.trim(),
              email:         clientForm.email.trim() || null,
              address:       clientForm.address.trim() || null,
              city:          clientForm.city.trim() || null,
              date_of_birth: clientForm.date_of_birth || null,
              notes:         clientForm.notes.trim() || null,
              description:   clientForm.description.trim() || null,
            },
          }),
        })
        if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); onUpdated() }
      } finally { setSaving(false) }
    }, 1000)
  }, [dealId, form, clientForm, onUpdated])

  const setF = (k: keyof typeof form) => (v: string) => { setForm(f => ({ ...f, [k]: v })); triggerSave() }
  const setC = (k: keyof typeof clientForm) => (v: string) => { setClientForm(f => ({ ...f, [k]: v })); triggerSave() }

  const isOpen = !!dealId
  const clientName = deal?.client ? `${deal.client.first_name} ${deal.client.last_name}`.trim() : ''
  const [g1, g2] = clientName ? avGrad(clientName) : ['#8B5CF6', '#6366F1']

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} />

      {/* Drawer */}
      <div dir={isHe ? 'rtl' : 'ltr'}
        className={`fixed top-0 end-0 z-50 h-full w-full max-w-md bg-gradient-to-b from-slate-50 via-white to-blue-50/30
                    shadow-2xl border-s border-white/50 transition-all duration-300 ease-out flex flex-col overflow-hidden
                    ${isOpen ? 'translate-x-0' : isHe ? 'translate-x-full' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="shrink-0 relative overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 px-5 py-5 text-white">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 60%)' }} />
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {clientName ? (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                    {initials(deal?.client?.first_name ?? '?', deal?.client?.last_name ?? '')}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><span className="text-2xl">👤</span></div>
                )}
                <div>
                  <p className="font-black text-base leading-tight">{clientName || (isHe ? 'לקוח לא ידוע' : 'Клиент')}</p>
                  {deal?.client?.phone && (
                    <a href={waLink(deal.client.phone)} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-200 text-xs hover:text-white flex items-center gap-1 mt-0.5 transition-colors" dir="ltr">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      {deal.client.phone}
                    </a>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Meta pills */}
            <div className="relative flex items-center gap-2 flex-wrap">
              {deal?.stage && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                  {(isHe && deal.stage.name_he) ? deal.stage.name_he : deal.stage.name}
                </span>
              )}
              {deal && deal.amount > 0 && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-400/40 text-emerald-100">{fmt(deal.amount)}</span>
              )}
              {deal?.last_contact_at && (
                <span className="text-[11px] text-indigo-200">{timeAgo(deal.last_contact_at, lang)}</span>
              )}
            </div>
          </div>

          {/* Save indicator */}
          <div className={`px-5 py-2 flex items-center gap-2 text-xs font-semibold transition-all duration-300 ${saving ? 'bg-amber-50 text-amber-600' : saved ? 'bg-emerald-50 text-emerald-600' : 'bg-transparent text-transparent h-0 py-0 overflow-hidden'}`}>
            {saving && <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{isHe ? 'שומר...' : 'Сохраняю...'}</>}
            {saved && !saving && <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>{isHe ? 'נשמר ✓' : 'Сохранено ✓'}</>}
            {!saving && !saved && <span>&nbsp;</span>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 pt-3">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

          {deal && !loading && (
            <>
              {/* Deal */}
              <Section title={isHe ? 'פרטי עסקה' : 'Данные сделки'} icon="💼">
                <Field label={isHe ? 'נושא' : 'Тема'} value={form.title} onChange={setF('title')} placeholder={isHe ? 'נושא העסקה' : 'Тема сделки'}/>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isHe ? 'סכום (₪)' : 'Сумма (₪)'}</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-3 flex items-center text-gray-400 text-xs font-bold">₪</span>
                      <input type="number" value={form.amount} onChange={e => setF('amount')(e.target.value)} placeholder="0" min={0} dir="ltr"
                        className="w-full text-sm text-gray-800 bg-white/80 border border-gray-100 focus:border-indigo-300 rounded-xl ps-7 pe-3 py-2 outline-none transition-colors"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isHe ? 'מקור' : 'Источник'}</label>
                    <select value={form.source} onChange={e => setF('source')(e.target.value)}
                      className="w-full text-sm text-gray-800 bg-white/80 border border-gray-100 focus:border-indigo-300 rounded-xl px-3 py-2 outline-none transition-colors">
                      <option value="">{isHe ? 'בחר...' : 'Выбрать...'}</option>
                      {SOURCES.map(s => <option key={s.value} value={s.value}>{isHe ? s.he : s.ru}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={isHe ? 'תאריך סגירה' : 'Дата закрытия'} value={form.expected_close_date} onChange={setF('expected_close_date')} type="date"/>
                  <Field label={isHe ? 'תאריך פעולה' : 'Дата действия'} value={form.next_action_date} onChange={setF('next_action_date')} type="date"/>
                </div>
                <Field label={isHe ? 'פעולה הבאה' : 'Следующий шаг'} value={form.next_action} onChange={setF('next_action')} placeholder={isHe ? 'מה לעשות?' : 'Что сделать?'}/>
                <Field label={isHe ? 'הערות עסקה' : 'Заметки по сделке'} value={form.notes} onChange={setF('notes')} placeholder={isHe ? 'הערות נוספות...' : 'Дополнительные заметки...'} multiline/>
              </Section>

              {/* Client */}
              <Section title={isHe ? 'פרטי לקוח' : 'Данные клиента'} icon="👤">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={isHe ? 'שם פרטי' : 'Имя'} value={clientForm.first_name} onChange={setC('first_name')}/>
                  <Field label={isHe ? 'שם משפחה' : 'Фамилия'} value={clientForm.last_name} onChange={setC('last_name')}/>
                </div>
                <Field label={isHe ? 'טלפון' : 'Телефон'} value={clientForm.phone} onChange={setC('phone')} type="tel" dir="ltr" placeholder="050-0000000"/>
                <Field label={isHe ? 'אימייל' : 'Email'} value={clientForm.email} onChange={setC('email')} type="email" dir="ltr" placeholder="email@example.com"/>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={isHe ? 'עיר' : 'Город'} value={clientForm.city} onChange={setC('city')}/>
                  <Field label={isHe ? 'תאריך לידה' : 'Дата рождения'} value={clientForm.date_of_birth} onChange={setC('date_of_birth')} type="date"/>
                </div>
                <Field label={isHe ? 'כתובת' : 'Адрес'} value={clientForm.address} onChange={setC('address')}/>
              </Section>

              {/* Business */}
              <Section title={isHe ? 'תיאור עסק' : 'О бизнесе'} icon="🏢">
                <Field label={isHe ? 'תיאור' : 'Описание бизнеса'} value={clientForm.description} onChange={setC('description')} placeholder={isHe ? 'תאר את העסק...' : 'Опиши бизнес клиента...'} multiline/>
                <Field label={isHe ? 'הערות' : 'Заметки о клиенте'} value={clientForm.notes} onChange={setC('notes')} placeholder={isHe ? 'הערות על הלקוח...' : 'Заметки о клиенте...'} multiline/>
              </Section>

              {/* Tags */}
              {deal.tags.length > 0 && (
                <Section title={isHe ? 'תגיות' : 'Теги'} icon="🏷️">
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map(({ tag }) => (
                      <span key={tag.id} className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-sm" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Commission */}
              {deal.setup_fee != null && (
                <Section title={isHe ? 'עמלה' : 'Комиссия'} icon="💰">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">{isHe ? 'עלות הקמה' : 'Setup Fee'}</p>
                      <p className="text-xl font-black text-emerald-700">{fmt(deal.setup_fee)}</p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">{isHe ? 'עמלה (30%)' : 'Комиссия (30%)'}</p>
                      <p className="text-xl font-black text-indigo-700">{fmt(deal.commission_amount ?? deal.setup_fee * 0.3)}</p>
                    </div>
                  </div>
                </Section>
              )}

              {/* Meta */}
              <div className="rounded-2xl bg-white/40 border border-white/40 px-4 py-3 text-[11px] text-gray-400 flex items-center justify-between">
                <span>{isHe ? 'נוצר:' : 'Создан:'} {new Date(deal.created_at).toLocaleDateString(isHe ? 'he-IL' : 'ru-RU')}</span>
                <span>{isHe ? 'עודכן:' : 'Изменён:'} {timeAgo(deal.updated_at, lang)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
