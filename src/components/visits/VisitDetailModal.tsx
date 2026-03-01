'use client'

import { Phone, MessageCircle, MessageSquare, Pencil, X, Plus, Clock, Calendar, User, Scissors, FileText, History, ArrowLeft, Download } from 'lucide-react'
import { useVisitServices } from '@/hooks/useVisitServices'
import { useModalStore } from '@/store/useModalStore'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

interface VisitDetailModalProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clientName: string
  clientPhone?: string
  clientEmail?: string
  serviceName?: string
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
  onEdit: () => void
  onAddService?: (serviceId: string) => void
  lastVisitDate?: string
  onShowHistory?: () => void
}

interface CareInstruction {
  id: string
  title: string
  title_ru: string
  content: string
  content_ru: string
  file_url?: string
  service_id?: string
  services?: {
    id: string
    name: string
    name_ru: string
  }
}

type ViewMode = 'main' | 'instructions' | 'send-instruction'

export function VisitDetailModal(props: VisitDetailModalProps) {
  const {
    visit,
    isOpen,
    onClose,
    locale,
    clientName,
    clientPhone,
    clientEmail,
    serviceName,
    onStart,
    onComplete,
    onCancel,
    onEdit,
    onAddService,
    lastVisitDate,
    onShowHistory
  } = props

  // Fetch visit services
  const { data: visitServices = [] } = useVisitServices(visit?.id || '')
  const { openModal } = useModalStore()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [instructions, setInstructions] = useState<CareInstruction[]>([])
  const [selectedInstruction, setSelectedInstruction] = useState<CareInstruction | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch instructions when modal opens
  useEffect(() => {
    if (isOpen && viewMode === 'instructions' && instructions.length === 0) {
      fetchInstructions()
    }
  }, [isOpen, viewMode])

  // Reset view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('main')
      setSelectedInstruction(null)
    }
  }, [isOpen])

  const fetchInstructions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/care-instructions')
      const data = await response.json()
      if (data.instructions) {
        setInstructions(data.instructions)
      }
    } catch (error) {
      console.error('Failed to fetch instructions:', error)
      toast.error(locale === 'ru' ? 'Ошибка загрузки инструкций' : 'שגיאה בטעינת הוראות')
    } finally {
      setLoading(false)
    }
  }

  if (!visit || !isOpen) return null

  const l = locale === 'he'
  const date = new Date(visit.scheduled_at)
  
  // Get service name from visit.services JOIN (fallback to prop)
  const displayServiceName = visit.services
    ? (locale === 'ru' ? (visit.services.name_ru || visit.services.name) : visit.services.name)
    : serviceName
  
  // Calculate total duration including all services
  const totalDuration = visitServices.reduce((sum, service) => sum + (service.duration_minutes || 0), 0)
  const endTime = totalDuration > 0
    ? new Date(date.getTime() + totalDuration * 60000)
    : visit.duration_minutes
    ? new Date(date.getTime() + visit.duration_minutes * 60000)
    : null

  // Translations
  const t = {
    he: {
      date: 'תאריך',
      time: 'שעה',
      end: 'סיום',
      duration: 'משך',
      service: 'שירות',
      price: 'מחיר',
      notes: 'הערות',
      client: 'לקוח',
      additionalServices: 'שירותים נוספים',
      lastVisit: 'ביקור אחרון',
      start: 'התחל',
      complete: 'סיים',
      cancel: 'בטל',
      edit: 'ערוך',
      minutes: 'דק',
      scheduled: 'מתוכנן',
      inProgress: 'בתהליך',
      completed: 'הושלם',
      cancelled: 'בוטל',
      downloadReceipt: 'הורד קבלה',
      whatsappReceipt: 'WhatsApp קבלה',
      sms: 'SMS',
      email: 'Email',
      accompanyingDocument: 'מסמך נלווה',
      selectInstruction: 'בחר הוראה',
      sendInstruction: 'שלח הוראה',
      back: 'חזור',
      whatsapp: 'WhatsApp',
      download: 'הורד',
      loadingInstructions: 'טוען הוראות...',
      noInstructions: 'אין הוראות זמינות',
      generalInstruction: 'הוראה כללית'
    },
    ru: {
      date: 'Дата',
      time: 'Время',
      end: 'Окончание',
      duration: 'Длительность',
      service: 'Услуга',
      price: 'Цена',
      notes: 'Заметки',
      client: 'Клиент',
      additionalServices: 'Дополнительные услуги',
      lastVisit: 'Последний визит',
      start: 'Начать',
      complete: 'Завершить',
      cancel: 'Отменить',
      edit: 'Редактировать',
      minutes: 'мин',
      scheduled: 'Запланирован',
      inProgress: 'В процессе',
      completed: 'Завершён',
      cancelled: 'Отменён',
      downloadReceipt: 'Скачать квитанцию',
      whatsappReceipt: 'WhatsApp квитанция',
      sms: 'SMS',
      email: 'Email',
      accompanyingDocument: 'Сопроводительный документ',
      selectInstruction: 'Выберите инструкцию',
      sendInstruction: 'Отправить инструкцию',
      back: 'Назад',
      whatsapp: 'WhatsApp',
      download: 'Скачать',
      loadingInstructions: 'Загрузка инструкций...',
      noInstructions: 'Нет доступных инструкций',
      generalInstruction: 'Общая инструкция'
    },
    en: {
      date: 'Date',
      time: 'Time',
      end: 'End',
      duration: 'Duration',
      service: 'Service',
      price: 'Price',
      notes: 'Notes',
      client: 'Client',
      additionalServices: 'Additional Services',
      lastVisit: 'Last Visit',
      start: 'Start',
      complete: 'Complete',
      cancel: 'Cancel',
      edit: 'Edit',
      minutes: 'min',
      scheduled: 'Scheduled',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      downloadReceipt: 'Download Receipt',
      whatsappReceipt: 'WhatsApp Receipt',
      sms: 'SMS',
      email: 'Email',
      accompanyingDocument: 'Aftercare Document',
      selectInstruction: 'Select Instruction',
      sendInstruction: 'Send Instruction',
      back: 'Back',
      whatsapp: 'WhatsApp',
      download: 'Download',
      loadingInstructions: 'Loading instructions...',
      noInstructions: 'No instructions available',
      generalInstruction: 'General instruction'
    }
  }

  const labels = t[locale] || t.en

  // Get status label
  const getStatusLabel = () => {
    switch (visit.status) {
      case 'scheduled': return labels.scheduled
      case 'in_progress': return labels.inProgress
      case 'completed': return labels.completed
      case 'cancelled': return labels.cancelled
      default: return visit.status
    }
  }

  // Get status color
  const getStatusColor = () => {
    switch (visit.status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700'
      case 'in_progress': return 'bg-amber-100 text-amber-700'
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'cancelled': return 'bg-slate-100 text-slate-500'
      default: return 'bg-slate-100 text-slate-500'
    }
  }

  // Get instruction display data
  const getInstructionTitle = (instruction: CareInstruction) => {
    return locale === 'ru' ? (instruction.title_ru || instruction.title) : instruction.title
  }

  const getInstructionContent = (instruction: CareInstruction) => {
    return locale === 'ru' ? (instruction.content_ru || instruction.content) : instruction.content
  }

  // Download instruction as .txt file
  const downloadInstruction = (instruction: CareInstruction) => {
    const title = getInstructionTitle(instruction)
    const content = getInstructionContent(instruction)
    const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(locale === 'ru' ? 'Файл загружен' : 'הקובץ הורד')
  }

  // Download PDF file
  const downloadPDF = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
      return true
    } catch (error) {
      console.error('Failed to download PDF:', error)
      return false
    }
  }

  // Send instruction via WhatsApp
  const sendViaWhatsApp = async (instruction: CareInstruction) => {
    if (!clientPhone) {
      toast.error(locale === 'ru' ? 'Нет номера телефона' : 'אין מספר טלפון')
      return
    }

    const phone = clientPhone.replace(/[^0-9]/g, '')
    const formattedPhone = phone.startsWith('972') ? phone : `972${phone.replace(/^0/, '')}`

    // Check if instruction is PDF
    if (instruction.file_url) {
      // PDF instruction
      const title = getInstructionTitle(instruction)
      const filename = `${title}.pdf`
      
      // Download PDF automatically
      const downloaded = await downloadPDF(instruction.file_url, filename)
      
      if (downloaded) {
        // Show toast notification
        const toastMessage = locale === 'ru' 
          ? 'PDF скачан. Откройте WhatsApp и прикрепите файл.'
          : locale === 'he'
          ? 'PDF הורד. פתח WhatsApp וצרף את הקובץ.'
          : 'PDF downloaded. Open WhatsApp and attach the file.'
        
        toast.success(toastMessage)
        
        // Open WhatsApp with instruction text
        const message = locale === 'ru'
          ? 'Инструкция готова к отправке. Прикрепи скачанный файл вручную.'
          : locale === 'he'
          ? 'ההוראה מוכנה לשליחה. צרף את הקובץ שהורד באופן ידני.'
          : 'Instruction ready to send. Attach the downloaded file manually.'
        
        window.open(
          `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
          '_blank'
        )
      } else {
        const errorMessage = locale === 'ru'
          ? 'Ошибка скачивания PDF'
          : locale === 'he'
          ? 'שגיאה בהורדת PDF'
          : 'PDF download error'
        
        toast.error(errorMessage)
      }
    } else {
      // Text instruction
      const content = getInstructionContent(instruction)
      window.open(
        `https://wa.me/${formattedPhone}?text=${encodeURIComponent(content)}`,
        '_blank'
      )
    }
  }

  // Send instruction via SMS
  const sendViaSMS = (instruction: CareInstruction) => {
    if (!clientPhone) {
      toast.error(locale === 'ru' ? 'Нет номера телефона' : 'אין מספר טלפון')
      return
    }
    const content = getInstructionContent(instruction)
    window.location.href = `sms:${clientPhone}&body=${encodeURIComponent(content)}`
  }

  // Send instruction via Email
  const sendViaEmail = (instruction: CareInstruction) => {
    const title = getInstructionTitle(instruction)
    const content = getInstructionContent(instruction)
    const subject = locale === 'ru' ? 'Инструкция' : 'הוראה'
    const email = clientEmail || ''
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`
  }

  // Render instruction list view
  const renderInstructionsList = () => (
    <div className="p-6 space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setViewMode('main')}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">{labels.selectInstruction}</h2>
      </div>

      {/* Instructions list */}
      {loading ? (
        <div className="py-8 text-center text-slate-400">
          {labels.loadingInstructions}
        </div>
      ) : instructions.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          {labels.noInstructions}
        </div>
      ) : (
        <div className="space-y-2">
          {instructions.map((instruction) => (
            <button
              key={instruction.id}
              onClick={() => {
                setSelectedInstruction(instruction)
                setViewMode('send-instruction')
              }}
              className="w-full text-start p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition"
            >
              <h3 className="font-semibold text-slate-900">
                {getInstructionTitle(instruction)}
              </h3>
              {instruction.services && (
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'ru' 
                    ? (instruction.services.name_ru || instruction.services.name)
                    : instruction.services.name
                  }
                </p>
              )}
              {!instruction.services && (
                <p className="text-xs text-slate-400 mt-1">
                  {labels.generalInstruction}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // Render send instruction view
  const renderSendInstruction = () => {
    if (!selectedInstruction) return null

    const title = getInstructionTitle(selectedInstruction)

    return (
      <div className="p-6 space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewMode('instructions')
              setSelectedInstruction(null)
            }}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">{labels.sendInstruction}</h2>
        </div>

        {/* Instruction name (subtitle) */}
        <p className="text-sm text-slate-400">{title}</p>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          {/* WhatsApp */}
          <button
            onClick={() => sendViaWhatsApp(selectedInstruction)}
            className="w-full py-3.5 rounded-2xl bg-green-50 text-green-600 text-sm font-semibold hover:bg-green-100 transition flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            💬 {labels.whatsapp}
          </button>

          {/* SMS */}
          <button
            onClick={() => sendViaSMS(selectedInstruction)}
            className="w-full py-3.5 rounded-2xl bg-blue-50 text-blue-600 text-sm font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            📱 {labels.sms}
          </button>

          {/* Email */}
          <button
            onClick={() => sendViaEmail(selectedInstruction)}
            className="w-full py-3.5 rounded-2xl bg-purple-50 text-purple-600 text-sm font-semibold hover:bg-purple-100 transition flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            ✉️ {labels.email}
          </button>

          {/* Download */}
          <button
            onClick={() => downloadInstruction(selectedInstruction)}
            className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <Download size={18} />
            ⬇️ {labels.download}
          </button>
        </div>
      </div>
    )
  }

  // Render main visit detail view
  const renderMainView = () => (
    <div className="p-6 space-y-4">
      {/* Client name */}
      <h2 className="text-2xl font-bold pr-8">{clientName}</h2>

      {/* Status badge */}
      <div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-3">
        <InfoRow
          icon={<Calendar size={16} />}
          label={labels.date}
          value={date.toLocaleDateString(l ? 'he-IL' : 'ru-RU')}
        />
        <InfoRow
          icon={<Clock size={16} />}
          label={labels.time}
          value={date.toLocaleTimeString(l ? 'he-IL' : 'ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        />
        <InfoRow
          icon={<Clock size={16} />}
          label={labels.end}
          value={
            endTime
              ? endTime.toLocaleTimeString(l ? 'he-IL' : 'ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '—'
          }
        />
        <InfoRow
          icon={<Clock size={16} />}
          label={labels.duration}
          value={totalDuration > 0 ? `${totalDuration} ${labels.minutes}` : visit.duration_minutes ? `${visit.duration_minutes} ${labels.minutes}` : '—'}
        />
        <InfoRow
          icon={<Scissors size={16} />}
          label={labels.service}
          value={displayServiceName || '—'}
        />
        
        {/* Display additional services */}
        {visitServices.length > 0 && (
          <div className="px-1">
            <div className="flex items-start gap-3">
              <span className="text-slate-400 mt-0.5">
                <Plus size={16} />
              </span>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">{labels.additionalServices}</p>
                <div className="space-y-1">
                  {visitServices.map((service) => (
                    <div key={service.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-slate-50">
                      <span className="font-medium">
                        {locale === 'ru' ? (service.service_name_ru || service.service_name) : service.service_name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{service.duration_minutes} {labels.minutes}</span>
                        {service.price > 0 && <span className="font-medium text-foreground">₪{service.price}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <InfoRow
          icon={<FileText size={16} />}
          label={labels.price}
          value={`₪${visit.price || 0}`}
          bold
        />
        
        {visit.notes && (
          <InfoRow
            icon={<FileText size={16} />}
            label={labels.notes}
            value={visit.notes}
            multiline
          />
        )}

        {/* Last visit - clickable */}
        {lastVisitDate && (
          <button
            onClick={onShowHistory}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-start"
          >
            <History size={16} className="text-slate-400" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">{labels.lastVisit}</p>
              <p className="text-sm font-medium">{lastVisitDate}</p>
            </div>
            <span className="text-xs text-slate-400">→</span>
          </button>
        )}
      </div>

      {/* Contact buttons */}
      {clientPhone && (
        <div className="flex gap-2">
          <button
            onClick={() => (window.location.href = `tel:${clientPhone}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          >
            <Phone size={16} />
            {l ? 'התקשר' : 'Позвонить'}
          </button>

          <button
            onClick={() => {
              const msg = l
                ? `שלום ${clientName}, תזכורת לביקור ב-${date.toLocaleDateString('he-IL')} בשעה ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`
                : `Здравствуйте ${clientName}, напоминаем о визите ${date.toLocaleDateString('ru-RU')} в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
              window.open(
                `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`,
                '_blank'
              )
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition"
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
        </div>
      )}

      {/* Action buttons - Scheduled */}
      {visit.status === 'scheduled' && (
        <div className="space-y-2">
          <button
            onClick={() => {
              onStart()
            }}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition"
          >
            ▶ {labels.start}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition"
            >
              <Pencil size={14} className="inline me-1" />
              {labels.edit}
            </button>

            <button
              onClick={() => {
                onCancel()
                onClose()
              }}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-red-500 text-sm font-medium hover:bg-slate-200 transition"
            >
              ✕ {labels.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons - In Progress */}
      {visit.status === 'in_progress' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onComplete}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition"
            >
              ✓ {labels.complete}
            </button>
            
            <button
              onClick={() => openModal('add-to-visit', { visitId: visit.id })}
              className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
            >
              <span style={{fontSize: '24px', color: 'white'}}>+</span>
            </button>
          </div>

          <button
            onClick={() => {
              onCancel()
              onClose()
            }}
            className="w-full py-3 rounded-2xl bg-slate-100 text-red-500 text-sm font-medium hover:bg-slate-200 transition"
          >
            ✕ {labels.cancel}
          </button>
        </div>
      )}

      {/* Action buttons - Completed */}
      {visit.status === 'completed' && (
        <div className="space-y-2">
          {/* Download receipt - full width */}
          <button
            onClick={() => {
              toast.success(locale === 'ru' ? 'Квитанция загружается...' : 'מוריד קבלה...')
            }}
            className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
          >
            ⬇️ {labels.downloadReceipt}
          </button>

          {/* WhatsApp / SMS / Email - three in a row */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const receiptText = locale === 'ru'
                  ? `Квитанция: визит ${date.toLocaleDateString('ru-RU')}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
                  : `קבלה: ביקור ${date.toLocaleDateString('he-IL')}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!`
                if (clientPhone) {
                  window.open(
                    `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptText)}`,
                    '_blank'
                  )
                }
              }}
              className="flex-1 py-3 rounded-2xl bg-green-50 text-green-600 text-sm font-medium hover:bg-green-100 transition"
            >
              💬 {labels.whatsappReceipt}
            </button>

            <button
              onClick={() => {
                const receiptText = locale === 'ru'
                  ? `Квитанция: визит ${date.toLocaleDateString('ru-RU')}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
                  : `קבלה: ביקור ${date.toLocaleDateString('he-IL')}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!`
                if (clientPhone) {
                  window.location.href = `sms:${clientPhone}?body=${encodeURIComponent(receiptText)}`
                }
              }}
              className="flex-1 py-3 rounded-2xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition"
            >
              📱 {labels.sms}
            </button>

            <button
              onClick={() => {
                const receiptText = locale === 'ru'
                  ? `Квитанция: визит ${date.toLocaleDateString('ru-RU')}, услуга: ${displayServiceName}, сумма: ₪${visit.price || 0}. Спасибо!`
                  : `קבלה: ביקור ${date.toLocaleDateString('he-IL')}, שירות: ${displayServiceName}, סכום: ₪${visit.price || 0}. תודה!`
                window.location.href = `mailto:?subject=${encodeURIComponent(locale === 'ru' ? 'Квитанция' : 'קבלה')}&body=${encodeURIComponent(receiptText)}`
              }}
              className="flex-1 py-3 rounded-2xl bg-purple-50 text-purple-600 text-sm font-medium hover:bg-purple-100 transition"
            >
              ✉️ {labels.email}
            </button>
          </div>

          {/* Accompanying document - full width, blue border */}
          <button
            onClick={() => setViewMode('instructions')}
            className="w-full py-3.5 rounded-2xl bg-white border-2 border-blue-500 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition"
          >
            📋 {labels.accompanyingDocument}
          </button>
        </div>
      )}

      {/* Action buttons - Cancelled */}
      {visit.status === 'cancelled' && (
        <button
          onClick={onEdit}
          className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
        >
          <Pencil size={16} />
          {labels.edit}
        </button>
      )}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      dir={l ? 'rtl' : 'ltr'}
    >
      <div
        className="relative bg-white rounded-[32px] shadow-xl w-[480px] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        {/* Render different views based on viewMode */}
        {viewMode === 'main' && renderMainView()}
        {viewMode === 'instructions' && renderInstructionsList()}
        {viewMode === 'send-instruction' && renderSendInstruction()}
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  bold,
  multiline
}: {
  icon: React.ReactNode
  label: string
  value: string
  bold?: boolean
  multiline?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-1">
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p
          className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${
            multiline ? 'whitespace-pre-wrap' : ''
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
