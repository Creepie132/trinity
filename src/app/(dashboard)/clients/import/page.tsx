'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

const FIELD_OPTIONS = [
  { value: 'first_name', label: 'Имя / First Name' },
  { value: 'last_name', label: 'Фамилия / Last Name' },
  { value: 'phone', label: 'Телефон / Phone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Адрес / Address' },
  { value: 'date_of_birth', label: 'Дата рождения / Date of Birth' },
  { value: 'notes', label: 'Заметки / Notes' },
  { value: 'skip', label: '🚫 Пропустить / Skip' },
]

export default function ImportClientsPage() {
  const router = useRouter()
  const { dir } = useLanguage()
  const { orgId, user } = useAuth()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) processFile(droppedFile)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  async function processFile(selectedFile: File) {
    try {
      setFile(selectedFile)

      const buffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (data.length < 2) {
        toast.error('File is empty or has no data')
        return
      }

      const fileHeaders = data[0].map((h) => String(h))
      const previewRows = data.slice(1, 6) // First 5 rows

      setHeaders(fileHeaders)
      setPreview(previewRows)

      // Auto-map common headers
      const autoMapping: Record<string, string> = {}
      fileHeaders.forEach((header: string) => {
        const lower = header.toLowerCase()
        if (lower.includes('name') || lower.includes('имя') || lower.includes('שם')) {
          if (lower.includes('first') || lower.includes('имя')) {
            autoMapping[header] = 'first_name'
          } else if (lower.includes('last') || lower.includes('фамилия')) {
            autoMapping[header] = 'last_name'
          } else {
            autoMapping[header] = 'first_name'
          }
        } else if (lower.includes('phone') || lower.includes('телефон') || lower.includes('טלפון')) {
          autoMapping[header] = 'phone'
        } else if (lower.includes('email') || lower.includes('почта')) {
          autoMapping[header] = 'email'
        } else if (lower.includes('address') || lower.includes('адрес') || lower.includes('כתובת')) {
          autoMapping[header] = 'address'
        } else if (
          lower.includes('birth') ||
          lower.includes('рожд') ||
          lower.includes('יום הולדת')
        ) {
          autoMapping[header] = 'date_of_birth'
        } else if (lower.includes('note') || lower.includes('заметк') || lower.includes('הערות')) {
          autoMapping[header] = 'notes'
        } else {
          autoMapping[header] = 'skip'
        }
      })

      setMapping(autoMapping)
      toast.success(`File loaded: ${fileHeaders.length} columns, ${data.length - 1} rows`)
    } catch (error) {
      console.error('File processing error:', error)
      toast.error('Failed to read file')
    }
  }

  async function handleImport() {
    if (!file || !orgId) {
      toast.error('Missing file or organization')
      return
    }

    // Validate mapping
    const hasPhone = Object.values(mapping).includes('phone')
    const hasName = Object.values(mapping).includes('first_name')

    if (!hasPhone || !hasName) {
      toast.error('Phone and First Name are required fields')
      return
    }

    setImporting(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))
      formData.append('org_id', orgId)
      if (user?.id) formData.append('user_id', user.id)
      if (user?.email) formData.append('user_email', user.email)

      setProgress(30)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      })

      setProgress(70)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const data = await response.json()
      setProgress(100)
      setResult(data)

      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} clients successfully!`)
      }
      if (data.skipped > 0) {
        toast.warning(`Skipped ${data.skipped} duplicates`)
      }
      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} errors occurred`)
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/clients')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Import Clients / ייבוא לקוחות
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Import from Excel or CSV / ייבא מ-Excel או CSV
          </p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {!file && (
        <Card>
          <CardContent className="p-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Drag & drop your file here / גרור קובץ לכאן
              </h3>
              <p className="text-gray-500 mb-4">or click to browse / או לחץ לבחירה</p>
              <p className="text-sm text-gray-400">Supports: .xlsx, .xls, .csv</p>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview & Mapping */}
      {file && preview.length > 0 && !result && (
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                File Preview: {file.name}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      {headers.map((header, i) => (
                        <th key={i} className="text-left p-2 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b dark:border-gray-800">
                        {headers.map((_, j) => (
                          <td key={j} className="p-2 text-gray-600 dark:text-gray-400">
                            {row[j] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-4">Showing first 5 rows</p>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Map Columns / מיפוי עמודות
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Match each column to a field in the system / התאם כל עמודה לשדה במערכת
              </p>
              <div className="grid gap-4">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-1 font-medium text-sm">{header}</div>
                    <div className="flex-1">
                      <Select
                        value={mapping[header] || 'skip'}
                        onValueChange={(value) =>
                          setMapping({ ...mapping, [header]: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Import Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null)
                setPreview([])
                setHeaders([])
                setMapping({})
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Clients
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {importing && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Import Progress</h3>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-gray-500 mt-2">{progress}%</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Result */}
      {result && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold">Import Complete!</h3>
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {result.imported}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Imported
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {result.skipped}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Skipped (duplicates)
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {result.errors.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Errors</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-6 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Errors:</span>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-left text-sm max-h-48 overflow-y-auto">
                    {result.errors.map((error, i) => (
                      <div key={i} className="text-red-800 dark:text-red-300">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center mt-8">
                <Button variant="outline" onClick={() => router.push('/clients')}>
                  View Clients
                </Button>
                <Button
                  onClick={() => {
                    setFile(null)
                    setPreview([])
                    setHeaders([])
                    setMapping({})
                    setResult(null)
                    setProgress(0)
                  }}
                >
                  Import Another File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
