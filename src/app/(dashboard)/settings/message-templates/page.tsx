'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, MessageCircle, MessageSquare, Save, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrgTemplates } from '@/hooks/useOrgTemplates'
import { buildMessage } from '@/lib/message-utils'
import { toast } from 'sonner'

// ── variable tokens available in templates ────────────────────────────────────
const VARS = [
  { key: '{client_name}',  labelHe: 'שם הלקוח',         labelRu: 'Имя клиента' },
  { key: '{org_name}',     labelHe: 'שם הסלון',          labelRu: 'Название организации' },
  { key: '{visit_ref}',    labelHe: 'פרטי ביקור',        labelRu: 'Референс визита' },
  { key: '{product_ref}',  labelHe: 'שם מוצר',           labelRu: 'Референс товара' },
]

// preview sample data
const PREVIEW_VARS = {
  client_name: 'יוסי כהן / Йоси Коэн',
  org_name:    'Beauty Studio',
  visit_ref:   '01/12/2025 14:30 — Стрижка',
  product_ref: 'Маска для волос',
}

type TemplateType = 'whatsapp' | 'sms'

export default function MessageTemplatesPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isHe = language === 'he'
  const dir = isHe ? 'rtl' : 'ltr'

  const { templates, isLoading, save, isSaving } = useOrgTemplates()

  const [activeTab, setActiveTab] = useState<TemplateType>('whatsapp')
  const [whatsappDraft, setWhatsappDraft] = useState('')
  const [smsDraft, setSmsDraft] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // textarea refs for cursor-aware variable insertion
  const waRef  = useRef<HTMLTextAreaElement>(null)
  const smsRef = useRef<HTMLTextAreaElement>(null)

  // populate drafts once templates load
  useEffect(() => {
    if (!templates) return
    setWhatsappDraft(templates.whatsapp_template ?? '')
    setSmsDraft(templates.sms_template ?? '')
  }, [templates])

  const currentDraft  = activeTab === 'whatsapp' ? whatsappDraft  : smsDraft
  const setCurrentDraft = activeTab === 'whatsapp' ? setWhatsappDraft : setSmsDraft
  const currentRef    = activeTab === 'whatsapp' ? waRef : smsRef

  // insert variable at cursor position in textarea
  function insertVar(varKey: string) {
    const el = currentRef.current
    if (!el) {
      setCurrentDraft(prev => prev + varKey)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const next  = el.value.slice(0, start) + varKey + el.value.slice(end)
    setCurrentDraft(next)
    // restore cursor after inserted text
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + varKey.length, start + varKey.length)
    })
  }

  async function handleSave() {
    try {
      await save({
        whatsapp_template: whatsappDraft,
        sms_template:      smsDraft,
      })
      toast.success(isHe ? 'התבנית נשמרה' : 'Шаблоны сохранены')
    } catch {
      toast.error(isHe ? 'שגיאה בשמירה' : 'Ошибка сохранения')
    }
  }

  const previewText = buildMessage(currentDraft, PREVIEW_VARS)

  const BackIcon = isHe ? ArrowRight : ArrowLeft

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isHe ? 'תבניות הודעות' : 'Шаблоны сообщений'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isHe ? 'הגדר הודעות ברירת מחדל ל-SMS ו-WhatsApp' : 'Настройте шаблоны для кнопок SMS и WhatsApp'}
          </p>
        </div>
      </div>

      {/* Tabs: WhatsApp / SMS */}
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            activeTab === 'whatsapp'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-b-2 border-green-500'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            activeTab === 'sms'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          SMS
        </button>
      </div>

      {/* Variable buttons */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {isHe ? 'הוסף משתנה לתבנית:' : 'Вставить переменную:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {VARS.map((v) => (
            <button
              key={v.key}
              onClick={() => insertVar(v.key)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium transition-colors border border-gray-200 dark:border-gray-600"
            >
              {isHe ? v.labelHe : v.labelRu}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {isHe
            ? 'לחץ כדי להוסיף בעמדת הסמן בתוך התבנית'
            : 'Нажмите чтобы вставить в позицию курсора'}
        </p>
      </div>

      {/* Textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {activeTab === 'whatsapp'
            ? (isHe ? 'תבנית WhatsApp' : 'Шаблон WhatsApp')
            : (isHe ? 'תבנית SMS' : 'Шаблон SMS')}
        </label>
        {activeTab === 'whatsapp' ? (
          <textarea
            ref={waRef}
            value={whatsappDraft}
            onChange={(e) => setWhatsappDraft(e.target.value)}
            rows={6}
            dir={isHe ? 'rtl' : 'ltr'}
            placeholder={isHe
              ? 'שלום {client_name}! מתזכרים לך...'
              : 'Привет, {client_name}! Напоминаем...'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        ) : (
          <textarea
            ref={smsRef}
            value={smsDraft}
            onChange={(e) => setSmsDraft(e.target.value)}
            rows={6}
            dir={isHe ? 'rtl' : 'ltr'}
            placeholder={isHe
              ? 'שלום {client_name}! מתזכרים לך...'
              : 'Привет, {client_name}! Напоминаем...'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Preview toggle */}
      <div>
        <button
          onClick={() => setShowPreview(p => !p)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {isHe ? 'תצוגה מקדימה' : 'Предпросмотр'}
        </button>

        {showPreview && (
          <div className="mt-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              {isHe ? 'דוגמה:' : 'Пример:'}
            </p>
            {previewText ? (
              <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200" dir={isHe ? 'rtl' : 'ltr'}>
                {previewText}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                {isHe ? 'התבנית ריקה' : 'Шаблон пустой'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving
            ? (isHe ? 'שומר...' : 'Сохранение...')
            : (isHe ? 'שמור שינויים' : 'Сохранить')}
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-semibold mb-1">
          {isHe ? 'איך זה עובד?' : 'Как это работает?'}
        </p>
        <p className="text-xs leading-relaxed">
          {isHe
            ? 'כאשר לוחצים על כפתור WhatsApp בכרטיס לקוח, ביקור או משימה — הודעה זו תיפתח אוטומטית עם פרטי הלקוח. אם אין תבנית — WhatsApp ייפתח ללא טקסט.'
            : 'Когда нажимается кнопка WhatsApp в карточке клиента, визита или задачи — это сообщение откроется автоматически с данными клиента. Если шаблон пустой — WhatsApp откроется без текста.'}
        </p>
      </div>
    </div>
  )
}
