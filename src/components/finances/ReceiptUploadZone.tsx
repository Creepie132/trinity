'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Camera, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Expense } from '@/hooks/useExpenses'

interface Props {
  onParsed?: (expense: Expense) => void
}

const t = {
  he: { drag: 'גרור קבלה לכאן', or: 'או', browse: 'בחר קובץ', camera: 'צלם קבלה',
        hint: 'JPG, PNG, PDF · עד 10MB · AI יזהה נתונים אוטומטית',
        uploading: 'מעלה...', parsing: 'מנתח עם AI...', done: 'נשמר!' },
  ru: { drag: 'Перетащи квитанцию сюда', or: 'или', browse: 'Выбрать файл', camera: 'Сфотографировать',
        hint: 'JPG, PNG, PDF · до 10MB · AI распознает данные автоматически',
        uploading: 'Загрузка...', parsing: 'AI анализирует...', done: 'Сохранено!' },
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'done' | 'error'

export function ReceiptUploadZone({ onParsed }: Props) {
  const { language } = useLanguage()
  const tx = t[language === 'he' ? 'he' : 'ru']
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const qc = useQueryClient()

  const upload = useCallback(async (file: File) => {
    setState('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      setState('parsing')
      const res = await fetch('/api/expenses/parse', { method: 'POST', body: fd })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Upload failed') }
      const { expense } = await res.json()
      setState('done')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expenses-stats'] })
      toast.success(language === 'he' ? 'קבלה נשמרה בהצלחה!' : 'Квитанция сохранена!')
      onParsed?.(expense)
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      console.error(err)
      setState('error')
      toast.error(language === 'he' ? 'שגיאה בעיבוד הקבלה' : 'Ошибка обработки квитанции')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [language, onParsed, qc])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])


  const busy = state === 'uploading' || state === 'parsing'
  const stateLabel = state === 'uploading' ? tx.uploading : state === 'parsing' ? tx.parsing : state === 'done' ? tx.done : null

  return (
    <div className="px-4 pb-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 select-none',
          isDragging
            ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 scale-[1.01]'
            : state === 'done'
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
            : state === 'error'
            ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
            : 'border-amber-300/50 dark:border-amber-700/30 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20',
          busy && 'cursor-not-allowed opacity-80'
        )}
      >
        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />

        {busy ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{stateLabel}</p>
          </div>
        ) : state === 'done' ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <span className="text-emerald-600 text-lg">✓</span>
            </div>
            <p className="text-sm font-medium text-emerald-600">{tx.done}</p>
          </div>
        ) : (
          <>
            <Upload className="w-7 h-7 text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{tx.drag}</p>
            <p className="text-xs text-gray-400 mb-4">{tx.hint}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-amber-400 transition-all text-gray-600 dark:text-gray-300">
                <FileText className="w-3.5 h-3.5" /> {tx.browse}
              </button>
              <button onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all">
                <Camera className="w-3.5 h-3.5" /> {tx.camera}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
