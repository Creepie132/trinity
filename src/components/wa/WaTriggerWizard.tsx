'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Zap, Clock, FileText, Check, ChevronRight, ChevronLeft, Loader2, X, Eye } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = 'visit_created' | 'visit_reminder' | 'visit_completed' | 'client_added' | 'demo_expired'

interface Trigger {
  trigger_type:     TriggerType
  is_enabled:       boolean
  delay_min_sec:    number
  delay_max_sec:    number
  hours_before:     number | null
  message_template: string
}

interface Props {
  onClose: () => void
}

// ─── Конфигурация триггеров ───────────────────────────────────────────────────

const TRIGGER_META: Record<TriggerType, { emoji: string; labelHe: string; labelRu: string; descHe: string; descRu: string; color: string; hasHoursBefore: boolean }> = {
  visit_created:   { emoji: '📅', labelHe: 'תור נוצר',        labelRu: 'Запись создана',    descHe: 'נשלח מיד כשנקבע תור חדש',               descRu: 'Отправляется сразу при записи',           color: 'blue',   hasHoursBefore: false },
  visit_reminder:  { emoji: '⏰', labelHe: 'תזכורת לתור',     labelRu: 'Напоминание',       descHe: 'נשלח X שעות לפני התור',                  descRu: 'Отправляется за X часов до визита',       color: 'purple', hasHoursBefore: true  },
  visit_completed: { emoji: '✅', labelHe: 'אחרי הביקור',     labelRu: 'После визита',      descHe: 'הודעת תודה אחרי הביקור',                 descRu: 'Благодарность после визита',              color: 'green',  hasHoursBefore: false },
  client_added:    { emoji: '👋', labelHe: 'לקוח חדש',        labelRu: 'Новый клиент',      descHe: 'ברכות ללקוח חדש',                        descRu: 'Приветствие новому клиенту',              color: 'amber',  hasHoursBefore: false },
  demo_expired:    { emoji: '🔔', labelHe: 'דמו הסתיים',      labelRu: 'Демо истекло',      descHe: 'הודעה כשתוקף הדמו פג',                   descRu: 'Уведомление об окончании демо',           color: 'red',    hasHoursBefore: false },
}

const VARIABLES = ['{{client_name}}', '{{date}}', '{{time}}', '{{service}}', '{{link}}']

const HOURS_OPTIONS = [1, 2, 3, 6, 12, 24, 48]

const DEFAULT_TRIGGERS: Trigger[] = [
  { trigger_type: 'visit_created',   is_enabled: true,  delay_min_sec: 20,  delay_max_sec: 60,  hours_before: null, message_template: 'שלום {{client_name}}! 👋 התור שלך אושר ל-{{date}} בשעה {{time}}. {{service}} — מחכים לך! ✨' },
  { trigger_type: 'visit_reminder',  is_enabled: true,  delay_min_sec: 30,  delay_max_sec: 90,  hours_before: 24,   message_template: 'היי {{client_name}} 😊 תזכורת — מחר יש לך תור בשעה {{time}}. {{service}}. נתראה! 💇' },
  { trigger_type: 'visit_completed', is_enabled: false, delay_min_sec: 60,  delay_max_sec: 180, hours_before: null, message_template: 'תודה שבאת {{client_name}}! 🙏 מקווים שנהנית. נשמח לראותך שוב ⭐' },
  { trigger_type: 'client_added',    is_enabled: false, delay_min_sec: 10,  delay_max_sec: 30,  hours_before: null, message_template: 'ברוך הבא {{client_name}}! 🎉 שמחים שהצטרפת אלינו 💬' },
  { trigger_type: 'demo_expired',    is_enabled: false, delay_min_sec: 5,   delay_max_sec: 15,  hours_before: null, message_template: 'שלום {{client_name}}, תקופת הניסיון הסתיימה. צור קשר לחידוש 👉 {{link}}' },
]

// ─── Color helpers ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', ring: 'ring-purple-400' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  ring: 'ring-green-400' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  ring: 'ring-amber-400' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    ring: 'ring-red-400' },
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, icon: Zap,           labelHe: 'בחר טריגרים',  labelRu: 'Триггеры' },
  { id: 2, icon: Clock,         labelHe: 'תזמון',         labelRu: 'Тайминг'  },
  { id: 3, icon: FileText,      labelHe: 'הודעות',        labelRu: 'Сообщения'},
  { id: 4, icon: Check,         labelHe: 'סיום',          labelRu: 'Готово'   },
]

// ─── Main Wizard Component ────────────────────────────────────────────────────

