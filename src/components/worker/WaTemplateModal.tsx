'use client'

import { useCallback, useEffect, useState } from 'react'

interface Template {
  id: string; name: string; content: string; category: string; variables: string[]
}
interface Client {
  id: string; first_name: string; last_name: string; phone: string
}

interface WaTemplateModalProps {
  open:    boolean
  lang:    string
  onClose: () => void
}

const CATEGORY_ICON: Record<string, string> = {
  reminder:  '⏰',
  birthday:  '🎂',
  followup:  '🔄',
  promotion: '🔥',
  default:   '💬',
}

function waLink(phone: string, text: string): string {
  const clean = phone.replace(/\D/g, '')
  const num   = clean.startsWith('0') ? '972' + clean.slice(1) : clean
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

/** Replace template variables with client data where possible, else leave placeholder */
function fillTemplate(content: string, client: Client | null, orgName = 'Amber Solutions'): string {
  let out = content
  if (client) {
    out = out.replace(/{first_name}/g, client.first_name)
    out = out.replace(/{last_name}/g,  client.last_name ?? '')
  }
  out = out.replace(/{org_name}/g, orgName)
  // Leave remaining vars like {time}, {days}, {message} for manual edit
  return out
}

export function WaTemplateModal({ open, lang, onClose }: WaTemplateModalProps) {
  const isHe = lang === 'he'

  const [templates,  setTemplates]  = useState<Template[]>([])
  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(false)

  // Step 1: pick template, Step 2: pick client + edit, Step 3: confirm
  const [step,        setStep]        = useState<1|2|3>(1)
  const [selTemplate, setSelTemplate] = useState<Template | null>(null)
  const [selClient,   setSelClient]   = useState<Client | null>(null)
  const [msgText,     setMsgText]     = useState('')
  const [search,      setSearch]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/worker/wa-templates')
      if (res.ok) {
        const d = await res.json()
        setTemplates(d.templates ?? [])
        setClients(d.clients ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) { load(); setStep(1); setSelTemplate(null); setSelClient(null); setMsgText(''); setSearch('') }
  }, [open, load])

  const handlePickTemplate = (t: Template) => {
    setSelTemplate(t)
    setMsgText(fillTemplate(t.content, selClient))
    setStep(2)
  }

  const handlePickClient = (c: Client) => {
    setSelClient(c)
    setMsgText(fillTemplate(selTemplate!.content, c))
  }

  const handleSend = () => {
    if (!selClient || !msgText.trim()) return
    const url = waLink(selClient.phone, msgText.trim())
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name ?? '').toLowerCase().includes(q) ||
      c.phone.includes(q)
    )
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-250"
        dir={isHe ? 'rtl' : 'ltr'}
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm">{isHe ? 'שלח תבנית WhatsApp' : 'Отправить шаблон WA'}</p>
                <p className="text-emerald-100 text-xs">
                  {step === 1
                    ? (isHe ? 'בחר תבנית' : 'Выбери шаблон')
                    : step === 2
                      ? (isHe ? 'בחר לקוח וערוך' : 'Выбери клиента и отредактируй')
                      : (isHe ? 'אשר ושלח' : 'Подтверди и отправь')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1.5 mt-3">
            {[1,2,3].map(n => (
              <div key={n} className={`h-1 rounded-full transition-all duration-300 ${
                n <= step ? 'bg-white flex-1' : 'bg-white/30 flex-1'
              }`} />
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Step 1 — choose template */}
          {step === 1 && (
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  {isHe ? 'אין תבניות פעילות' : 'Нет активных шаблонов'}
                </div>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handlePickTemplate(t)}
                    className="w-full text-start flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
                  >
                    <span className="text-xl mt-0.5 shrink-0">
                      {CATEGORY_ICON[t.category] ?? CATEGORY_ICON.default}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{t.content}</p>
                      {t.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.variables.map(v => (
                            <span key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isHe ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step 2 — choose client + edit message */}
          {step === 2 && (
            <div className="p-4 space-y-4">
              {/* Client search */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {isHe ? 'לקוח *' : 'Клиент *'}
                </label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isHe ? 'חפש לפי שם או טלפון...' : 'Поиск по имени или телефону...'}
                  className="w-full border border-gray-200 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors mb-2"
                />
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-gray-100">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {isHe ? 'לא נמצאו לקוחות' : 'Клиенты не найдены'}
                    </p>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handlePickClient(c)}
                        className={`w-full text-start flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          selClient?.id === c.id
                            ? 'bg-emerald-50 border-s-2 border-emerald-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                          {c.first_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-[11px] text-gray-400 dir-ltr text-start">{c.phone}</p>
                        </div>
                        {selClient?.id === c.id && (
                          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Message editor */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {isHe ? 'הודעה (ניתן לערוך)' : 'Сообщение (можно редактировать)'}
                </label>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-colors leading-relaxed"
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  {isHe
                    ? '⚠️ החלף את המשתנים ב-{} לפני השליחה'
                    : '⚠️ Замени переменные в {} перед отправкой'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-4 border-t border-gray-100 flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1|2|3)}
              className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {isHe ? '← חזרה' : '← Назад'}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleSend}
              disabled={!selClient || !msgText.trim()}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.845L.057 23.054a.75.75 0 00.916.916l5.209-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.963 0-3.8-.5-5.403-1.378l-.386-.217-4.003 1.126 1.126-4.003-.217-.386A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              {isHe ? 'פתח WhatsApp' : 'Открыть WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
