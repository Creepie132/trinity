'use client'

import { useState, useEffect } from 'react'
import { Phone, MessageCircle, MessageSquare, Pencil, X, Plus, Clock, Calendar, User, Scissors, FileText, History } from 'lucide-react'
import { TrinityBottomDrawer } from '@/components/ui/TrinityBottomDrawer'
import { toast } from 'sonner'
import { useVisitServices, useAddVisitService } from '@/hooks/useVisitServices'
import { AddServiceDialog } from './AddServiceDialog'

interface VisitFlowCardProps {
  visit: any
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  clientName: string
  clientPhone?: string
  serviceName?: string
  onStart: () => void
  onComplete: () => void
  onCancel: () => void
  onEdit: () => void
  onAddService?: (serviceId: string) => void
  lastVisitDate?: string
  onShowHistory?: () => void
}

export function VisitFlowCard(props: VisitFlowCardProps) {
  const {
    visit,
    isOpen,
    onClose,
    locale,
    clientName,
    clientPhone,
    serviceName,
    onStart,
    onComplete,
    onCancel,
    onEdit,
    onAddService,
    lastVisitDate,
    onShowHistory
  } = props

  // State for AddServiceDialog
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false)

  // Fetch visit services
  const { data: visitServices = [] } = useVisitServices(visit?.id || '')
  const addServiceMutation = useAddVisitService(visit?.id || '')

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

  // Handle adding service
  const handleAddService = async (service: any) => {
    await addServiceMutation.mutateAsync({
      visit_id: visit.id,
      service_id: service.id,
      service_name: service.name,
      service_name_ru: service.name_ru,
      price: service.price,
      duration_minutes: service.duration_minutes,
    })
  }

  const content = (
    <div className="space-y-4">
      {/* Информация */}
      <div className="space-y-3">
        <InfoRow
          icon={<User size={16} />}
          label={l ? 'לקוח' : 'Клиент'}
          value={clientName}
        />
        <InfoRow
          icon={<Scissors size={16} />}
          label={l ? 'שירות' : 'Услуга'}
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
                <p className="text-xs text-slate-400 mb-1">{l ? 'שירותים נוספים' : 'Дополнительные услуги'}</p>
                <div className="space-y-1">
                  {visitServices.map((service) => (
                    <div key={service.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-slate-50">
                      <span className="font-medium">
                        {locale === 'ru' ? (service.service_name_ru || service.service_name) : service.service_name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{service.duration_minutes} {l ? 'דק' : 'мин'}</span>
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
          icon={<Clock size={16} />}
          label={l ? 'משך' : 'Длительность'}
          value={totalDuration > 0 ? `${totalDuration} ${l ? 'דק' : 'мин'}` : visit.duration_minutes ? `${visit.duration_minutes} ${l ? 'דק' : 'мин'}` : '—'}
        />
        <InfoRow
          icon={<Clock size={16} />}
          label={l ? 'סיום' : 'Окончание'}
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
          icon={<Calendar size={16} />}
          label={l ? 'מחיר' : 'Цена'}
          value={`₪${visit.price || 0}`}
          bold
        />
        {visit.notes && (
          <InfoRow
            icon={<FileText size={16} />}
            label={l ? 'הערות' : 'Заметки'}
            value={visit.notes}
            multiline
          />
        )}

        {/* Последний визит — кликабельный */}
        {lastVisitDate && (
          <button
            onClick={onShowHistory}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-start"
          >
            <History size={16} className="text-slate-400" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">{l ? 'ביקור אחרון' : 'Последний визит'}</p>
              <p className="text-sm font-medium">{lastVisitDate}</p>
            </div>
            <span className="text-xs text-slate-400">→</span>
          </button>
        )}
      </div>

      {/* Кнопки — Scheduled */}
      {visit.status === 'scheduled' && (
        <div className="space-y-2">
          <button
            onClick={() => {
              onStart()
            }}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold"
          >
            ▶ {l ? 'התחל' : 'Начать'}
          </button>

          <div className="flex gap-2">
            {clientPhone && (
              <>
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-medium"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>

                <button
                  onClick={() => toast.info(l ? 'SMS בקרוב' : 'SMS скоро')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-sm font-medium"
                >
                  <MessageSquare size={16} />
                  SMS
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium"
            >
              <Pencil size={14} className="inline me-1" />
              {l ? 'ערוך' : 'Редактировать'}
            </button>

            <button
              onClick={() => {
                onCancel()
                onClose()
              }}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-red-500 text-sm font-medium"
            >
              ✕ {l ? 'בטל' : 'Отменить'}
            </button>
          </div>
        </div>
      )}

      {/* Кнопки — In Progress */}
      {visit.status === 'in_progress' && (
        <div className="space-y-2">
          <button
            onClick={onComplete}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold"
          >
            ✓ {l ? 'סיים' : 'Завершить'}
          </button>

          <button
            onClick={() => setIsAddServiceDialogOpen(true)}
            className="w-full py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            {l ? 'הוסף שירות' : 'Добавить услугу'}
          </button>

          <button
            onClick={() => {
              onCancel()
              onClose()
            }}
            className="w-full py-3 rounded-2xl bg-slate-100 text-red-500 text-sm font-medium"
          >
            ✕ {l ? 'בטל' : 'Отменить'}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <TrinityBottomDrawer
        isOpen={isOpen}
        onClose={onClose}
        title={clientName || (l ? 'פרטי ביקור' : 'Детали визита')}
      >
        {content}
      </TrinityBottomDrawer>

      <AddServiceDialog
        open={isAddServiceDialogOpen}
        onOpenChange={setIsAddServiceDialogOpen}
        onAddService={handleAddService}
        isPending={addServiceMutation.isPending}
      />
    </>
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
