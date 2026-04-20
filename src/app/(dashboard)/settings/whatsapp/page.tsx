'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, MessageCircle, CheckCircle2, AlertCircle, Eye, EyeOff, Wifi, WifiOff, ExternalLink, Info } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'

// ─── i18n ─────────────────────────────────────────────────────────────────────

const L = {
  he: {
    title:       'WhatsApp מותאם אישית',
    subtitle:    'חבר מספר WhatsApp עצמאי לעסק שלך',
    back:        'חזרה להגדרות',
    toggle:      'השתמש במספר WhatsApp משלי',
    toggleDesc:  'הפעל כדי לחבר מספר Whapi.cloud עצמאי',
    apiUrl:      'API URL (Instance ID)',
    apiUrlPlh:   'לדוגמה: gate.whapi.cloud',
    token:       'API Token',
    tokenPlh:    'הזן את ה-Token מ-Whapi.cloud',
    tokenSaved:  '(כבר שמור — השאר ריק כדי לא לשנות)',
    save:        'שמור הגדרות',
    saving:      'שומר...',
    saved:       'ההגדרות נשמרו!',
    errorSave:   'שגיאה בשמירה',
    status:      'סטטוס',
    active:      'פעיל — נעשה שימוש במספר המותאם אישית',
    inactive:    'לא פעיל — נעשה שימוש במספר המשותף של המערכת',
    globalNote:  'ללא הגדרה מותאמת אישית המערכת תשלח הודעות ממספר משותף. זה עלול להגביל שליחה.',
    howto:       'איך לקבל Token מ-Whapi.cloud?',
    howtoLink:   'https://support.whapi.cloud/help-desk/getting-started',
    updated:     'עודכן',
    testSend:    'שלח הודעת בדיקה',
    testPhone:   'טלפון לבדיקה',
    testMsg:     'הודעת בדיקה מ-Trinity CRM ✅',
    sending:     'שולח...',
    testOk:      'הודעת הבדיקה נשלחה בהצלחה!',
    testFail:    'שליחת בדיקה נכשלה',
    primaryLangTitle: 'שפה ראשית של העסק',
    primaryLangDesc:  'משמש כברירת מחדל ללקוחות ללא שפה או עם שני השפות',
    primaryLangSaved: 'שפה נשמרה',
  },
  ru: {
    title:       'Персональный WhatsApp',
    subtitle:    'Подключите собственный номер WhatsApp для вашего бизнеса',
    back:        'Назад к настройкам',
    toggle:      'Использовать свой номер WhatsApp',
    toggleDesc:  'Включите чтобы подключить независимый инстанс Whapi.cloud',
    apiUrl:      'API URL (Instance ID)',
    apiUrlPlh:   'Например: gate.whapi.cloud',
    token:       'API Token',
    tokenPlh:    'Введите токен от Whapi.cloud',
    tokenSaved:  '(уже сохранён — оставьте пустым чтобы не менять)',
    save:        'Сохранить настройки',
    saving:      'Сохранение...',
    saved:       'Настройки сохранены!',
    errorSave:   'Ошибка сохранения',
    status:      'Статус',
    active:      'Активен — используется персональный номер',
    inactive:    'Не активен — используется общий номер системы',
    globalNote:  'Без персональной настройки сообщения отправляются с общего номера. Это может привести к блокировкам.',
    howto:       'Как получить токен от Whapi.cloud?',
    howtoLink:   'https://support.whapi.cloud/help-desk/getting-started',
    updated:     'Обновлено',
    testSend:    'Отправить тестовое сообщение',
    testPhone:   'Телефон для теста',
    testMsg:     'Тестовое сообщение от Trinity CRM ✅',
    sending:     'Отправка...',
    testOk:      'Тестовое сообщение отправлено!',
    testFail:    'Тест не прошёл',
    primaryLangTitle: 'Основной язык бизнеса',
    primaryLangDesc:  'Используется по умолчанию для клиентов без указанного языка или с обоими языками',
    primaryLangSaved: 'Язык сохранён',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhatsAppSettingsPage() {
  const router = useRouter()
  const { language, dir } = useLanguage()
  const t = L[language]

  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)

  // Form state
  const [useCustom, setUseCustom] = useState(false)
  const [apiUrl, setApiUrl]       = useState('')
  const [token, setToken]         = useState('')
  const [hasToken, setHasToken]   = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  // Primary language of organization (для WhatsApp-триггеров multilanguage)
  const [primaryLang, setPrimaryLang] = useState<'he' | 'ru'>('he')
  const [savingLang, setSavingLang]   = useState(false)

  // ── Load current settings ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiFetch<{
        useCustomWa: boolean; customApiUrl: string; hasToken: boolean; updatedAt: string | null
      }>('/api/settings/wa-custom'),
      apiFetch<{ primary_language: 'he' | 'ru' }>('/api/organizations/primary-language')
        .catch(() => ({ primary_language: 'he' as const })),
    ])
      .then(([waData, langData]) => {
        setUseCustom(waData.useCustomWa)
        setApiUrl(waData.customApiUrl || '')
        setHasToken(waData.hasToken)
        setUpdatedAt(waData.updatedAt)
        setPrimaryLang(langData.primary_language === 'ru' ? 'ru' : 'he')
      })
      .catch(() => toast.error(t.errorSave))
      .finally(() => setLoading(false))
  }, [])

  // ── Save primary_language (срабатывает сразу при выборе) ──────────────────
  const handleSaveLang = async (lang: 'he' | 'ru') => {
    setPrimaryLang(lang)
    setSavingLang(true)
    try {
      await apiFetch('/api/organizations/primary-language', {
        method: 'POST',
        json: { primary_language: lang },
      })
      toast.success(t.primaryLangSaved)
    } catch (err: any) {
      toast.error(`${t.errorSave}: ${err.message}`)
    } finally {
      setSavingLang(false)
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/settings/wa-custom', {
        method: 'POST',
        json: {
          useCustomWa:  useCustom,
          customApiUrl: apiUrl.trim(),
          customToken:  token.trim() || undefined,
        },
      })
      toast.success(t.saved)
      setToken('')          // очищаем поле токена после сохранения
      setHasToken(useCustom && (!!token.trim() || hasToken))
    } catch (err: any) {
      toast.error(`${t.errorSave}: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Test send ──────────────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!testPhone.trim()) return
    setTesting(true)
    try {
      const res = await apiFetch<{ ok: boolean; provider: string }>('/api/wa-inbox/send-test', {
        method: 'POST',
        json: { phone: testPhone.trim(), message: t.testMsg },
      })
      if (res.ok) {
        toast.success(`${t.testOk} (${res.provider})`)
      } else {
        toast.error(t.testFail)
      }
    } catch (err: any) {
      toast.error(`${t.testFail}: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const isRtl = dir === 'rtl'
  const BackIcon = isRtl ? ArrowLeft : ArrowRight

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6" dir={dir}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <BackIcon size={14} className={isRtl ? 'rotate-180' : ''} />
          {t.back}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
        useCustom && hasToken
          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
      }`}>
        {useCustom && hasToken
          ? <><CheckCircle2 size={16} />{t.status}: {t.active}</>
          : <><WifiOff size={16} />{t.status}: {t.inactive}</>
        }
        {updatedAt && (
          <span className="ml-auto text-xs opacity-60">
            {t.updated}: {new Date(updatedAt).toLocaleDateString(language === 'he' ? 'he-IL' : 'ru-RU')}
          </span>
        )}
      </div>

      {/* Global note */}
      {!useCustom && (
        <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{t.globalNote}</p>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">

        {/* Toggle */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{t.toggle}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.toggleDesc}</p>
          </div>
          <button
            onClick={() => setUseCustom(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              useCustom ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
              useCustom ? (isRtl ? 'right-1' : 'left-7') : (isRtl ? 'right-7' : 'left-1')
            }`} />
          </button>
        </div>

        {/* Fields — visible only when custom enabled */}
        {useCustom && (
          <div className="p-5 space-y-4">

            {/* API URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {t.apiUrl}
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder={t.apiUrlPlh}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                dir="ltr"
              />
            </div>

            {/* Token */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {t.token}
                {hasToken && (
                  <span className="ml-2 font-normal text-green-600 dark:text-green-400 normal-case">
                    {t.tokenSaved}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder={hasToken ? '••••••••••••••••' : t.tokenPlh}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Howto link */}
            <a
              href={t.howtoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Info size={12} />
              {t.howto}
              <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* Save button */}
        <div className="px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.saving}</>
              : t.save
            }
          </button>
        </div>
      </div>

      {/* Automation triggers link */}
      <div
        onClick={() => router.push('/settings/whatsapp/triggers')}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 flex items-center gap-4 cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {language === 'he' ? 'הודעות אוטומטיות' : 'Автоматические сообщения'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {language === 'he'
              ? 'תזכורות, ברכות יום הולדת, הודעות אחרי ביקור ועוד'
              : 'Напоминания, дни рождения, сообщения после визита и другое'}
          </p>
        </div>
        <ArrowRight size={16} className={`text-gray-400 group-hover:text-green-500 transition-colors ${dir === 'rtl' ? 'rotate-180' : ''}`} />
      </div>

      {/* Primary language — для WhatsApp-триггеров multilanguage */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t.primaryLangTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t.primaryLangDesc}
            </p>
          </div>
          {savingLang && (
            <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </div>
        <div className="flex gap-2">
          {(['he', 'ru'] as const).map(lang => {
            const active = primaryLang === lang
            const label  = lang === 'he' ? 'עברית' : 'Русский'
            const flag   = lang === 'he' ? '🇮🇱' : '🇷🇺'
            return (
              <button
                key={lang}
                onClick={() => { if (primaryLang !== lang) handleSaveLang(lang) }}
                disabled={savingLang}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 ${
                  active
                    ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <span className="text-base">{flag}</span>
                <span>{label}</span>
                {active && (
                  <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Test send — показываем только если custom активен и токен есть */}
      {useCustom && hasToken && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Wifi size={15} className="text-green-500" />
            {t.testSend}
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder={t.testPhone}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              dir="ltr"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testPhone.trim()}
              className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {testing
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <MessageCircle size={15} />
              }
              {testing ? t.sending : t.testSend}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
