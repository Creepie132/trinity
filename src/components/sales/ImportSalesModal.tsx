'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateSale } from '@/hooks/useSales'
import { toast } from 'sonner'

interface Props { isOpen: boolean; onClose: () => void }

const T = {
  he: {
    title: 'ייבוא מאקסל', drop: 'גרור קובץ Excel לכאן', or: 'או',
    browse: 'בחר קובץ', template: 'הורד תבנית',
    cols: 'עמודות נדרשות: שם_מוצר, כמות, מחיר, תאריך (YYYY-MM-DD), שיטת_תשלום',
    preview: 'תצוגה מקדימה', rows: 'שורות', import: 'ייבא', importing: 'מייבא...',
    cancel: 'ביטול', success: 'יובא בהצלחה!', error: 'שגיאה בייבוא',
    parseError: 'לא ניתן לקרוא את הקובץ. ודא שזהו קובץ CSV תקין.',
    noRows: 'לא נמצאו שורות תקינות',
  },
  ru: {
    title: 'Импорт из Excel', drop: 'Перетащите файл Excel сюда', or: 'или',
    browse: 'Выбрать файл', template: 'Скачать шаблон',
    cols: 'Колонки: product_name, quantity, price, date (ГГГГ-ММ-ДД), payment_method',
    preview: 'Предпросмотр', rows: 'строк', import: 'Импортировать', importing: 'Импортируем...',
    cancel: 'Отмена', success: 'Импорт выполнен!', error: 'Ошибка импорта',
    parseError: 'Не удалось прочитать файл. Убедитесь, что это CSV.',
    noRows: 'Не найдено корректных строк',
  },
}

interface Row { product_name: string; quantity: number; price: number; date: string; payment_method: string }

function parseCSV(text: string): Row[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase()
    .replace('שם_מוצר','product_name').replace('כמות','quantity')
    .replace('מחיר','price').replace('תאריך','date').replace('שיטת_תשלום','payment_method'))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: any = {}
    headers.forEach((h, i) => { obj[h] = vals[i] || '' })
    return {
      product_name: obj.product_name || '',
      quantity: Number(obj.quantity) || 1,
      price: Number(obj.price) || 0,
      date: obj.date || new Date().toISOString().slice(0,10),
      payment_method: obj.payment_method || 'cash',
    }
  }).filter(r => r.product_name)
}

function templateCSV(locale: string) {
  if (locale === 'he')
    return 'שם_מוצר,כמות,מחיר,תאריך,שיטת_תשלום\nצבע שיער,1,250,2025-03-01,מזומן\nטיפול,2,180,2025-03-02,כרטיס'
  return 'product_name,quantity,price,date,payment_method\nHair color,1,250,2025-03-01,cash\nTreatment,2,180,2025-03-02,card'
}

export default function ImportSalesModal({ isOpen, onClose }: Props) {
  const { language } = useLanguage()
  const locale = language === 'he' ? 'he' : 'ru'
  const dir    = locale === 'he' ? 'rtl' : 'ltr'
  const t      = T[locale]

  const createSale  = useCreateSale()
  const inputRef    = useRef<HTMLInputElement>(null)
  const [rows, setRows]         = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [parseErr, setParseErr] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone]         = useState(false)

  const reset = () => { setRows([]); setFileName(''); setParseErr(''); setDone(false) }

  const handleFile = (file: File) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const parsed = parseCSV(text)
        if (!parsed.length) { setParseErr(t.noRows); return }
        setRows(parsed); setParseErr('')
      } catch { setParseErr(t.parseError) }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    setImporting(true)
    let ok = 0
    for (const row of rows) {
      try {
        await createSale.mutateAsync({
          items: [{ product_name: row.product_name, quantity: row.quantity, unit_price: row.price }],
          paid_amount: row.price * row.quantity,
          payment_method: row.payment_method,
          sale_date: row.date,
        })
        ok++
      } catch { /* skip bad rows */ }
    }
    setImporting(false)
    if (ok > 0) { toast.success(`${t.success} (${ok})`); setDone(true) }
    else toast.error(t.error)
  }

  const downloadTemplate = () => {
    const csv = templateCSV(locale)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = locale === 'he' ? 'תבנית_מכירות.csv' : 'шаблон_продажи.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  const handleClose = () => { reset(); onClose() }
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div dir={dir} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg
        max-h-[85vh] overflow-y-auto flex flex-col"
        style={{ animation: 'fadeInScale 0.2s ease both' }}>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="px-5 py-5 space-y-4 flex-1">
          {done ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="font-medium text-gray-900 dark:text-gray-100">{t.success}</p>
              <Button onClick={handleClose} className="mt-2 bg-theme-primary text-white hover:opacity-90">OK</Button>
            </div>
          ) : rows.length === 0 ? (
            <>
              {/* drop zone */}
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl
                  p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/50
                  dark:hover:bg-amber-900/10 transition-all group">
                <Upload className="w-8 h-8 text-gray-300 group-hover:text-amber-400 mx-auto mb-3 transition-colors" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t.drop}</p>
                <p className="text-xs text-gray-400">{t.or} <span className="text-amber-500 underline">{t.browse}</span></p>
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>
              {parseErr && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{parseErr}
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">{t.cols}</p>
              <button onClick={downloadTemplate}
                className="text-xs text-amber-600 dark:text-amber-400 underline hover:no-underline transition-all">
                ↓ {t.template}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileSpreadsheet size={14} />
                <span className="font-medium">{fileName}</span>
                <span className="text-gray-400">— {rows.length} {t.rows}</span>
                <button onClick={reset} className="ms-auto text-xs text-gray-400 hover:text-gray-600 underline">{t.cancel}</button>
              </div>
              <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>{['product_name','qty','price','date','method'].map(h => (
                      <th key={h} className="text-start px-3 py-2 text-gray-500 font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.product_name}</td>
                        <td className="px-3 py-2 text-gray-500">{r.quantity}</td>
                        <td className="px-3 py-2 text-gray-500">₪{r.price}</td>
                        <td className="px-3 py-2 text-gray-500">{r.date}</td>
                        <td className="px-3 py-2 text-gray-500">{r.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-2">+{rows.length - 10} more...</p>
                )}
              </div>
            </>
          )}
        </div>

        {!done && rows.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
            <Button variant="outline" onClick={handleClose} className="flex-1 text-sm">{t.cancel}</Button>
            <Button onClick={handleImport} disabled={importing}
              className="flex-1 bg-theme-primary text-white hover:opacity-90 text-sm font-medium">
              {importing ? <><Loader2 size={14} className="animate-spin me-2" />{t.importing}</> : `${t.import} (${rows.length})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
