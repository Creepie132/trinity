'use client'

import { useState } from 'react'

interface SetupFeeModalProps {
  open: boolean
  lang: string
  dealTitle: string
  clientName: string
  onConfirm: (setupFee: number, notes: string) => Promise<void>
  onSkip: () => void
}

const MAX_FEE = 99_999

export function SetupFeeModal({
  open, lang, dealTitle, clientName, onConfirm, onSkip,
}: SetupFeeModalProps) {
  const [fee, setFee]         = useState('')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const isHe = lang === 'he'

  const feeNum      = parseFloat(fee.replace(/,/g, '')) || 0
  const commission  = Math.round(feeNum * 0.3 * 100) / 100
  const isValid     = feeNum > 0 && feeNum <= MAX_FEE

  const fmt = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(feeNum, notes.trim())
      setFee('')
      setNotes('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        dir={isHe ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎉</span>
            <h2 className="text-lg font-bold">
              {isHe ? 'עסקה נסגרה!' : 'Сделка закрыта!'}
            </h2>
          </div>
          <p className="text-emerald-100 text-sm truncate">{clientName} · {dealTitle}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Setup fee input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isHe ? 'עלות הקמה (₪) *' : 'Стоимость подключения (₪) *'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-gray-400 font-semibold text-sm">₪</span>
              <input
                type="number"
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="0"
                min={0}
                max={MAX_FEE}
                step={100}
                className="w-full border-2 border-gray-200 focus:border-emerald-400 rounded-xl ps-8 pe-4 py-3 text-lg font-bold text-gray-900 outline-none transition-colors"
              />
            </div>
            {feeNum > MAX_FEE && (
              <p className="text-xs text-red-500 mt-1">
                {isHe ? `הסכום חורג מהמקסימום (${MAX_FEE.toLocaleString()} ₪)` : `Сумма превышает максимум (${MAX_FEE.toLocaleString()} ₪)`}
              </p>
            )}
          </div>

          {/* Commission preview — live update */}
          <div className={`rounded-xl p-4 border-2 transition-all ${
            isValid
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              {isHe ? 'תחזית עמלה (30%)' : 'Предварительный расчёт комиссии (30%)'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {isHe ? 'עלות הקמה:' : 'Стоимость:'}
              </span>
              <span className="font-bold text-gray-800">{feeNum > 0 ? fmt(feeNum) : '—'}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-gray-600">
                {isHe ? 'העמלה שלי:' : 'Моя комиссия:'}
              </span>
              <span className={`text-xl font-black ${isValid ? 'text-emerald-600' : 'text-gray-400'}`}>
                {isValid ? fmt(commission) : '—'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              {isHe ? 'הערה (אופציונלי)' : 'Примечание (необязательно)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={isHe ? 'פרטים על העסקה...' : 'Детали по сделке...'}
              className="w-full border border-gray-200 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm text-gray-700 resize-none outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onSkip}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-40"
            >
              {isHe ? 'דלג' : 'Пропустить'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span>💰</span>
                  {isHe ? 'שמור עמלה' : 'Сохранить'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
