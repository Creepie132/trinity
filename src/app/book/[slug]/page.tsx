'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Clock, Calendar } from 'lucide-react'

interface Service {
  id: string
  name: string
  name_ru: string | null
  price: number
  duration_minutes: number
  color: string
}

interface BookingSettings {
  enabled: boolean
  advance_days: number
  min_advance_hours: number
  slot_duration: number
  working_hours: Record<number, { start: string; end: string } | null>
  break_time?: { start: string; end: string }
  confirmation_message_he: string
  confirmation_message_ru: string
}

interface OrgData {
  id: string
  name: string
  booking_settings: BookingSettings
  services: Service[]
}

interface Slot {
  time: string
  available: boolean
}

type Language = 'he' | 'ru' | 'en'

const translations: Record<Language, any> = {
  he: {
    title: 'קביעת תור',
    step1: 'בחירת שירות',
    step2: 'בחירת תאריך',
    step3: 'בחירת שעה',
    step4: 'פרטי ליצירת קשר',
    step5: 'אישור',
    next: 'המשך',
    back: 'חזרה',
    confirm: 'אישור תור',
    price: 'מחיר',
    duration: 'משך',
    minutes: 'דקות',
    selectService: 'בחר שירות',
    selectDate: 'בחר תאריך',
    selectTime: 'בחר שעה',
    noSlots: 'אין תורים פנויים ביום זה',
    name: 'שם מלא',
    phone: 'טלפון',
    email: 'אימייל (אופציונלי)',
    notes: 'הערות (אופציונלי)',
    loading: 'טוען...',
    bookingSuccess: 'התור נקבע בהצלחה!',
    bookingError: 'שגיאה בקביעת התור',
    closed: 'סגור',
    monthNames: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    dayNames: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
  },
  ru: {
    title: 'Запись на приём',
    step1: 'Выбор услуги',
    step2: 'Выбор даты',
    step3: 'Выбор времени',
    step4: 'Контактные данные',
    step5: 'Подтверждение',
    next: 'Далее',
    back: 'Назад',
    confirm: 'Подтвердить запись',
    price: 'Цена',
    duration: 'Длительность',
    minutes: 'мин',
    selectService: 'Выберите услугу',
    selectDate: 'Выберите дату',
    selectTime: 'Выберите время',
    noSlots: 'Нет свободных слотов на этот день',
    name: 'Полное имя',
    phone: 'Телефон',
    email: 'Email (опционально)',
    notes: 'Примечания (опционально)',
    loading: 'Загрузка...',
    bookingSuccess: 'Запись успешно создана!',
    bookingError: 'Ошибка при создании записи',
    closed: 'Выходной',
    monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    dayNames: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  },
  en: {
    title: 'Book Appointment',
    step1: 'Select Service',
    step2: 'Select Date',
    step3: 'Select Time',
    step4: 'Contact Details',
    step5: 'Confirmation',
    next: 'Next',
    back: 'Back',
    confirm: 'Confirm Booking',
    price: 'Price',
    duration: 'Duration',
    minutes: 'min',
    selectService: 'Select a service',
    selectDate: 'Select a date',
    selectTime: 'Select time',
    noSlots: 'No available slots for this day',
    name: 'Full name',
    phone: 'Phone',
    email: 'Email (optional)',
    notes: 'Notes (optional)',
    loading: 'Loading...',
    bookingSuccess: 'Booking created successfully!',
    bookingError: 'Error creating booking',
    closed: 'Closed',
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    dayNames: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  }
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // Detect language from browser
  const detectLanguage = (): Language => {
    if (typeof navigator === 'undefined') return 'he'
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('he')) return 'he'
    if (lang.startsWith('ru')) return 'ru'
    return 'en'
  }

  const [language, setLanguage] = useState<Language>('he')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [orgData, setOrgData] = useState<OrgData | null>(null)
  
  // Booking state
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Client data
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Success state
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')

  const t = translations[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  // Load organization data
  useEffect(() => {
    const loadOrg = async () => {
      try {
        const res = await fetch(`/api/booking/${slug}`)
        if (!res.ok) throw new Error('Organization not found')
        const data = await res.json()
        setOrgData(data)
        setLanguage(detectLanguage())
      } catch (error) {
        console.error('Error loading organization:', error)
        alert('Organization not found')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    loadOrg()
  }, [slug, router])

  // Load slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedService) {
      loadSlots()
    }
  }, [selectedDate, selectedService])

  const loadSlots = async () => {
    if (!selectedDate || !selectedService) return
    
    setLoadingSlots(true)
    try {
      const res = await fetch(
        `/api/booking/${slug}/slots?date=${selectedDate}&service_id=${selectedService.id}`
      )
      const data = await res.json()
      setSlots(data.slots || [])
    } catch (error) {
      console.error('Error loading slots:', error)
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedTime(null)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      return
    }

    const scheduledAt = `${selectedDate}T${selectedTime}:00`

    try {
      const res = await fetch(`/api/booking/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          service_name: selectedService.name,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail || null,
          scheduled_at: scheduledAt,
          duration_minutes: selectedService.duration_minutes,
          price: selectedService.price,
          notes: clientNotes || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      setConfirmationMessage(data.confirmation_message)
      setBookingSuccess(true)
      setStep(5)
    } catch (error: any) {
      alert(t.bookingError + ': ' + error.message)
    }
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const days: (number | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const isDateAvailable = (day: number | null): boolean => {
    if (!day || !orgData) return false
    
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const date = new Date(year, month, day)
    
    // Check if in past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return false
    
    // Check if within advance_days
    const maxAdvanceDays = orgData.booking_settings.advance_days || 30
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
    if (date > maxDate) return false
    
    // Check if working day
    const dayOfWeek = date.getDay()
    const workingHours = orgData.booking_settings.working_hours[dayOfWeek]
    return !!workingHours
  }

  const isToday = (day: number | null): boolean => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  const formatDate = (day: number): string => {
    const year = currentMonth.getFullYear()
    const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0')
    const dayStr = day.toString().padStart(2, '0')
    return `${year}-${month}-${dayStr}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">{t.loading}</div>
      </div>
    )
  }

  if (!orgData) {
    return null
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">{orgData.name}</h1>
            {/* Language Switcher */}
            <div className="flex gap-2">
              {(['he', 'ru', 'en'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded ${
                    language === lang
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <p className="text-lg text-gray-600 mt-2">{t.title}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {!bookingSuccess && (
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? 'bg-amber-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>{t.step1}</span>
              <span>{t.step2}</span>
              <span>{t.step3}</span>
              <span>{t.step4}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.selectService}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orgData.services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className={`p-4 rounded-lg border-2 text-right transition-all ${
                    selectedService?.id === service.id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div
                    className="w-1 h-full absolute right-0 top-0 rounded-r-lg"
                    style={{ backgroundColor: service.color || '#F59E0B', width: '4px' }}
                  />
                  <div className="mr-2">
                    <div className="font-semibold text-lg mb-1">
                      {language === 'ru' && service.name_ru ? service.name_ru : service.name}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        {t.price}: ₪{service.price}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {service.duration_minutes} {t.minutes}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedService}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {t.next}
                {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Date */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.selectDate}</h2>
            
            {/* Calendar Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() - 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                <div className="text-lg font-semibold">
                  {t.monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() + 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {t.dayNames.map((day: string, i: number) => (
                  <div key={i} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays().map((day, index) => {
                  const available = isDateAvailable(day)
                  const todayDate = isToday(day)
                  const selected = day && selectedDate === formatDate(day)

                  return (
                    <button
                      key={index}
                      onClick={() => day && available && handleDateSelect(formatDate(day))}
                      disabled={!day || !available}
                      className={`aspect-square p-2 rounded-lg text-center transition-all ${
                        !day
                          ? 'invisible'
                          : selected
                          ? 'bg-amber-500 text-white font-bold'
                          : todayDate
                          ? 'border-2 border-amber-500 bg-white text-gray-900 font-semibold'
                          : available
                          ? 'bg-white border border-gray-300 hover:border-amber-500 text-gray-900'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-2"
              >
                {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {t.next}
                {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.selectTime}</h2>
            
            {loadingSlots ? (
              <div className="text-center py-12 text-gray-600">{t.loading}</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 text-gray-600">{t.noSlots}</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handleTimeSelect(slot.time)}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg text-center font-semibold transition-all ${
                      selectedTime === slot.time
                        ? 'bg-amber-500 text-white'
                        : slot.available
                        ? 'bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-2"
              >
                {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedTime}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {t.next}
                {dir === 'rtl' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Contact Details */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">{t.step4}</h2>
            
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{t.name} *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t.phone} *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="05X-XXX-XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t.email}</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t.notes}</label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold mb-3">{t.step5}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">{t.step1}:</span> {selectedService?.name}</div>
                  <div><span className="font-semibold">{t.step2}:</span> {selectedDate}</div>
                  <div><span className="font-semibold">{t.step3}:</span> {selectedTime}</div>
                  <div><span className="font-semibold">{t.price}:</span> ₪{selectedService?.price}</div>
                  <div><span className="font-semibold">{t.duration}:</span> {selectedService?.duration_minutes} {t.minutes}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-2"
              >
                {dir === 'rtl' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                onClick={handleBooking}
                disabled={!clientName || !clientPhone}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                {t.confirm}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && bookingSuccess && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.bookingSuccess}</h2>
            <p className="text-lg text-gray-600 mb-8">{confirmationMessage}</p>
            
            <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto text-right">
              <div className="space-y-3">
                <div><span className="font-semibold">{t.step1}:</span> {selectedService?.name}</div>
                <div><span className="font-semibold">{t.step2}:</span> {selectedDate}</div>
                <div><span className="font-semibold">{t.step3}:</span> {selectedTime}</div>
                <div><span className="font-semibold">{t.price}:</span> ₪{selectedService?.price}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
