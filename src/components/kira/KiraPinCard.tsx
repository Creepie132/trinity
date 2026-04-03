'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Lock, Unlock, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const I18N = {
  ru: {
    title: 'PIN для Киры',
    subtitle: 'Используется для подтверждения удаления клиентов и других необратимых действий',
    pinSet: 'PIN установлен',
    pinNotSet: 'PIN не установлен',
    newPin: 'Новый PIN (4 цифры)',
    currentPin: 'Текущий PIN',
    confirmPin: 'Повторите PIN',
    setBtn: 'Установить PIN',
    changeBtn: 'Сменить PIN',
    resetBtn: 'Сбросить PIN',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    mismatch: 'PIN не совпадает',
    wrongCurrent: 'Неверный текущий PIN',
    success: 'PIN успешно сохранён',
    resetSuccess: 'PIN сброшен',
    error: 'Ошибка. Попробуйте снова.',
    digits: 'Только 4 цифры',
  },
  he: {
    title: 'קוד PIN לקירה',
    subtitle: 'משמש לאישור מחיקת לקוחות ופעולות בלתי הפיכות אחרות',
    pinSet: 'קוד PIN מוגדר',
    pinNotSet: 'קוד PIN לא מוגדר',
    newPin: 'PIN חדש (4 ספרות)',
    currentPin: 'PIN נוכחי',
    confirmPin: 'אמת PIN',
    setBtn: 'הגדר PIN',
    changeBtn: 'שנה PIN',
    resetBtn: 'אפס PIN',
    cancel: 'ביטול',
    confirm: 'אישור',
    mismatch: 'PIN לא תואם',
    wrongCurrent: 'PIN נוכחי שגוי',
    success: 'PIN נשמר בהצלחה',
    resetSuccess: 'PIN אופס',
    error: 'שגיאה. נסה שוב.',
    digits: '4 ספרות בלבד',
  },
}

type Mode = 'idle' | 'set' | 'change' | 'reset'