export function WaTriggerWizard({ onClose }: Props) {
  const [step, setStep] = useState(1)
  const [triggers, setTriggers] = useState<Trigger[]>(DEFAULT_TRIGGERS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTrigger, setActiveTrigger] = useState<TriggerType>('visit_created')
  const [previewText, setPreviewText] = useState('')
  const l = true // иврит по умолчанию

  useEffect(() => {
    fetch('/api/wa-triggers')
      .then(r => r.json())
      .then(data => {
        if (data.triggers?.length) {
          // Мержим с дефолтами чтобы новые триггеры всегда были
          const merged = DEFAULT_TRIGGERS.map(def => {
            const saved = data.triggers.find((t: Trigger) => t.trigger_type === def.trigger_type)
            return saved ? { ...def, ...saved } : def
          })
          setTriggers(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateTrigger = (type: TriggerType, patch: Partial<Trigger>) => {
    setTriggers(prev => prev.map(t => t.trigger_type === type ? { ...t, ...patch } : t))
  }

  const getTrigger = (type: TriggerType) => triggers.find(t => t.trigger_type === type)!

  const previewMessage = (template: string) => {
    return template
      .replace(/{{client_name}}/g, 'שרה כהן')
      .replace(/{{date}}/g, '18.03.2026')
      .replace(/{{time}}/g, '14:30')
      .replace(/{{service}}/g, 'תספורת + צבע')
      .replace(/{{link}}/g, 'https://ambersol.co.il')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/wa-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggers }),
      })
      if (!res.ok) throw new Error()
      toast.success(l ? '✓ הטריגרים נשמרו' : '✓ Триггеры сохранены')
      setStep(4)
    } catch {
      toast.error(l ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-10 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <p className="text-slate-500 text-sm">{l ? 'טוען הגדרות...' : 'Загрузка...'}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 px-6 pt-6 pb-8 text-white flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{l ? 'אשף הגדרות WhatsApp' : 'Настройка WhatsApp'}</h2>
              <p className="text-green-100 text-sm">{l ? 'הגדר אוטומציות ל-WhatsApp' : 'Настройте автоматические сообщения'}</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-white text-green-600 shadow-lg scale-105' :
                    isDone   ? 'bg-green-600/50 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                    {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                    <span className="text-xs font-semibold hidden sm:block">{l ? s.labelHe : s.labelRu}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 ${step > s.id ? 'text-white/80' : 'text-white/20'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1: Выбор триггеров ── */}
          {step === 1 && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-500 mb-4">{l ? 'בחר אילו אירועים ישלחו הודעת WhatsApp' : 'Выберите какие события отправляют WA-сообщения'}</p>
              {triggers.map(trigger => {
                const meta = TRIGGER_META[trigger.trigger_type]
                const colors = COLOR_MAP[meta.color]
                return (
                  <button key={trigger.trigger_type}
                    onClick={() => updateTrigger(trigger.trigger_type, { is_enabled: !trigger.is_enabled })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-start ${
                      trigger.is_enabled
                        ? `${colors.bg} ${colors.border} shadow-sm`
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${trigger.is_enabled ? colors.text : 'text-slate-500'}`}>
                        {l ? meta.labelHe : meta.labelRu}
                      </p>
                      <p className="text-xs text-slate-400">{l ? meta.descHe : meta.descRu}</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${
                      trigger.is_enabled ? 'bg-green-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── STEP 2: Тайминг ── */}
          {step === 2 && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-2">{l ? 'הגדר עיכוב שליחה לכל טריגר (ימנע חסימה)' : 'Задержка отправки для каждого триггера (защита от бана)'}</p>
              {triggers.filter(t => t.is_enabled).map(trigger => {
                const meta = TRIGGER_META[trigger.trigger_type]
                const colors = COLOR_MAP[meta.color]
                return (
                  <div key={trigger.trigger_type} className={`${colors.bg} ${colors.border} border rounded-2xl p-4 space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      <p className={`font-semibold text-sm ${colors.text}`}>{l ? meta.labelHe : meta.labelRu}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{l ? 'עיכוב מינימלי (שניות)' : 'Мин. задержка (сек)'}</label>
                        <input type="number" min={1} max={600} value={trigger.delay_min_sec}
                          onChange={e => updateTrigger(trigger.trigger_type, { delay_min_sec: +e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{l ? 'עיכוב מקסימלי (שניות)' : 'Макс. задержка (сек)'}</label>
                        <input type="number" min={1} max={600} value={trigger.delay_max_sec}
                          onChange={e => updateTrigger(trigger.trigger_type, { delay_max_sec: +e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                    </div>
                    {meta.hasHoursBefore && (
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{l ? 'כמה שעות לפני התור?' : 'За сколько часов до визита?'}</label>
                        <div className="flex flex-wrap gap-2">
                          {HOURS_OPTIONS.map(h => (
                            <button key={h} onClick={() => updateTrigger(trigger.trigger_type, { hours_before: h })}
                              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                                trigger.hours_before === h
                                  ? `${colors.badge} ring-2 ${colors.ring}`
                                  : 'bg-white border border-slate-200 text-slate-600'
                              }`}>
                              {h}{l ? ' שעות' : 'ч'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {triggers.filter(t => t.is_enabled).length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <p>{l ? 'אין טריגרים פעילים. חזור לשלב 1.' : 'Нет активных триггеров. Вернись на шаг 1.'}</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Тексты сообщений ── */}
          {step === 3 && (
            <div className="p-6 space-y-5">
              {/* Tab selector */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {triggers.filter(t => t.is_enabled).map(trigger => {
                  const meta = TRIGGER_META[trigger.trigger_type]
                  const colors = COLOR_MAP[meta.color]
                  return (
                    <button key={trigger.trigger_type}
                      onClick={() => setActiveTrigger(trigger.trigger_type)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTrigger === trigger.trigger_type
                          ? `${colors.bg} ${colors.border} border-2 ${colors.text}`
                          : 'bg-slate-50 border border-slate-200 text-slate-500'
                      }`}>
                      <span>{meta.emoji}</span>
                      <span className="hidden sm:block">{l ? meta.labelHe : meta.labelRu}</span>
                    </button>
                  )
                })}
              </div>

              {/* Message editor */}
              {triggers.filter(t => t.is_enabled).map(trigger => {
                if (trigger.trigger_type !== activeTrigger) return null
                const meta = TRIGGER_META[trigger.trigger_type]
                const colors = COLOR_MAP[meta.color]
                return (
                  <div key={trigger.trigger_type} className="space-y-3">
                    {/* Variables chips */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2">{l ? 'משתנים זמינים (לחץ להוסיף):' : 'Доступные переменные (нажми чтобы вставить):'}</p>
                      <div className="flex flex-wrap gap-2">
                        {VARIABLES.map(v => (
                          <button key={v} onClick={() => {
                            updateTrigger(trigger.trigger_type, {
                              message_template: trigger.message_template + v
                            })
                          }}
                            className={`px-2 py-1 ${colors.badge} rounded-lg text-xs font-mono hover:opacity-80 transition-opacity`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={trigger.message_template}
                      onChange={e => updateTrigger(trigger.trigger_type, { message_template: e.target.value })}
                      rows={5}
                      placeholder={l ? 'הכנס את טקסט ההודעה...' : 'Введите текст сообщения...'}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none font-sans"
                    />

                    {/* Preview */}
                    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className={`w-4 h-4 ${colors.text}`} />
                        <p className={`text-xs font-semibold ${colors.text}`}>{l ? 'תצוגה מקדימה' : 'Предпросмотр'}</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {previewMessage(trigger.message_template) || (l ? 'הכנס טקסט לתצוגה מקדימה' : 'Введите текст для превью')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {triggers.filter(t => t.is_enabled).length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <p>{l ? 'אין טריגרים פעילים.' : 'Нет активных триггеров.'}</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Готово ── */}
          {step === 4 && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{l ? '!הכל מוכן' : 'Всё готово!'}</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                {l ? 'הטריגרים שלך נשמרו. WhatsApp יתחיל לשלוח הודעות אוטומטיות מעכשיו.' : 'Триггеры сохранены. WhatsApp начнёт отправлять автоматические сообщения.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {triggers.filter(t => t.is_enabled).map(t => (
                  <span key={t.trigger_type} className={`px-3 py-1.5 ${COLOR_MAP[TRIGGER_META[t.trigger_type].color].badge} rounded-xl text-xs font-semibold`}>
                    {TRIGGER_META[t.trigger_type].emoji} {l ? TRIGGER_META[t.trigger_type].labelHe : TRIGGER_META[t.trigger_type].labelRu}
                  </span>
                ))}
              </div>
              <button onClick={onClose}
                className="mt-4 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors">
                {l ? 'סגור' : 'Закрыть'}
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step < 4 && (
          <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-white flex-shrink-0">
            <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              {l ? 'הקודם' : 'Назад'}
            </button>
            <div className="flex gap-1.5">
              {STEPS.slice(0, 3).map(s => (
                <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${step === s.id ? 'bg-green-500 w-5' : step > s.id ? 'bg-green-300' : 'bg-slate-200'}`} />
              ))}
            </div>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors">
                {l ? 'הבא' : 'Далее'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {l ? 'שמור' : 'Сохранить'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