export function KiraPinCard() {
  const { language } = useLanguage()
  const s = I18N[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  const [hasPIN, setHasPIN]         = useState<boolean | null>(null)
  const [mode, setMode]             = useState<Mode>('idle')
  const [pin, setPin]               = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [currentPin, setCurrentPin] = useState(['', '', '', ''])
  const [showPin, setShowPin]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const pinRefs    = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const currentRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    fetch('/api/user/kira-pin').then(r => r.json()).then(d => setHasPIN(d.has_pin))
  }, [])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const reset = () => {
    setMode('idle'); setPin(['','','','']); setConfirmPin(['','','',''])
    setCurrentPin(['','','','']); setFieldError(null); setShowPin(false)
  }

  const handleDigit = (
    arr: string[], setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement | null>[],
    idx: number, val: string
  ) => {
    if (!/^\d?$/.test(val)) return
    const next = [...arr]; next[idx] = val; setArr(next)
    if (val && idx < 3) refs[idx + 1].current?.focus()
  }

  const handleKey = (
    arr: string[], setArr: (v: string[]) => void,
    refs: React.RefObject<HTMLInputElement | null>[],
    idx: number, e: React.KeyboardEvent
  ) => {
    if (e.key === 'Backspace' && !arr[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
      const next = [...arr]; next[idx - 1] = ''; setArr(next)
    }
  }

  const pinValue    = pin.join('')
  const confirmValue = confirmPin.join('')
  const currentValue = currentPin.join('')

  const handleSubmit = async () => {
    setFieldError(null)
    if (pinValue.length !== 4) { setFieldError(s.digits); return }
    if (mode !== 'reset' && pinValue !== confirmValue) { setFieldError(s.mismatch); return }
    if ((mode === 'change' || mode === 'reset') && currentValue.length !== 4) { setFieldError(s.digits); return }

    setLoading(true)
    try {
      if (mode === 'reset') {
        const r = await fetch('/api/user/kira-pin', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_pin: currentValue }),
        })
        const d = await r.json()
        if (!r.ok) { setFieldError(d.error === 'Неверный PIN' ? s.wrongCurrent : d.error); return }
        setHasPIN(false); showToast(s.resetSuccess, true); reset()
      } else {
        const body: any = { pin: pinValue }
        if (mode === 'change') body.current_pin = currentValue
        const r = await fetch('/api/user/kira-pin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const d = await r.json()
        if (!r.ok) { setFieldError(d.error?.includes('текущий') ? s.wrongCurrent : d.error); return }
        setHasPIN(true); showToast(s.success, true); reset()
      }
    } catch { showToast(s.error, false) }
    finally { setLoading(false) }
  }

  const PinDots = ({ arr, setArr, refs, label }: {
    arr: string[]; setArr: (v: string[]) => void
    refs: React.RefObject<HTMLInputElement | null>[]; label: string
  }) => (
    <div className="space-y-2" dir={dir}>
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <div className="flex gap-2 justify-center">
        {arr.map((d, i) => (
          <input key={i} ref={refs[i]} type={showPin ? 'text' : 'password'}
            inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleDigit(arr, setArr, refs, i, e.target.value)}
            onKeyDown={e => handleKey(arr, setArr, refs, i, e)}
            className="w-10 h-12 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all bg-gray-900 text-white"
            style={{ borderColor: d ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.1)', caretColor: 'rgba(130,170,255,0.8)' }}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: '#1e2027', border: '1px solid rgba(255,255,255,0.06)' }} dir={dir}>
      {/* Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.4) 0%, transparent 60%)' }} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 relative">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <Shield className="w-4 h-4" style={{ color: 'rgba(130,170,255,0.9)' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{s.title}</p>
          <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.subtitle}</p>
        </div>
        {/* Status badge */}
        {hasPIN !== null && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={hasPIN
              ? { background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.9)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
            {hasPIN ? `🔒 ${s.pinSet}` : `🔓 ${s.pinNotSet}`}
          </span>
        )}
      </div>

      {/* Form */}
      {mode !== 'idle' && (
        <div className="space-y-4 mt-4 relative">
          {/* Текущий PIN — при смене или сбросе */}
          {(mode === 'change' || mode === 'reset') && (
            <PinDots arr={currentPin} setArr={setCurrentPin} refs={currentRefs} label={s.currentPin} />
          )}

          {/* Новый PIN — при установке или смене */}
          {mode !== 'reset' && (
            <PinDots arr={pin} setArr={setPin} refs={pinRefs} label={s.newPin} />
          )}

          {/* Подтверждение — при установке или смене */}
          {mode !== 'reset' && (
            <PinDots arr={confirmPin} setArr={setConfirmPin} refs={confirmRefs} label={s.confirmPin} />
          )}

          {/* Показать цифры */}
          <button onClick={() => setShowPin(v => !v)}
            className="flex items-center gap-1.5 text-[10px] mx-auto"
            style={{ color: 'rgba(130,170,255,0.5)' }}>
            {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPin ? (language === 'ru' ? 'Скрыть' : 'הסתר') : (language === 'ru' ? 'Показать' : 'הצג')}
          </button>

          {fieldError && <p className="text-[11px] text-center text-red-400">{fieldError}</p>}

          <div className="flex gap-2">
            <button onClick={reset} disabled={loading}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              {s.cancel}
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{ background: mode === 'reset' ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.3)', color: mode === 'reset' ? 'rgba(252,165,165,0.9)' : 'rgba(165,180,252,0.9)' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : s.confirm}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {mode === 'idle' && hasPIN !== null && (
        <div className="flex gap-2 mt-3 relative">
          {!hasPIN ? (
            <button onClick={() => { setMode('set'); setTimeout(() => pinRefs[0].current?.focus(), 50) }}
              className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.9)' }}>
              <Lock className="w-3.5 h-3.5" />{s.setBtn}
            </button>
          ) : (
            <>
              <button onClick={() => { setMode('change'); setTimeout(() => currentRefs[0].current?.focus(), 50) }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.9)' }}>
                <Lock className="w-3.5 h-3.5" />{s.changeBtn}
              </button>
              <button onClick={() => { setMode('reset'); setTimeout(() => currentRefs[0].current?.focus(), 50) }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'rgba(252,165,165,0.7)' }}>
                <Unlock className="w-3.5 h-3.5" />{s.resetBtn}
              </button>
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium animate-in fade-in"
          style={{ background: toast.ok ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                   color: toast.ok ? 'rgba(52,211,153,1)' : 'rgba(252,165,165,1)',
                   border: `1px solid ${toast.ok ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {toast.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
